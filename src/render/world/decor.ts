// ============================================================
// render/world/decor.ts — Semis de props sur le champ de bataille (ADR-062).
//
// Le sol est généré (`assets/terrain.ts`) : nuances, touffes et grain, mais
// aucun OBJET. Résultat, un aplat dont la répétition se voit sur les grandes
// surfaces, et sur lequel les sprites peints paraissent collés. Des rochers et
// des buissons cassent cette régularité sans toucher au générateur.
//
// PUR : aucune dépendance Phaser ni DOM. C'est le placement qui peut se
// tromper — poser un buisson sur la route ou sur un emplacement de tour — donc
// c'est le placement qui est testé.
//
// DÉTERMINISTE, comme le sol (pas de `Math.random`) : deux lancements du même
// chapitre donnent le même décor. Un décor qui saute d'une partie à l'autre se
// remarque, et une capture de référence cesserait d'être comparable.
// ============================================================

import type { Vec2 } from "../../core/types";
import { distanceToSegment } from "./path";

/** Famille de prop. La forme dit la matière, comme les motifs de biome. */
export type PropKind = "rock" | "bush";

/** Un prop posé : où, lequel, à quelle taille, retourné ou non. */
export interface DecorProp {
  kind: PropKind;
  /** Index de variante dans la famille (0-based). */
  variant: number;
  x: number;
  y: number;
  /** Côté d'affichage en unités logiques. */
  size: number;
  /** Miroir horizontal : double le nombre de silhouettes perçues pour 0 asset. */
  flip: boolean;
}

/** Zone interdite : rien ne doit s'y poser. */
export interface Keepout {
  /** Segments à éviter (routes). Chaque entrée est une polyligne. */
  polylines: readonly (readonly Vec2[])[];
  /** Points à éviter (emplacements de tour, Bastion). */
  points: readonly Vec2[];
  /** Dégagement autour des polylignes, du centre du prop. */
  polylineClearance: number;
  /** Dégagement autour des points, du centre du prop. */
  pointClearance: number;
}

export interface DecorRequest {
  width: number;
  height: number;
  keepout: Keepout;
  /** Nombre de props VISÉ. Le rendu peut en poser moins : une carte très
   *  encombrée n'a pas la place, et forcer le compte les entasserait. */
  count: number;
  /** Part de buissons dans le mélange, 0..1. Le reste est en rochers — une
   *  lande de cendre ou de givre n'a pas de verdure. */
  bushShare: number;
  /** Variantes disponibles par famille. */
  variants: Readonly<Record<PropKind, number>>;
  /** Décale tout le semis : deux chapitres du même biome ne se ressemblent pas. */
  seed: number;
}

/** Bruit déterministe 0..1, même principe que `assets/terrain.ts`. */
function noise(x: number, y: number): number {
  const n: number = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Marge au bord du champ : un prop à cheval sur le liseré est coupé net. */
const EDGE_MARGIN: number = 26;

/** Bornes de taille par famille, en unités logiques. Un rocher reste plus bas
 *  qu'un buisson, sinon les deux se confondent une fois reteints à la même
 *  gamme de couleurs. */
const SIZE: Readonly<Record<PropKind, readonly [number, number]>> = {
  rock: [22, 34],
  bush: [34, 50],
};

/** Un point est-il libre de toute zone interdite ? */
export function isFree(p: Vec2, keepout: Keepout): boolean {
  for (const q of keepout.points) {
    if (Math.hypot(p.x - q.x, p.y - q.y) < keepout.pointClearance) return false;
  }
  for (const line of keepout.polylines) {
    for (let i: number = 1; i < line.length; i++) {
      if (distanceToSegment(p, line[i - 1]!, line[i]!) < keepout.polylineClearance) return false;
    }
  }
  return true;
}

/**
 * Sème les props sur une GRILLE JITTERÉE plutôt qu'au hasard pur : un tirage
 * uniforme laisse des amas et des vides francs, qui se lisent comme une
 * intention alors que ce n'est que du bruit. Une case par prop, position tirée
 * à l'intérieur de la case, donne une répartition régulière sans alignement
 * visible.
 *
 * Les cases dont le point tombe en zone interdite sont simplement SAUTÉES : on
 * ne cherche pas un repli à côté, qui collerait le prop au bord de la route.
 * Le compte rendu est donc au plus `count`, souvent moins sur une carte chargée.
 */
export function planDecor(req: DecorRequest): DecorProp[] {
  if (req.count <= 0) return [];
  const usableW: number = req.width - EDGE_MARGIN * 2;
  const usableH: number = req.height - EDGE_MARGIN * 2;
  if (usableW <= 0 || usableH <= 0) return [];

  // Grille aussi carrée que possible pour le nombre visé : des cases très
  // allongées produiraient des rangées perceptibles.
  const cols: number = Math.max(1, Math.round(Math.sqrt(req.count * usableW / usableH)));
  const rows: number = Math.max(1, Math.ceil(req.count / cols));
  const cellW: number = usableW / cols;
  const cellH: number = usableH / rows;

  const out: DecorProp[] = [];
  for (let row: number = 0; row < rows; row++) {
    for (let col: number = 0; col < cols; col++) {
      if (out.length >= req.count) return out;
      const s: number = req.seed;
      const jx: number = noise(col + s * 7.3, row + 1.7);
      const jy: number = noise(col + 3.1, row + s * 5.9);
      const p: Vec2 = {
        x: EDGE_MARGIN + col * cellW + jx * cellW,
        y: EDGE_MARGIN + row * cellH + jy * cellH,
      };
      if (!isFree(p, req.keepout)) continue;

      const kindRoll: number = noise(col + s * 2.2, row + 11.3);
      const kind: PropKind = kindRoll < req.bushShare ? "bush" : "rock";
      const available: number = Math.max(1, req.variants[kind]);
      const variant: number = Math.min(available - 1, Math.floor(noise(col + 13.7, row + s * 1.9) * available));
      const [lo, hi] = SIZE[kind];
      out.push({
        kind,
        variant,
        x: Math.round(p.x),
        y: Math.round(p.y),
        size: Math.round(lo + noise(col + 5.5, row + 17.1) * (hi - lo)),
        flip: noise(col + 19.3, row + 23.9) > 0.5,
      });
    }
  }
  return out;
}

/**
 * Graine dérivée de l'IDENTIFIANT du chapitre, pas de son rang.
 *
 * Deux chapitres du même biome doivent avoir un semis différent, sinon ils se
 * ressemblent — c'est précisément ce que corrigeait ADR-023 pour le sol. Passer
 * par l'id plutôt que par la position dans la liste rend le décor insensible à
 * un réordonnancement ou à une insertion de chapitre : le ch.7 garde son décor
 * même si un chapitre s'ajoute avant lui.
 */
export function seedFrom(id: string): number {
  let h: number = 2166136261;
  for (let i: number = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 4096;
}

/** Couleurs sombre et claire d'un prop, à passer à `remapBufferByLuma`. */
export interface DecorRamp {
  dark: readonly [number, number, number];
  light: readonly [number, number, number];
}

/**
 * Gamme de reteinte d'un prop, DÉRIVÉE du sol du biome.
 *
 * Les props viennent du pack Tiny Swords, en vert-bleu vif : posés tels quels
 * sur les cendres, le givre ou la terre gâtée, ils jureraient franchement. Les
 * dériver du sol leur donne l'appartenance au lieu — un rocher de toundra est
 * gris-bleu, le même sur terre gâtée vire au brun — et surtout tout NOUVEAU
 * biome hérite d'un décor cohérent sans réglage supplémentaire.
 *
 * Le prop est plus SOMBRE que son sol, jamais plus clair : c'est ce qui le fait
 * lire comme un objet posé dessus et non comme une tache de lumière, et ça le
 * garde en retrait des unités (règle de palette, ADR-014).
 */
export function decorRamp(ground: number): DecorRamp {
  const r: number = (ground >> 16) & 0xff;
  const g: number = (ground >> 8) & 0xff;
  const b: number = ground & 0xff;
  const scale = (c: number, k: number): number => Math.max(0, Math.min(255, Math.round(c * k)));
  return {
    dark: [scale(r, 0.42), scale(g, 0.42), scale(b, 0.42)],
    light: [scale(r, 0.92), scale(g, 0.92), scale(b, 0.92)],
  };
}
