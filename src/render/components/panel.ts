// ============================================================
// render/components/panel.ts — Panneaux nine-slice (Kenney UI).
// ============================================================

import Phaser from "phaser";
import { ACCENT, skinPanelTint, UI_TINT } from "../theme/theme";
import { fitInsets } from "../skin/nineSlicePlan";
import { ensureUiSkinTextures, uiSkinActive, uiSkinInset, uiSkinInsets, UI_SKIN_PANEL } from "../skin/uiSkin";
import type { Insets } from "../skin/nineSlicePlan";

/** Panneau nine-slice teinté (remplace les rectangles plats). */
export function uiPanel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  tint: number = UI_TINT.panel, alpha = 1,
): Phaser.GameObjects.NineSlice {
  // Parchemin du pack Tiny Swords, recomposé en nine-slice contigu. La teinte
  // reste pilotée par le thème (ADR-026) : la base est claire exprès, `setTint`
  // multipliant, elle peut virer ardoise, parchemin ou pourpre selon la palette.
  ensureUiSkinTextures(scene);
  const skin: boolean = scene.textures.exists(UI_SKIN_PANEL);
  const key: string = skin ? UI_SKIN_PANEL : "ui_panel";
  // Marges par CÔTÉ : les pièces du pack ne sont pas carrées (45 de large pour
  // 47 de haut), une marge unique déformerait les angles.
  // Les marges sont ramenées à ce que l'élément peut loger : un panneau plus court
  // que deux marges replierait le nine-slice sur lui-même.
  const i: Insets = fitInsets(
    skin ? uiSkinInsets(key) : { left: 14, right: 14, top: 14, bottom: 14 }, w, h,
  );
  const p: Phaser.GameObjects.NineSlice = scene.add.nineslice(x, y, key, undefined, w, h, i.left, i.right, i.top, i.bottom);
  p.setTint(skin ? skinPanelTint(tint) : tint).setAlpha(alpha);
  return p;
}

/**
 * Un liseré DÉCORATIF doit-il encore être tracé ?
 *
 * Avec l'habillage dessiné, le contour est DANS l'art. Reposer un trait doré
 * par-dessus superpose deux courbes de rayons différents, qui divergent aux
 * angles et se lisent comme des ÉQUERRES DÉTACHÉES (relevé au playtest sur les
 * vignettes de chapitre et la fenêtre d'abandon).
 *
 * Les liserés porteurs d'INFORMATION — état verrouillé, victoire, option
 * indisponible — ne passent pas par ici : ils restent toujours tracés.
 */
export function decorativeEdgeVisible(scene: Phaser.Scene): boolean {
  return !uiSkinActive(scene);
}

/**
 * Marge intérieure d'un panneau : distance minimale entre son bord et tout
 * contenu posé dessus.
 *
 * Elle vient de la marge RÉELLE de l'habillage, jamais d'un chiffre choisi à la
 * main : le panneau ouvragé du pack porte une volute de 22 unités dans chaque
 * angle, et les valeurs héritées de l'ancien fond plat (6 sur une vignette de
 * chapitre) posaient le texte en plein dessus.
 */
export function uiPanelPad(scene: Phaser.Scene): number {
  return uiSkinActive(scene) ? uiSkinInset(UI_SKIN_PANEL) : 10;
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
  const container: Phaser.GameObjects.Container = scene.add.container(x, y);
  const panel: Phaser.GameObjects.NineSlice = uiPanel(scene, 0, 0, w, h, tint);
  const border: Phaser.GameObjects.Graphics = scene.add.graphics();
  // Le panneau du pack porte DÉJÀ son contour, dessiné dans l'art — liseré doré
  // et volutes d'angle. Reposer par-dessus un liseré vectoriel superpose deux
  // courbes de rayons différents, qui divergent aux angles.
  //
  // Y compris pour les liserés d'ÉTAT, qu'on avait d'abord épargnés : sur le
  // panneau ouvragé, l'anneau vert « conquis » de la grille des chapitres doublait
  // le cadre doré de façon très visible. L'état ne se perd pas pour autant — il
  // est porté par le contenu (étoiles gagnées, nom masqué, prix en rouge) et par
  // la teinte éteinte du panneau verrouillé.
  if (!uiSkinActive(scene)) {
    border.lineStyle(1, borderColor, borderAlpha);
    border.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  }
  container.add([panel, border]);
  return { container, panel, border };
}
