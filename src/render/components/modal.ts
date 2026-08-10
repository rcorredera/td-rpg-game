// ============================================================
// render/components/modal.ts — Fenêtre modale plein écran (dim + panneau + boutons).
// ============================================================

import Phaser from "phaser";
import { TEXT } from "../theme";
import { FONT_BODY, FONT_DISPLAY } from "../ui";
import { uiPanel } from "./panel";
import { uiButton } from "./button";

export interface UiModalButton {
  label: string;
  gold?: boolean;
  color?: string;
  onClick: () => void;
}

export interface UiModalOpts {
  w: number;
  h: number;
  title: string;
  body?: string;
  /** Boutons du pied de modale, alignés horizontalement. */
  buttons?: UiModalButton[];
  depth?: number;
  dimAlpha?: number;
  /** Hook pour du contenu sur mesure (étoiles, lignes de stats…), ajouté sous le titre/corps. */
  build?: (content: Phaser.GameObjects.Container) => void;
}

export interface UiModal {
  container: Phaser.GameObjects.Container;
  close: () => void;
}

/** Modale centrée à l'écran (800×600 logique) — généralise l'overlay d'intro/confirmation/fin de run. */
export function uiModal(scene: Phaser.Scene, opts: UiModalOpts): UiModal {
  const depth = opts.depth ?? 3000;
  const c = scene.add.container(400, 300).setDepth(depth);
  c.add(scene.add.rectangle(0, 0, 800, 600, 0x120d08, opts.dimAlpha ?? 0.5));
  c.add(uiPanel(scene, 0, 0, opts.w, opts.h));
  c.add(scene.add.text(0, -opts.h / 2 + 34, opts.title, {
    fontSize: "19px", color: TEXT.gold, fontFamily: FONT_DISPLAY,
  }).setOrigin(0.5));
  if (opts.body) {
    c.add(scene.add.text(0, -20, opts.body, {
      fontSize: "16px", color: TEXT.light, fontFamily: FONT_BODY, align: "center", lineSpacing: 8,
      wordWrap: { width: opts.w - 60 },
    }).setOrigin(0.5));
  }
  if (opts.build) {
    const content = scene.add.container(0, 0);
    c.add(content);
    opts.build(content);
  }
  const buttons = opts.buttons ?? [];
  const gap = 20;
  const btnW = 150;
  const totalW = buttons.length * btnW + (buttons.length - 1) * gap;
  buttons.forEach((b, i) => {
    const x = -totalW / 2 + btnW / 2 + i * (btnW + gap);
    c.add(uiButton(scene, x, opts.h / 2 - 45, b.label, { w: btnW, h: 40, gold: b.gold, color: b.color, fontSize: 16 }, () => b.onClick()).container);
  });
  return { container: c, close: () => c.destroy() };
}
