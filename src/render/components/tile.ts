// ============================================================
// render/components/tile.ts — Tuile de navigation (ADR-025).
//
// Format « jeu » plutôt que « liste de réglages » : grande icône au-dessus du
// titre, dans un bloc qui occupe sa case — au lieu d'une rangée de texte avec
// une vignette de 30 px sur le côté.
//
// La disposition vient de `hubLayout` (pur, testé) ; ce module ne fait que
// dessiner la case qu'on lui donne.
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT } from "../theme";
import { ICON_RASTER_PX } from "../icons";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY } from "../ui";
import { uiFramedPanel } from "./panel";
import { composeTile } from "./tileContent";

export interface UiTileOpts {
  w: number;
  h: number;
  icon: string;
  iconColor?: number;
  title: string;
  titleColor?: string;
  sub?: string;
  accent?: number;
  /** Tuile de rang principal : titre plus grand, icône plus généreuse. */
  primary?: boolean;
  /** Avancement 0..1 — dessine une jauge en pied de tuile. */
  progress?: number;
  /**
   * Texture de fond, fortement assombrie sous le contenu — même traitement que
   * les vignettes de chapitre (`uiLevelGrid`). Une grande tuile qui ne porte
   * qu'une icône et deux lignes se creuse : l'aperçu du LIEU lui donne sa
   * surface, et dit au passage où mène la tuile.
   */
  bgTexture?: string;
  /** Verrouillée : plus de relief au survol, plus de curseur main. */
  locked?: boolean;
  onSelect: () => void;
}

export function uiTile(scene: Phaser.Scene, x: number, y: number, opts: UiTileOpts): Phaser.GameObjects.Container {
  const { w, h } = opts;
  const container = scene.add.container(x, y);
  const radius = 14;

  const { container: panel } = uiFramedPanel(scene, 0, 0, {
    w, h, borderColor: opts.accent ?? ACCENT.gold, radius,
  });
  container.add(panel);

  // Aperçu du lieu, en retrait du cadre pour que l'arrondi du pack reste net
  // par-dessus (un masque géométrique travaille en coordonnées MONDE et se
  // décale dès que la tuile vit dans un conteneur défilant — cf. `uiLevelGrid`).
  if (opts.bgTexture && scene.textures.exists(opts.bgTexture)) {
    const inset = 8;
    container.add(scene.add.tileSprite(0, 0, w - inset * 2, h - inset * 2, opts.bgTexture).setAlpha(0.4));
  }

  const highlight = scene.add.graphics();
  highlight.fillStyle(ACCENT.gold, 0.09);
  highlight.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  highlight.lineStyle(2, ACCENT.goldSoft, 0.95);
  highlight.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  highlight.setVisible(false);
  container.add(highlight);

  const titleSize = opts.primary ? 26 : 17;
  const subSize = opts.primary ? 14 : 11;

  const title = scene.add.text(0, 0, opts.title, {
    fontSize: `${titleSize}px`, color: opts.titleColor ?? TEXT.gold,
    fontFamily: opts.primary ? FONT_DISPLAY : FONT_BODY, align: "center",
  }).setOrigin(0.5, 0);
  const sub = opts.sub
    ? scene.add.text(0, 0, opts.sub, {
        fontSize: `${subSize}px`, color: TEXT.dim, fontFamily: FONT_BODY,
        align: "center", wordWrap: { width: w - 24 },
      }).setOrigin(0.5, 0)
    : null;

  // Empilement d'après les hauteurs RÉELLES (les polices sont remontées sur petit
  // écran, ADR-015) et d'après la place DISPONIBLE : `composeTile` est pur et
  // testé, ce module ne fait que poser les objets aux positions qu'il renvoie.
  const barH = 6;
  const box = composeTile({
    w, h, titleH: title.height, subH: sub?.height ?? 0,
    maxGlyph: ICON_RASTER_PX, footerH: opts.progress !== undefined ? barH : 0,
  });

  container.add(scene.add.image(0, box.iconCy, opts.icon)
    .setDisplaySize(box.glyph, box.glyph)
    .setTint(opts.iconColor ?? ACCENT.goldSoft));
  title.setY(box.titleTop);
  container.add(title);
  if (sub) {
    sub.setY(box.subTop);
    container.add(sub);
  }

  if (opts.progress !== undefined) {
    const barW = w - Math.max(40, box.pad * 2);
    const bar = scene.add.graphics();
    bar.fillStyle(0x000000, 0.45);
    bar.fillRoundedRect(-barW / 2, box.footerTop, barW, barH, 3);
    const filled = Math.max(0, Math.min(1, opts.progress));
    if (filled > 0) {
      bar.fillStyle(ACCENT.gold, 0.9);
      bar.fillRoundedRect(-barW / 2, box.footerTop, Math.max(barH, barW * filled), barH, 3);
    }
    container.add(bar);
  }

  // `setInteractive({})` ne définit AUCUNE zone de clic et fait planter Phaser au
  // premier pointeur (`input.hitAreaCallback is not a function`) : sans option de
  // curseur, il faut l'appeler sans argument du tout.
  const zone = scene.add.zone(0, 0, w, h);
  if (opts.locked) zone.setInteractive();
  else zone.setInteractive({ cursor: CURSOR_POINT });

  // L'action part au RELÂCHEMENT, avec abandon au-delà d'un seuil de glissement —
  // comme `uiButton` et `uiLevelGrid`. Sur `pointerdown`, l'appui ouvrait l'écran
  // suivant et le relâchement retombait sur ce qui se trouvait dessous : appuyer
  // sur « Histoire » lançait directement le chapitre placé sous le doigt.
  const DRAG_SLOP = 10;
  let downAt: { x: number; y: number } | null = null;
  if (!opts.locked) {
    zone.on("pointerover", () => highlight.setVisible(true));
    zone.on("pointerout", () => { highlight.setVisible(false); downAt = null; });
  }
  zone.on("pointerdown", (p: Phaser.Input.Pointer) => { downAt = { x: p.x, y: p.y }; });
  zone.on("pointerup", (p: Phaser.Input.Pointer) => {
    const from = downAt;
    downAt = null;
    if (!from || Math.hypot(p.x - from.x, p.y - from.y) > DRAG_SLOP) return;
    opts.onSelect();
  });
  container.add(zone);

  return container;
}
