// ============================================================
// render/components/modal.ts — Fenêtre modale plein écran (dim + panneau + boutons).
// ============================================================

import Phaser from "phaser";
import { TEXT } from "../theme";
import { FONT_BODY, FONT_DISPLAY } from "../ui";
import { WORLD_W, WORLD_H } from "../viewport";
import { uiPanel } from "./panel";
import { uiButton } from "./button";

export interface UiModalButton {
  label: string;
  /** Largeur du bouton (par défaut 150 — augmenter pour un libellé long). */
  w?: number;
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

/** Modale centrée sur le champ de bataille (`WORLD_W`/`WORLD_H` logiques) — généralise l'overlay d'intro/confirmation/fin de run. */
export function uiModal(scene: Phaser.Scene, opts: UiModalOpts): UiModal {
  const depth = opts.depth ?? 3000;
  const c = scene.add.container(WORLD_W / 2, WORLD_H / 2).setDepth(depth);
  c.add(scene.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x120d08, opts.dimAlpha ?? 0.5));
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
  const widths = buttons.map(b => b.w ?? 150);
  const totalW = widths.reduce((sum, w) => sum + w, 0) + gap * (buttons.length - 1);
  let cursorX = -totalW / 2;
  buttons.forEach((b, i) => {
    const w = widths[i]!;
    const x = cursorX + w / 2;
    cursorX += w + gap;
    c.add(uiButton(scene, x, opts.h / 2 - 45, b.label, { w, h: 40, gold: b.gold, color: b.color, fontSize: 16 }, () => b.onClick()).container);
  });
  return { container: c, close: () => c.destroy() };
}
