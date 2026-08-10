// ============================================================
// render/components/sectionHeader.ts — Titre de sous-écran + bouton
// retour. Remplace MenuScene.backButton().
// ============================================================

import Phaser from "phaser";
import { TEXT } from "../theme";
import { FONT_DISPLAY } from "../ui";
import { uiButton } from "./button";

export interface UiSectionHeaderOpts {
  title: string;
  x?: number;
  y?: number;
  onBack?: () => void;
  backLabel?: string;
}

export function uiSectionHeader(scene: Phaser.Scene, opts: UiSectionHeaderOpts): Phaser.GameObjects.Container {
  const x = opts.x ?? 400;
  const y = opts.y ?? 165;
  const container = scene.add.container(0, 0);
  if (opts.onBack) {
    container.add(uiButton(scene, x - 320, y, opts.backLabel ?? "⟵ Campement", { w: 130, h: 30, fontSize: 13 }, opts.onBack).container);
  }
  container.add(scene.add.text(x, y, opts.title, { fontSize: "20px", color: TEXT.gold, fontFamily: FONT_DISPLAY }).setOrigin(0.5));
  return container;
}
