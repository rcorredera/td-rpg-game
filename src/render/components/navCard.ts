// ============================================================
// render/components/navCard.ts — Carte de navigation avec icône,
// titre, sous-titre et surbrillance au survol. Remplace le bloc
// inline de MenuScene.buildHome().
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT } from "../theme";
import { CURSOR_POINT, FONT_BODY } from "../ui";
import { touchSize } from "../viewport";
import { uiFramedPanel } from "./panel";

export interface UiNavCardOpts {
  w?: number;
  h?: number;
  /** Clé de texture d'icône (registre `render/icons.ts`) — jamais un emoji :
   *  le rendu des emoji dépend de l'OS et sort en couleurs qui jurent avec la
   *  palette (ADR-012). */
  icon: string;
  /** Teinte de l'icône. Par défaut, celle du titre. */
  iconColor?: number;
  title: string;
  titleColor?: string;
  sub: string;
  /** Couleur de bordure au repos (par défaut ACCENT.gold). */
  accent?: number;
  onSelect: () => void;
}

export interface UiNavCard {
  container: Phaser.GameObjects.Container;
  /** Hauteur EFFECTIVE après plancher tactile — l'écran empile d'après elle. */
  h: number;
}

export function uiNavCard(scene: Phaser.Scene, x: number, y: number, opts: UiNavCardOpts): UiNavCard {
  const w = opts.w ?? 540;
  const h = touchSize(opts.h ?? 68);
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

  const iconX = -w / 2 + 34;
  const textX = -w / 2 + 75;
  const glyph = Math.min(30, h * 0.44);
  container.add(
    scene.add.image(iconX, 0, opts.icon).setDisplaySize(glyph, glyph).setTint(opts.iconColor ?? ACCENT.goldSoft),
  );
  container.add(scene.add.text(textX, -16, opts.title, { fontSize: "19px", color: opts.titleColor ?? TEXT.gold, fontFamily: FONT_BODY }));
  container.add(scene.add.text(textX, 9, opts.sub, { fontSize: "12px", color: TEXT.dim, fontFamily: FONT_BODY }));

  const zone = scene.add.zone(0, 0, w, h).setInteractive({ cursor: CURSOR_POINT });
  zone.on("pointerover", () => highlight.setVisible(true));
  zone.on("pointerout", () => highlight.setVisible(false));
  zone.on("pointerdown", () => opts.onSelect());
  container.add(zone);

  return { container, h };
}
