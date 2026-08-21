// ============================================================
// render/world/facing.ts — Direction de marche d'une unité (ADR-067).
//
// Jusqu'ici le rendu ne connaissait qu'un SENS horizontal : il retournait le
// sprite selon que l'unité allait vers la droite ou la gauche, et ignorait
// complètement les segments verticaux. Sur un sprite de FACE, ça ne se voyait
// pas — une vue frontale reste plausible dans n'importe quelle direction. Sur un
// sprite de PROFIL, la créature descend vers le Bastion en marchant de côté.
//
// PUR : aucune dépendance Phaser, tout est fonction du déplacement.
// ============================================================

/** Direction de marche. « down » = vers le spectateur, « up » = de dos. */
export type Facing = "down" | "up" | "left" | "right";

/**
 * En deçà, le déplacement est trop faible pour trancher : une unité à l'arrêt ou
 * bloquée ne doit pas changer d'orientation à cause du bruit de position.
 */
export const FACING_EPSILON: number = 0.3;

/**
 * Direction déduite d'un déplacement, ou la précédente si rien ne tranche.
 *
 * `allowVertical` dit si la planche PORTE des directions verticales. À faux, un
 * déplacement vertical laisse l'orientation inchangée plutôt que de demander une
 * rangée qui n'existe pas — une créature qui descend garde alors le profil sous
 * lequel elle est arrivée, ce qui est le moins faux des deux.
 */
export function facingFrom(
  dx: number, dy: number, previous: Facing,
  allowVertical: boolean, epsilon: number = FACING_EPSILON,
): Facing {
  const ax: number = Math.abs(dx);
  const ay: number = Math.abs(dy);
  // L'axe DOMINANT décide : en diagonale, une créature regarde là où elle avance
  // le plus. Comparer chaque axe à son propre seuil ferait osciller la direction
  // à chaque frame sur un trajet à 45°.
  if (ax >= ay) return ax > epsilon ? (dx > 0 ? "right" : "left") : previous;
  if (!allowVertical) return previous;
  return ay > epsilon ? (dy > 0 ? "down" : "up") : previous;
}

/** Où trouver la pose : rangée de la planche, et faut-il la retourner. */
export interface FacingCell {
  row: number;
  flip: boolean;
}

/**
 * Rangée à afficher pour une direction donnée.
 *
 * Convention de planche (ADR-067), de haut en bas : **face, profil droit, dos**.
 * La marche vers la GAUCHE n'est pas dessinée — c'est le miroir du profil droit.
 * Le retournement inverse l'équipement (l'arme change de main), et c'est la
 * convention admise depuis toujours pour l'orientation : gagner une direction
 * gratuitement vaut mieux qu'une rangée de plus, qui prendrait des pixels aux
 * autres poses de la même image.
 *
 * Une planche à MOINS de trois rangées se rabat sur ce qu'elle a : c'est ce qui
 * laisse coexister les planches à un seul profil et les planches complètes.
 */
export function facingCell(facing: Facing, directions: number): FacingCell {
  const dirs: number = Math.max(1, directions);
  const profile: number = Math.min(1, dirs - 1);
  switch (facing) {
    case "right": return { row: profile, flip: false };
    case "left": return { row: profile, flip: true };
    case "up": return { row: dirs >= 3 ? 2 : 0, flip: false };
    case "down": return { row: 0, flip: false };
  }
}

/** Index de case dans la planche, rangée par direction puis par pose. */
export function frameIndex(row: number, pose: number, poses: number): number {
  return row * poses + pose;
}
