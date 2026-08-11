// ============================================================
// render/projectiles.ts — Registre des projectiles par type de tour (ADR-016).
//
// Toutes les tours tiraient le même trait droit de 90 ms, seule la couleur
// changeant. Or le projectile est le principal signal de ce que fait une tour :
// une flèche rapide et rectiligne, un rocher lourd en cloche et un éclat de
// givre ne racontent pas la même chose.
//
// Registre pur (aucun Phaser) : même rôle que sprites.ts pour les corps —
// point de swap unique, et extension naturelle quand les tours gagneront des
// variantes par niveau ou spécialisation.
// ============================================================

import { KEEP, SIGNAL } from "./palette";

export type ProjectileKind = "arrow" | "boulder" | "shard";

export interface ProjectileStyle {
  kind: ProjectileKind;
  color: number;
  /** Demi-longueur (flèche) ou rayon (rocher, éclat), en unités logiques. */
  size: number;
  /** Durée de vol en ms : lisibilité avant réalisme. */
  flightMs: number;
  /** Hauteur de la cloche, en unités logiques. 0 = trajectoire tendue. */
  arc: number;
  /** Traînée laissée derrière le projectile (0 = aucune). */
  trail: number;
  /** Rotation du projectile sur lui-même pendant le vol. */
  spin: boolean;
}

const STYLES: Record<string, ProjectileStyle> = {
  tower_archer: { kind: "arrow", color: 0xf0e6d2, size: 9, flightMs: 130, arc: 0, trail: 10, spin: false },
  tower_catapult: { kind: "boulder", color: KEEP.stoneDark, size: 6, flightMs: 420, arc: 58, trail: 0, spin: true },
  tower_frost: { kind: "shard", color: SIGNAL.slow, size: 5, flightMs: 200, arc: 12, trail: 14, spin: true },
};

/** Style par défaut : une tour sans entrée reste visible plutôt qu'invisible. */
const FALLBACK: ProjectileStyle = {
  kind: "arrow", color: 0xf0e6d2, size: 8, flightMs: 150, arc: 0, trail: 8, spin: false,
};

export function projectileFor(towerDefId: string): ProjectileStyle {
  return STYLES[towerDefId] ?? FALLBACK;
}

/** Position d'un projectile à l'instant `t` (0→1), cloche comprise.
 *  Pure : testée sans Phaser. */
export function projectilePoint(
  from: { x: number; y: number }, to: { x: number; y: number }, t: number, arc: number,
): { x: number; y: number } {
  const k = Math.min(1, Math.max(0, t));
  // Parabole : nulle aux extrémités, maximale au milieu — le projectile part et
  // retombe exactement sur la cible, quel que soit l'arc.
  const lift = arc * 4 * k * (1 - k);
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k - lift,
  };
}
