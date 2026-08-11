// ============================================================
// render/EntityLayer.ts — Rendu retained-mode : un Phaser.Sprite persistant
// par entité sim, synchronisé chaque frame (diff par clé). Remplace les
// boucles immediate-mode de GameScene.draw() (un g.clear() + tout redessiné).
//
// Ne lit que l'état sim, ne le mute jamais (ADR-001). Les anims/bobs restent
// pilotés par l'horloge murale via le callback place().
// ============================================================

import Phaser from "phaser";
import type { SpriteRef } from "./sprites";

/** Applique une SpriteRef (texture+frame+teinte) à un sprite, seulement si elle a changé. */
function applyRef(s: Phaser.GameObjects.Sprite, ref: SpriteRef): void {
  const sig = `${ref.key}:${ref.frame ?? "-"}:${ref.tint ?? -1}`;
  if (s.getData("sig") === sig) return;
  s.setData("sig", sig);
  // `frame` absent = texture autonome (skin médiéval) ; présent = planche.
  if (ref.frame === undefined) s.setTexture(ref.key);
  else s.setTexture(ref.key, ref.frame);
  s.setTint(ref.tint ?? 0xffffff);
}

/**
 * Couche de sprites synchronisée à une liste d'entités.
 * - keyOf  : identifiant stable de l'entité (uid, slotIndex…)
 * - refOf  : quelle frame afficher (depuis sprites.ts)
 * - place  : positionne/scale/flip/alpha le sprite à partir de l'entité (chaque frame)
 * - onGone : optionnel, FX de disparition à la dernière position connue
 */
export class SpriteLayer<T> {
  private sprites = new Map<number, Phaser.GameObjects.Sprite>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number,
  ) {}

  sync(
    items: readonly T[],
    keyOf: (t: T) => number,
    refOf: (t: T) => SpriteRef,
    place: (s: Phaser.GameObjects.Sprite, t: T) => void,
    onGone?: (s: Phaser.GameObjects.Sprite) => void,
  ): void {
    const seen = new Set<number>();
    for (const it of items) {
      const k = keyOf(it);
      seen.add(k);
      let s = this.sprites.get(k);
      if (!s) {
        const ref = refOf(it);
        s = (ref.frame === undefined
          ? this.scene.add.sprite(0, 0, ref.key)
          : this.scene.add.sprite(0, 0, ref.key, ref.frame)).setDepth(this.depth);
        this.sprites.set(k, s);
      }
      applyRef(s, refOf(it));
      place(s, it);
    }
    // Entités disparues (mortes / vague vidée) : FX optionnel puis destruction.
    for (const [k, s] of this.sprites) {
      if (seen.has(k)) continue;
      onGone?.(s);
      s.destroy();
      this.sprites.delete(k);
    }
  }

  /** Détruit tous les sprites (changement de scène / reset de run). */
  clear(): void {
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
  }
}
