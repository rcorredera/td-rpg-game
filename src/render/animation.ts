// ============================================================
// render/animation.ts — Animation PROCÉDURALE des unités (ADR-017).
//
// Les sprites sont statiques : plutôt qu'une planche d'animation par créature
// (coûteuse à dessiner et à maintenir), le mouvement est calculé sur la
// transform — squash/stretch, inclinaison, battement. C'est la technique qui
// donne le plus de vie par unité de travail, et elle marche pour tout sprite.
//
// PURE : aucune dépendance Phaser, tout est fonction du temps. Testable, et
// surtout jamais dans la sim (ADR-001) — l'animation ne change aucun état.
// ============================================================

export interface UnitPose {
  /** Décalage vertical (négatif = vers le haut). */
  dy: number;
  /** Inclinaison en radians. */
  tilt: number;
  /** Facteurs d'échelle : le squash conserve grossièrement le volume. */
  scaleX: number;
  scaleY: number;
}

const STILL: UnitPose = { dy: 0, tilt: 0, scaleX: 1, scaleY: 1 };

/**
 * Cycle de marche : le poids passe d'un appui à l'autre. Le corps monte et
 * redescend deux fois par cycle (un rebond par pas), s'écrase à l'appui et
 * s'incline légèrement à l'opposé — c'est l'écrasement qui fait « lourd ».
 *
 * `phase` désynchronise les unités entre elles (sinon toute une horde marche au
 * pas, effet très artificiel). `weight` module l'amplitude : une brute rebondit
 * peu et s'écrase beaucoup, un gobelin fait l'inverse.
 */
export function walkPose(timeMs: number, phase: number, speed: number, weight: number): UnitPose {
  const cycle: number = 620 / Math.max(0.35, speed);        // plus rapide = pas plus courts
  const t: number = ((timeMs / cycle) + phase) % 1;
  const step: number = Math.sin(t * Math.PI * 2 * 2);        // deux appuis par cycle
  const bounce: number = Math.abs(Math.sin(t * Math.PI * 2)); // hauteur du rebond

  const light: number = 1 - Math.min(1, weight);
  // Le rebond a DEUX appuis par cycle, donc une période de 0,5 : deux unités
  // déphasées d'exactement 0,5 auraient une pose identique. Un balancement lent
  // 1-périodique s'y ajoute pour que chaque phase donne un mouvement unique.
  const sway: number = Math.sin(t * Math.PI * 2);
  const lift: number = -(2 + 2.6 * light) * bounce - sway * 0.6;
  const squash: number = 1 - 0.06 * weight * bounce;
  return {
    dy: lift,
    tilt: step * 0.05 * (0.4 + light) + sway * 0.012,
    scaleX: 1 / squash,
    scaleY: squash,
  };
}

/**
 * Vol : flottement ample et lent, plus un battement d'ailes rapide rendu par une
 * compression horizontale (les ailes vues de face se referment). Le battement
 * est volontairement plus rapide que le flottement — c'est ce décalage de rythme
 * qui distingue immédiatement un volant d'un marcheur.
 */
export function flyPose(timeMs: number, phase: number): UnitPose {
  const float: number = Math.sin(timeMs / 420 + phase * 6.3);
  const flap: number = Math.sin(timeMs / 95 + phase * 6.3);
  return {
    dy: float * 4.5 - 2,
    tilt: float * 0.07,
    scaleX: 1 - 0.16 * Math.abs(flap),
    scaleY: 1 + 0.06 * Math.abs(flap),
  };
}

/** Pose d'une unité immobile — bloquée au contact, ou à l'arrêt. */
export function idlePose(timeMs: number, phase: number): UnitPose {
  const breath: number = Math.sin(timeMs / 700 + phase * 6.3);
  return { dy: breath * 0.8, tilt: 0, scaleX: 1 - 0.012 * breath, scaleY: 1 + 0.012 * breath };
}

export { STILL };
