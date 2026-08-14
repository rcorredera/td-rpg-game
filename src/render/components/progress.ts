// ============================================================
// render/components/progress.ts — Jauge d'avancement.
//
// Châsse du pack Tiny Swords (bois cerclé) + remplissage DESSINÉ. Le pack livre
// bien un remplissage (`bar-big-fill.png`), mais il est rouge : `setTint`
// MULTIPLIE, donc on ne peut le faire virer ni à l'or ni au vert. L'ornement vient
// du pack, la couleur reste au jeu — c'est déjà le partage retenu pour la jauge de
// PV du Bastion (ADR-030).
// ============================================================

import Phaser from "phaser";
import { ACCENT } from "../theme";
import { fitInsets } from "../nineSlicePlan";
import { ensureUiSkinTextures, uiSkinInsets, uiSkinSafeInsets, UI_SKIN_BAR_BIG } from "../uiSkin";

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
  const clamped = Math.max(0, Math.min(1, pct));
  const h = uiProgressHeight(scene);

  if (h === 0) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x - w / 2, top, w, fallbackH, 3);
    if (clamped > 0) {
      g.fillStyle(ACCENT.gold, 0.9);
      g.fillRoundedRect(x - w / 2, top, Math.max(fallbackH, w * clamped), fallbackH, 3);
    }
    return { h: fallbackH, objects: [g] };
  }

  const ins = uiSkinInsets(UI_SKIN_BAR_BIG);
  const fitted = fitInsets(ins, w, h);
  const chasse = scene.add.nineslice(
    x, top + h / 2, UI_SKIN_BAR_BIG, undefined, w, h, fitted.left, fitted.right, 0, 0,
  );

  // Le remplissage se pose DANS la gorge : en retrait de la ferrure des embouts,
  // mesurée sur la planche, et d'une part de la hauteur pour le cerclage.
  const safe = uiSkinSafeInsets(UI_SKIN_BAR_BIG);
  const padY = Math.max(2, Math.round(h * 0.22));
  const ix = x - w / 2 + safe.left;
  const iw = Math.max(0, w - safe.left - safe.right);
  const g = scene.add.graphics();
  if (clamped > 0) {
    g.fillStyle(ACCENT.gold, 0.95);
    g.fillRect(ix, top + padY, iw * clamped, h - padY * 2);
  }
  return { h, objects: [chasse, g] };
}
