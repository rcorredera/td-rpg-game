// ============================================================
// render/components/progressFill.ts — Géométrie du remplissage de la jauge
// d'avancement (progress.ts). Module PUR, sans Phaser : la marge verticale se
// mesure sur la planche du pack, pas au jugé, et une mesure se teste.
// ============================================================

export interface SafeInsetsH { left: number; right: number }

export interface ProgressFillBox { ix: number; iy: number; iw: number; ih: number }

/**
 * Part de la hauteur réservée au cerclage, mesurée sur `bar-big-base.png` :
 * la gorge (entre les deux liserés sombres) occupe 31,4 % de la hauteur de
 * la pièce de chaque côté — deux méthodes de mesure indépendantes (bord du
 * liseré sombre ; divergence de couleur depuis le centre de la gorge)
 * convergent sur cette valeur, relevée sur onze colonnes de la pièce du
 * milieu. L'ancienne valeur (22 %, au jugé) laissait le remplissage déborder
 * d'environ 5 unités dans le grain du bois en pied de jauge — visible à
 * l'écran comme un remplissage qui dépasse la gorge sans l'épouser.
 */
export const GORGE_PAD_RATIO: number = 0.314;

/**
 * Pure — rectangle de remplissage à l'intérieur de la gorge de la jauge, en
 * coordonnées relatives au CENTRE de la jauge (repère de `uiProgress`).
 */
export function progressFillBox(w: number, h: number, pct: number, safe: SafeInsetsH): ProgressFillBox {
  const clamped: number = Math.max(0, Math.min(1, pct));
  const padY: number = Math.max(2, Math.round(h * GORGE_PAD_RATIO));
  const iw: number = Math.max(0, w - safe.left - safe.right);
  return {
    ix: -w / 2 + safe.left,
    iy: padY,
    iw: iw * clamped,
    ih: Math.max(0, h - padY * 2),
  };
}
