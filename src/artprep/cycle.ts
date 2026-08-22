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
        if (diff < closest.diff) closest = { a, b, diff };
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
  duplicateMax: number = DUPLICATE_POSE_MAX,
  flatMax: number = FLAT_CYCLE_MAX,
): string[] {
  const out: string[] = [];
  for (const r of report) {
    // Une rangée d'une seule pose n'a pas de paire : `widest.diff` vaut 0 sans
    // que rien ne cloche. Le diagnostic ne s'applique qu'à un vrai cycle.
    if (r.closest.a === r.closest.b) continue;
    if (r.closest.diff < duplicateMax) {
      out.push(`rangée ${r.row} : les poses ${r.closest.a} et ${r.closest.b} sont la MÊME image `
        + `(${(r.closest.diff * 100).toFixed(0)} % d'écart aux jambes) — le cycle en compte une de moins qu'annoncé.`);
    }
    if (r.widest.diff < flatMax) {
      out.push(`rangée ${r.row} : aucune alternance d'appui (au mieux ${(r.widest.diff * 100).toFixed(0)} % `
        + `d'écart aux jambes) — la créature glissera au lieu de marcher.`);
    }
  }
  return out;
}
