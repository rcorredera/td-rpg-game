// ============================================================
// render/components/chip.ts — Étiquette icône + texte (monnaies,
// stats). Remplace les chaînes concaténées à la main.
// ============================================================

import Phaser from "phaser";
import { TEXT } from "../theme";
import { FONT_BODY } from "../ui";

export interface UiChipOpts {
  icon?: string;
  text: string;
  fontSize?: number;
  color?: string;
}

export function uiChip(scene: Phaser.Scene, x: number, y: number, opts: UiChipOpts): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const label = opts.icon ? `${opts.icon} ${opts.text}` : opts.text;
  container.add(scene.add.text(0, 0, label, {
    fontSize: `${opts.fontSize ?? 14}px`, color: opts.color ?? TEXT.light, fontFamily: FONT_BODY,
  }).setOrigin(0.5));
  return container;
}
