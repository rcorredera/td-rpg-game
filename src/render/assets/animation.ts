// ============================================================
// render/assets/animation.ts — Animation PROCÉDURALE des unités (ADR-017/064).
//
// Les sprites sont STATIQUES : plutôt qu'une planche d'animation par créature,
// le mouvement est calculé sur la transform. Ce n'est pas qu'une économie de
// dessin — les sprites sont générés (ADR-061), et un générateur ne redessine pas
// LE MÊME personnage dans une autre pose : couleurs, proportions et détails
// dérivent d'une image à l'autre. Un cycle de quatre frames donnerait quatre
// créatures légèrement différentes qui clignotent.
//
// PRINCIPE (ADR-064) : LES PIEDS RESTENT AU SOL, C'EST LE CORPS QUI TRAVAILLE.
// La première version translatait le sprite entier de quelques pixels vers le
// haut — les pieds décollaient, et la créature paraissait sautiller sur place au
// lieu de marcher. Le mouvement vertical vient désormais de l'ÉCRASEMENT, qui se
// fait autour du point d'appui : le sommet du corps monte et descend, la base ne
// bouge pas. Le rendu ancre donc le sprite par ses pieds (`setOrigin(0.5, 1)`),
// ce qui fait aussi pivoter l'inclinaison au sol plutôt qu'à la taille.
//
// PURE : aucune dépendance Phaser, tout est fonction du temps. Testable, et
// surtout jamais dans la sim (ADR-001) — l'animation ne change aucun état.
// ============================================================

export interface UnitPose {
  /**
   * Décalage latéral : le poids passe d'un appui sur l'autre. C'est ce
   * balancement, et non le rebond, qui fait lire une DÉMARCHE — un corps qui
   * monte et descend sans jamais se déporter saute, il ne marche pas.
   */
  dx: number;
  /** Décalage vertical (négatif = vers le haut). Volontairement faible sur un
   *  marcheur : au-delà de deux pixels, les pieds décollent. */
  dy: number;
  /** Inclinaison en radians, appliquée autour des PIEDS. */
  tilt: number;
  /** Facteurs d'échelle : le squash conserve grossièrement le volume. */
  scaleX: number;
  scaleY: number;
}

const STILL: UnitPose = { dx: 0, dy: 0, tilt: 0, scaleX: 1, scaleY: 1 };

/**
 * Plafond du déplacement vertical d'un MARCHEUR, en unités logiques.
 *
 * Ce n'est pas un réglage esthétique mais la limite au-delà de laquelle l'illusion
 * casse : un sprite qui montre ses deux pieds posés ne peut pas s'élever sans que
 * l'œil voie qu'il flotte. Les volants ne sont pas concernés.
 */
export const WALK_LIFT_MAX: number = 2;

/**
 * Cycle de marche. Un cycle complet = DEUX pas.
 *
 * `phase` désynchronise les unités entre elles (sinon toute une horde marche au
 * pas, effet très artificiel). `weight` module le caractère : une brute
 * s'écrase et roule des épaules, un gobelin reste léger et vif.
 */
export function walkPose(timeMs: number, phase: number, speed: number, weight: number): UnitPose {
  const cycle: number = 620 / Math.max(0.35, speed);        // plus rapide = pas plus courts
  const t: number = ((timeMs / cycle) + phase) % 1;
  /** Progression DANS le pas courant : deux fois par cycle. */
  const step: number = (t * 2) % 1;
  /** 1 au contact du pied, 0 en milieu d'appui — c'est au contact qu'on s'écrase. */
  const contact: number = (1 + Math.cos(step * Math.PI * 2)) / 2;
  /** Quel appui porte : +1 l'un, -1 l'autre. UNE fois par cycle, ce qui distingue
   *  les deux pas — sans lui, deux unités déphasées d'exactement 0,5 auraient la
   *  même pose, et le déphasage ne servirait à rien. */
  const roll: number = Math.sin(t * Math.PI * 2);

  const heavy: number = Math.min(1, Math.max(0, weight));
  const light: number = 1 - heavy;

  // L'écrasement porte tout le mouvement vertical. Amplitude nettement plus
  // franche qu'avant (jusqu'à 12 % contre 6 %) : c'est lui qu'on voit, et il ne
  // décolle pas les pieds puisqu'il se fait autour d'eux.
  const squash: number = 1 - (0.035 + 0.085 * heavy) * contact;

  return {
    // Le lourd roule des épaules, le léger trottine sans se déporter.
    dx: roll * (1 + 2 * heavy),
    // Un reste de rebond, réservé aux légers, plus une dissymétrie d'un pas à
    // l'autre — aucune démarche n'est parfaitement régulière.
    dy: -light * 1.3 * (1 - contact) - roll * 0.4,
    // Penche du côté de l'appui. Les créatures légères s'inclinent plus : c'est
    // leur vivacité, là où la masse d'une brute la garde droite.
    tilt: -roll * (0.025 + 0.045 * light),
    scaleX: 1 / squash,
    scaleY: squash,
  };
}

/**
 * Vol : flottement ample et lent, plus un battement d'ailes rapide rendu par une
 * compression horizontale (les ailes vues de face se referment). Le battement
 * est volontairement plus rapide que le flottement — c'est ce décalage de rythme
 * qui distingue immédiatement un volant d'un marcheur.
 *
 * Seul cas où `dy` est ample : un volant n'a pas d'appui au sol à trahir.
 */
export function flyPose(timeMs: number, phase: number): UnitPose {
  const float: number = Math.sin(timeMs / 420 + phase * 6.3);
  const flap: number = Math.sin(timeMs / 95 + phase * 6.3);
  return {
    dx: 0,
    dy: float * 4.5 - 2,
    tilt: float * 0.07,
    scaleX: 1 - 0.16 * Math.abs(flap),
    scaleY: 1 + 0.06 * Math.abs(flap),
  };
}

/**
 * Pose d'une unité immobile — bloquée au contact, ou à l'arrêt.
 *
 * La respiration passe elle aussi par l'écrasement plutôt que par un décalage :
 * une unité qui monte et descend sur place à l'arrêt flotte, exactement comme le
 * marcheur d'avant.
 */
export function idlePose(timeMs: number, phase: number): UnitPose {
  const breath: number = Math.sin(timeMs / 700 + phase * 6.3);
  return {
    dx: 0,
    dy: 0,
    tilt: 0,
    scaleX: 1 - 0.012 * breath,
    scaleY: 1 + 0.012 * breath,
  };
}

export { STILL };
