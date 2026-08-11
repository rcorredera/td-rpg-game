// ============================================================
// render/components/button.ts — Bouton nine-slice avec hover/press.
// ============================================================

import Phaser from "phaser";
import { UI_TINT } from "../theme";
import { CURSOR_POINT, FONT_DISPLAY } from "../ui";
import { touchSize } from "../viewport";

export interface UiButtonOpts {
  w: number;
  h?: number;
  /** true = bouton d'action principal (jaune Kenney, texte sombre). */
  gold?: boolean;
  fontSize?: number;
  color?: string;
  disabled?: boolean;
}

export interface UiButton {
  container: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.NineSlice;
  txt: Phaser.GameObjects.Text;
  /** Dimensions EFFECTIVES après application du plancher tactile — les écrans doivent
   *  espacer leurs éléments d'après ces valeurs, jamais d'après celles demandées. */
  w: number;
  h: number;
}

/** Bouton nine-slice avec hover (desktop) et stopPropagation (ne déclenche pas le tap de scène). */
export function uiButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  opts: UiButtonOpts, cb?: () => void,
): UiButton {
  // Plancher tactile appliqué ici, une fois pour tous les appelants : une hauteur
  // écrite à la main reste confortable sur grand écran mais devient inatteignable
  // au doigt sur mobile (cf. `touchSize`, ADR-011).
  const h = touchSize(opts.h ?? 36);
  const w = touchSize(opts.w);
  const c = scene.add.container(x, y);
  const img = scene.add.nineslice(0, 0, opts.gold ? "ui_btn_gold" : "ui_btn", undefined, w, h, 14, 14, 14, 16);
  if (!opts.gold) img.setTint(UI_TINT.btn);
  const txt = scene.add.text(0, -2, label, {
    fontSize: `${opts.fontSize ?? 15}px`,
    color: opts.color ?? (opts.gold ? "#3a2c12" : "#f0e6d2"),
    fontFamily: FONT_DISPLAY,
  }).setOrigin(0.5);
  c.add([img, txt]);
  if (opts.disabled || !cb) {
    c.setAlpha(0.55);
    return { container: c, img, txt, w, h };
  }
  img.setInteractive({ cursor: CURSOR_POINT });
  const hoverTint = opts.gold ? 0xfff2cf : 0xa68c64;
  img.on("pointerover", () => { c.setScale(1.04); img.setTint(hoverTint); });
  img.on("pointerout", () => { c.setScale(1); img.setTint(opts.gold ? 0xffffff : UI_TINT.btn); });
  img.on("pointerup", () => c.setScale(1.04));
  img.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev?: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    c.setScale(0.96);
    cb();
  });
  return { container: c, img, txt, w, h };
}
