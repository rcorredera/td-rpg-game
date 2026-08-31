// ============================================================
// artprep/cycle.ts — Le cycle de marche BOUGE-T-IL vraiment ? (ADR-072)
//
// Une planche peut être parfaitement découpée, orientée et détourée, et ne
// contenir aucune marche : le générateur redessine quatre fois la même pose de
// jambes en ne changeant que les bras. Rien dans la chaîne ne le voyait, et
// l'inspection à l'œil ne l'a pas vu non plus — le défaut est passé jusqu'au PO.
//
// Ce que l'œil rate ici, la mesure l'attrape : deux poses dont les jambes se
// recouvrent à 99 % sont la même image, et une rangée dont les poses ne
// diffèrent jamais de plus d'un cinquième n'a pas d'alternance d'appui.
//
// PUR : ne mute rien, ne lit aucun fichier.
// ============================================================

import { type Rgba } from "./image";

/**
 * Part de la hauteur de case occupée par le HAUT du corps, ignorée ici.
 *
 * La marche se lit dans les jambes. Comparer la case entière noierait le signal
 * sous les bras et l'arme, qui bougent même quand les jambes ne bougent pas —
 * c'est précisément la façon dont la planche fautive donnait le change.
 */
export const LEG_TOP_RATIO: number = 0.6;

/**
 * En deçà, deux poses sont la MÊME image.
 *
 * Mesuré : les poses 0 et 2 du profil du gobelin diffèrent de 1 %, celles de sa
 * rangée de face de 5 %. Une planche saine (l'ancienne de l'orc) descend à 12 %
 * entre ses deux appuis, qui sont pourtant les poses les plus proches d'un cycle.
 */
export const DUPLICATE_POSE_MAX: number = 0.08;

/**
 * En deçà, la rangée n'a pas d'alternance d'appui visible.
 *
 * Mesuré sur la meilleure paire de chaque rangée : 66 % pour l'ancienne planche
 * de l'orc, qui marche vraiment ; 22 % pour son remplacement, qui glisse ; 15 à
 * 26 % pour le gobelin. Le seuil sépare les deux familles sans les frôler.
 */
export const FLAT_CYCLE_MAX: number = 0.4;

/**
 * Même seuil, pour une rangée vue de FACE ou de DOS.
 *
 * Bien plus bas, et ce n'est pas une indulgence : vues de face, les jambes se
 * déplacent en PROFONDEUR, et leur mouvement ne change presque pas la
 * silhouette. Seuls le raccourci et l'ombre le portent.
 *
 * Mesuré sur le gabarit de référence (ADR-073), dont le cycle est correct par
 * construction : 23 % de face et 24 % de dos, contre plus de 40 % de profil.
 * Appliquer le seuil du profil aux vues frontales revenait à exiger l'impossible
 * — l'outil refusait sa propre référence.
 */
export const FLAT_FRONTAL_MAX: number = 0.18;

/**
 * Rangée du PROFIL dans une planche : la deuxième, ou l'unique s'il n'y en a
 * qu'une (même convention que `facingCell`, ADR-067).
 *
 * Ce défaut vaut pour une planche entière. Quand les rangées sont générées
 * SÉPARÉMENT (ADR-074), il devient faux une fois sur trois : une rangée de face
 * livrée seule est alors jugée au seuil du profil. Mesuré sur le gabarit, dont
 * la justesse ne dépend d'aucun jugement : sa rangée de face passe dans la
 * planche à trois rangées et se fait REFUSER à 28 % quand on la traite seule.
 * D'où `viewsOf`, qui laisse l'appelant dire ce qu'il traite.
 */
export function profileRow(rows: number): number {
  return rows >= 2 ? 1 : 0;
}

/** Ce qu'une rangée montre, du seul point de vue du seuil à lui appliquer. */
export type RowView = "profile" | "frontal";

/**
 * Vues d'une planche, dans l'ordre des rangées.
 *
 * `declared` vient de l'opérateur : une lettre par rangée, `s` pour le profil,
 * autre chose pour une vue frontale. Absent, on retombe sur la convention de
 * planche entière — correcte à trois rangées, arbitraire à une seule, et c'est
 * précisément pour cela qu'on peut la contredire.
 */
export function viewsOf(rows: number, declared?: readonly RowView[]): RowView[] {
  if (declared !== undefined && declared.length === rows) return [...declared];
  const profile: number = profileRow(rows);
  return Array.from({ length: rows }, (_, r) => (r === profile ? "profile" : "frontal"));
}

/** Écart entre deux poses d'une même rangée, ramené à leur encre commune. */
export interface PosePair {
  a: number;
  b: number;
  /** Part de pixels dont l'opacité diffère, dans la zone des jambes. 0 à 1. */
  diff: number;
}

/** Diagnostic d'une rangée : sa paire la plus proche et la plus éloignée. */
export interface RowCycle {
  row: number;
  /** Paire la plus RESSEMBLANTE — sous le seuil, c'est un doublon. */
  closest: PosePair;
  /** Paire la plus DIFFÉRENTE — sous le seuil, la rangée ne marche pas. */
  widest: PosePair;
}

/**
 * Part de pixels dont l'opacité diffère entre deux cases, jambes seulement.
 *
 * Rapportée à l'encre de l'UNION plutôt qu'à la surface de la case : une case
 * est surtout du vide, et diviser par sa surface écraserait toutes les mesures
 * vers zéro sans rien séparer.
 */
export function legDissimilarity(
  sheet: Rgba, cellW: number, a: number, b: number, legTopRatio: number = LEG_TOP_RATIO,
): number {
  const top: number = Math.floor(sheet.height * legTopRatio);
  let diff: number = 0;
  let ink: number = 0;
  for (let y: number = top; y < sheet.height; y++) {
    for (let x: number = 0; x < cellW; x++) {
      const pa: boolean = sheet.data[(y * sheet.width + a * cellW + x) * 4 + 3] !== 0;
      const pb: boolean = sheet.data[(y * sheet.width + b * cellW + x) * 4 + 3] !== 0;
      if (pa || pb) ink++;
      if (pa !== pb) diff++;
    }
  }
  return ink === 0 ? 0 : diff / ink;
}

/** Diagnostic de chaque rangée d'une planche rangée direction-major. */
export function cycleReport(
  sheet: Rgba, cellW: number, rows: number, poses: number, legTopRatio: number = LEG_TOP_RATIO,
): RowCycle[] {
  const out: RowCycle[] = [];
  for (let r: number = 0; r < rows; r++) {
    let closest: PosePair = { a: 0, b: 0, diff: 1 };
    let widest: PosePair = { a: 0, b: 0, diff: 0 };
    for (let a: number = 0; a < poses; a++) {
      for (let b: number = a + 1; b < poses; b++) {
        const diff: number = legDissimilarity(sheet, cellW, r * poses + a, r * poses + b, legTopRatio);
        // La paire la plus ressemblante ne se cherche que parmi les poses
        // VOISINES dans le cycle, bouclage compris. Vu de profil, les deux poses
        // de CONTACT d'une marche saine ont la même silhouette au pixel près —
        // seules l'occlusion et l'ombre disent quelle jambe est devant. Les
        // comparer entre elles ferait déclarer « doublon » tout cycle correct,
        // et le gabarit de référence a été le premier à le prouver (ADR-073).
        const adjacent: boolean = b - a === 1 || (a === 0 && b === poses - 1);
        if (adjacent && diff < closest.diff) closest = { a, b, diff };
        if (diff > widest.diff) widest = { a, b, diff };
      }
    }
    out.push({ row: r, closest, widest });
  }
  return out;
}

/**
 * Phrases d'avertissement pour les rangées fautives. Vide si tout va bien.
 *
 * Rendues plutôt qu'imprimées : la décision d'écrire sur la sortie standard
 * appartient au CLI, seul point du dossier autorisé à le faire.
 */
export function cycleWarnings(
  report: readonly RowCycle[],
  views?: readonly RowView[],
  duplicateMax: number = DUPLICATE_POSE_MAX,
  flatMax: number = FLAT_CYCLE_MAX,
  frontalMax: number = FLAT_FRONTAL_MAX,
): string[] {
  const out: string[] = [];
  const rowViews: RowView[] = viewsOf(report.length, views);
  for (const r of report) {
    const limit: number = rowViews[r.row] === "profile" ? flatMax : frontalMax;
    // Une rangée d'une seule pose n'a pas de paire : `widest.diff` vaut 0 sans
    // que rien ne cloche. Le diagnostic ne s'applique qu'à un vrai cycle.
    if (r.closest.a === r.closest.b) continue;
    if (r.closest.diff < duplicateMax) {
      out.push(`rangée ${r.row} : les poses ${r.closest.a} et ${r.closest.b} sont la MÊME image `
        + `(${(r.closest.diff * 100).toFixed(0)} % d'écart aux jambes) — le cycle en compte une de moins qu'annoncé.`);
    }
    if (r.widest.diff < limit) {
      out.push(`rangée ${r.row} : aucune alternance d'appui (au mieux ${(r.widest.diff * 100).toFixed(0)} % `
        + `d'écart aux jambes) — la créature glissera au lieu de marcher.`);
    }
  }
  return out;
}
