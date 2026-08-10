// ============================================================
// render/components/chip.ts — Étiquette icône + texte (monnaies,
// stats, badges). Remplace les chaînes concaténées à la main.
// ============================================================

import Phaser from "phaser";
import { TEXT } from "../theme";
import { FONT_BODY } from "../ui";

export interface UiChipOpts {
  icon?: string;
  text: string;
  fontSize?: number;
  color?: string;
  /** Fond arrondi façon badge (par défaut : texte nu, sans fond). */
  pill?: boolean;
}

export interface UiChip {
  container: Phaser.GameObjects.Container;
  text: Phaser.GameObjects.Text;
  /** Remplace le texte affiché (icône conservée). */
  setText(text: string): void;
}

export function uiChip(scene: Phaser.Scene, x: number, y: number, opts: UiChipOpts): UiChip {
  const container = scene.add.container(x, y);
  const icon = opts.icon;
  const label = icon ? `${icon} ${opts.text}` : opts.text;
  const text = scene.add.text(0, 0, label, {
    fontSize: `${opts.fontSize ?? 14}px`,
    color: opts.color ?? TEXT.light,
    fontFamily: FONT_BODY,
    ...(opts.pill ? { backgroundColor: "#221b12", padding: { x: 14, y: 7 } } : {}),
  }).setOrigin(0.5);
  container.add(text);
  return {
    container, text,
    setText: (t: string) => text.setText(icon ? `${icon} ${t}` : t),
  };
}
