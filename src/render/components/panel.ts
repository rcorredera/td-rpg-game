// ============================================================
// render/components/panel.ts — Panneaux nine-slice (Kenney UI).
// ============================================================

import Phaser from "phaser";
import { ACCENT, UI_TINT } from "../theme";
import { ensureUiSkinTextures, UI_SKIN_INSET, UI_SKIN_PANEL } from "../uiSkin";

/** Panneau nine-slice teinté (remplace les rectangles plats). */
export function uiPanel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  tint: number = UI_TINT.panel, alpha = 1,
): Phaser.GameObjects.NineSlice {
  // Parchemin du pack Tiny Swords, recomposé en nine-slice contigu. La teinte
  // reste pilotée par le thème (ADR-026) : la base est claire exprès, `setTint`
  // multipliant, elle peut virer ardoise, parchemin ou pourpre selon la palette.
  ensureUiSkinTextures(scene);
  const key = scene.textures.exists(UI_SKIN_PANEL) ? UI_SKIN_PANEL : "ui_panel";
  const inset = key === UI_SKIN_PANEL ? UI_SKIN_INSET : 14;
  const p = scene.add.nineslice(x, y, key, undefined, w, h, inset, inset, inset, inset);
  p.setTint(tint).setAlpha(alpha);
  return p;
}

export interface UiFramedPanelOpts {
  w: number;
  h: number;
  /** Teinte du panneau nine-slice. */
  tint?: number;
  /** Couleur du liseré. */
  borderColor?: number;
  borderAlpha?: number;
  radius?: number;
}

export interface UiFramedPanel {
  container: Phaser.GameObjects.Container;
  panel: Phaser.GameObjects.NineSlice;
  border: Phaser.GameObjects.Graphics;
}

/** Panneau + liseré arrondi regroupés dans un container (remplace MenuScene.box()). */
export function uiFramedPanel(scene: Phaser.Scene, x: number, y: number, opts: UiFramedPanelOpts): UiFramedPanel {
  const { w, h, tint = UI_TINT.panel, borderColor = ACCENT.gold, borderAlpha = 0.85, radius = 10 } = opts;
  const container = scene.add.container(x, y);
  const panel = uiPanel(scene, 0, 0, w, h, tint);
  const border = scene.add.graphics();
  border.lineStyle(1, borderColor, borderAlpha);
  border.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  container.add([panel, border]);
  return { container, panel, border };
}
