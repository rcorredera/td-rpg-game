// ============================================================
// render/components/navCard.ts — Carte de navigation avec icône,
// titre, sous-titre et surbrillance au survol. Remplace le bloc
// inline de MenuScene.buildHome().
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT } from "../theme";
import { CURSOR_POINT, FONT_BODY } from "../ui";
import { uiFramedPanel } from "./panel";

export interface UiNavCardOpts {
  w?: number;
  h?: number;
  icon: string;
  title: string;
  titleColor?: string;
  sub: string;
  /** Couleur de bordure au repos (par défaut ACCENT.gold). */
  accent?: number;
  onSelect: () => void;
}

export function uiNavCard(scene: Phaser.Scene, x: number, y: number, opts: UiNavCardOpts): Phaser.GameObjects.Container {
  const w = opts.w ?? 540;
  const h = opts.h ?? 68;
  const container = scene.add.container(x, y);

  const { container: panel } = uiFramedPanel(scene, 0, 0, { w, h, borderColor: opts.accent ?? ACCENT.gold, radius: 12 });
  container.add(panel);

  const highlight = scene.add.graphics();
  highlight.fillStyle(ACCENT.gold, 0.07);
  highlight.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  highlight.lineStyle(1, ACCENT.goldSoft, 0.9);
  highlight.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  highlight.setVisible(false);
  container.add(highlight);

  const iconX = -w / 2 + 30;
  const textX = -w / 2 + 75;
  container.add(scene.add.text(iconX, 0, opts.icon, { fontSize: "26px" }).setOrigin(0.5));
  container.add(scene.add.text(textX, -16, opts.title, { fontSize: "19px", color: opts.titleColor ?? TEXT.gold, fontFamily: FONT_BODY }));
  container.add(scene.add.text(textX, 9, opts.sub, { fontSize: "12px", color: TEXT.dim, fontFamily: FONT_BODY }));

  const zone = scene.add.zone(0, 0, w, h).setInteractive({ cursor: CURSOR_POINT });
  zone.on("pointerover", () => highlight.setVisible(true));
  zone.on("pointerout", () => highlight.setVisible(false));
  zone.on("pointerdown", () => opts.onSelect());
  container.add(zone);

  return container;
}
