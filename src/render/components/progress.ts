// ============================================================
// render/components/progress.ts — Jauge d'avancement.
//
// Châsse du pack Tiny Swords (bois cerclé) + remplissage du pack RETEINT en or
// par luminance (`colorRemap.ts`, ADR-035) : `bar-big-fill.png` est rouge et
// `setTint` MULTIPLIE, donc ne peut jamais le désaturer — mais son dégradé
// clair→sombre (reflet, ombre) reste le sien, la couleur seule change. C'est le
// même partage planche-du-pack/couleur-du-jeu que la jauge de PV du Bastion
// (ADR-030), en mieux : la texture du pack sert enfin aussi.
// ============================================================

import Phaser from "phaser";
import { ACCENT } from "../theme";
import { fitInsets } from "../nineSlicePlan";
import {
  ensureUiSkinTextures, uiSkinInsets, uiSkinSafeInsets, UI_SKIN_BAR_BIG, UI_SKIN_BAR_FILL_GOLD,
} from "../uiSkin";
import type { SafeInsets } from "../uiSkin";
import type { Insets } from "../nineSlicePlan";
import { progressFillBox } from "./progressFill";
import type { ProgressFillBox } from "./progressFill";

export interface UiProgress {
  /** Hauteur RÉELLE occupée — celle de l'art quand la châsse est disponible. */
  h: number;
  objects: Phaser.GameObjects.GameObject[];
}

/** Hauteur de la jauge habillée, 0 si le pack n'est pas là. */
export function uiProgressHeight(scene: Phaser.Scene): number {
  ensureUiSkinTextures(scene);
  if (!scene.textures.exists(UI_SKIN_BAR_BIG)) return 0;
  return scene.textures.get(UI_SKIN_BAR_BIG).getSourceImage().height;
}

/**
 * Jauge centrée sur `x`, dont le HAUT est à `top`.
 *
 * Sans habillage, retombe sur deux rectangles arrondis — l'ancien rendu.
 */
export function uiProgress(
  scene: Phaser.Scene, x: number, top: number, w: number, pct: number, fallbackH = 6,
): UiProgress {
  const clamped: number = Math.max(0, Math.min(1, pct));
  const h: number = uiProgressHeight(scene);

  if (h === 0) {
    const g: Phaser.GameObjects.Graphics = scene.add.graphics();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x - w / 2, top, w, fallbackH, 3);
    if (clamped > 0) {
      g.fillStyle(ACCENT.gold, 0.9);
      g.fillRoundedRect(x - w / 2, top, Math.max(fallbackH, w * clamped), fallbackH, 3);
    }
    return { h: fallbackH, objects: [g] };
  }

  const ins: Insets = uiSkinInsets(UI_SKIN_BAR_BIG);
  const fitted: Insets = fitInsets(ins, w, h);
  const chasse: Phaser.GameObjects.NineSlice = scene.add.nineslice(
    x, top + h / 2, UI_SKIN_BAR_BIG, undefined, w, h, fitted.left, fitted.right, 0, 0,
  );

  // Le remplissage se pose DANS la gorge : en retrait de la ferrure des embouts,
  // mesurée sur la planche, et d'une part de la hauteur pour le cerclage
  // (géométrie pure et testée, `progressFill.ts` — voir `GORGE_PAD_RATIO`).
  const safe: SafeInsets = uiSkinSafeInsets(UI_SKIN_BAR_BIG);
  const box: ProgressFillBox = progressFillBox(w, h, clamped, safe);
  const objects: Phaser.GameObjects.GameObject[] = [chasse];
  if (clamped > 0) {
    if (scene.textures.exists(UI_SKIN_BAR_FILL_GOLD)) {
      // Motif du pack étiré : X-UNIFORME sur toute sa largeur (mesuré), donc
      // sans embout ni raccord à préserver — un simple `setDisplaySize` suffit,
      // pas de nine-slice.
      objects.push(scene.add.image(x + box.ix, top + box.iy, UI_SKIN_BAR_FILL_GOLD)
        .setOrigin(0, 0).setDisplaySize(box.iw, box.ih));
    } else {
      const g: Phaser.GameObjects.Graphics = scene.add.graphics();
      g.fillStyle(ACCENT.gold, 0.95);
      g.fillRect(x + box.ix, top + box.iy, box.iw, box.ih);
      objects.push(g);
    }
  }
  return { h, objects };
}
