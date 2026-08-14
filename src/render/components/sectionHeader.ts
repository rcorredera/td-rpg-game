// ============================================================
// render/components/sectionHeader.ts — Titre de sous-écran + bouton
// retour. Remplace MenuScene.backButton().
// ============================================================

import Phaser from "phaser";
import { TEXT } from "../theme";
import { FONT_DISPLAY } from "../ui";
import { touchSize, WORLD_W } from "../viewport";
import { uiButton } from "./button";

export interface UiSectionHeaderOpts {
  title: string;
  x?: number;
  y?: number;
  /** Demi-largeur du bloc de contenu : le bouton retour s'aligne sur son bord gauche. */
  halfWidth?: number;
  onBack?: () => void;
  backLabel?: string;
}

export interface UiSectionHeader {
  container: Phaser.GameObjects.Container;
  /** Y du bas de l'en-tête — les écrans empilent leur contenu À PARTIR DE LÀ,
   *  jamais depuis une constante : le bouton retour grandit avec le plancher
   *  tactile et poussait sinon le titre sous les onglets (bug mobile réel). */
  bottom: number;
}

export function uiSectionHeader(scene: Phaser.Scene, opts: UiSectionHeaderOpts): UiSectionHeader {
  // Défaut DÉRIVÉ, jamais écrit en dur : un `400` (l'ancien 800/2) avait survécu
  // au passage du monde en 960×540 et décalait l'en-tête vers la gauche (ADR-027).
  const x: number = opts.x ?? WORLD_W / 2;
  const y: number = opts.y ?? 165;
  const half: number = opts.halfWidth ?? 320;
  const container: Phaser.GameObjects.Container = scene.add.container(0, 0);

  const btnW: number = touchSize(130);
  const btnH: number = touchSize(30);
  if (opts.onBack) {
    container.add(uiButton(scene, x - half + btnW / 2, y, opts.backLabel ?? "⟵ Campement",
      { w: btnW, h: btnH, fontSize: 13 }, opts.onBack).container);
  }

  // Le titre est centré, mais jamais au point de passer sous le bouton retour.
  const titleX: number = Math.max(x, x - half + btnW + 90);
  container.add(scene.add.text(titleX, y, opts.title, {
    fontSize: "20px", color: TEXT.gold, fontFamily: FONT_DISPLAY,
  }).setOrigin(0.5));

  return { container, bottom: y + Math.max(btnH, 26) / 2 };
}
