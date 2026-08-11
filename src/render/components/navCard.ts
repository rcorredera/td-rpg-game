// ============================================================
// render/components/navCard.ts — Carte de navigation avec icône,
// titre, sous-titre et surbrillance au survol. Remplace le bloc
// inline de MenuScene.buildHome().
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT } from "../theme";
import { CURSOR_POINT, FONT_BODY } from "../ui";
import { scaleFont, touchSize } from "../viewport";
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
  // La carte doit loger son texte : sur petit écran, les polices sont remontées
  // (ADR-015) et une hauteur fixe ne suffisait plus.
  const h = Math.max(touchSize(opts.h ?? 68), scaleFont(19) + scaleFont(12) + 26);
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

  // Bloc titre + sous-titre centré d'après les hauteurs RÉELLES des textes : la
  // taille de police est remontée sur petit écran (ADR-015), donc des Y en dur
  // faisaient déborder le texte hors de la carte.
  const title = scene.add.text(textX, 0, opts.title, { fontSize: "19px", color: opts.titleColor ?? TEXT.gold, fontFamily: FONT_BODY });
  const sub = scene.add.text(textX, 0, opts.sub, { fontSize: "12px", color: TEXT.dim, fontFamily: FONT_BODY });
  const gap = 2;
  const blockH = title.height + gap + sub.height;
  title.setY(-blockH / 2);
  sub.setY(-blockH / 2 + title.height + gap);
  container.add([title, sub]);

  const zone = scene.add.zone(0, 0, w, h).setInteractive({ cursor: CURSOR_POINT });
  zone.on("pointerover", () => highlight.setVisible(true));
  zone.on("pointerout", () => highlight.setVisible(false));
  zone.on("pointerdown", () => opts.onSelect());
  container.add(zone);

  return { container, h };
}
