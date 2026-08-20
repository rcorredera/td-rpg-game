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
import { ACCENT, TEXT } from "../theme/theme";
import { ICON_RASTER_PX } from "../theme/icons";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY } from "../theme/ui";
import { uiFramedPanel, uiPanelPad } from "./panel";
import { uiProgress, uiProgressHeight } from "./progress";
import { uiRibbon, uiRibbonAvailable, uiRibbonHeight, uiRibbonKey, type RibbonTone } from "./ribbon";
import { composeTile } from "./tileContent";
import type { TileContentBox } from "./tileContent";
import type { Vec2 } from "../../core/types";
import { UI_SKIN_RIBBON_BIG } from "../skin/uiSkin";

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
  /** Emblème RASTER du pack : ni teinte, ni ombre, proportions gardées. */
  rawIcon?: boolean;
  /** Couleur du ruban de titre — le sens, pas le goût. */
  ribbonTone?: RibbonTone;
  /** Verrouillée : plus de relief au survol, plus de curseur main. */
  locked?: boolean;
  onSelect: () => void;
}

export function uiTile(scene: Phaser.Scene, x: number, y: number, opts: UiTileOpts): Phaser.GameObjects.Container {
  const { w, h } = opts;
  const container: Phaser.GameObjects.Container = scene.add.container(x, y);
  const radius: number = 14;

  const { container: panel } = uiFramedPanel(scene, 0, 0, {
    w, h, borderColor: opts.accent ?? ACCENT.gold, radius,
  });
  container.add(panel);

  const highlight: Phaser.GameObjects.Graphics = scene.add.graphics();
  highlight.fillStyle(ACCENT.gold, 0.09);
  highlight.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  highlight.lineStyle(2, ACCENT.goldSoft, 0.95);
  highlight.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  highlight.setVisible(false);
  container.add(highlight);

  const titleSize: number = opts.primary ? 26 : 17;
  const subSize: number = opts.primary ? 14 : 11;

  const title: Phaser.GameObjects.Text = scene.add.text(0, 0, opts.title, {
    fontSize: `${titleSize}px`, color: opts.titleColor ?? TEXT.gold,
    fontFamily: opts.primary ? FONT_DISPLAY : FONT_BODY, align: "center",
  }).setOrigin(0.5, 0);
  const sub: Phaser.GameObjects.Text | null = opts.sub
    ? scene.add.text(0, 0, opts.sub, {
        fontSize: `${subSize}px`, color: TEXT.dim, fontFamily: FONT_BODY,
        align: "center", wordWrap: { width: w - 24 },
      }).setOrigin(0.5, 0)
    : null;

  // Le titre se pose sur un RUBAN du pack, dans les mêmes couleurs que les
  // boutons — c'est ce qui raccrochait visuellement les tuiles aux commandes.
  // Sa hauteur remplace celle du texte dans la composition, sinon le ruban
  // déborderait du bloc calculé.
  // Borné à un quart de la tuile : à sa taille native (54), le ruban mangeait la
  // moitié de la zone utile d'une tuile secondaire et l'emblème tombait à 45.
  // Tuile PRINCIPALE : grande variante de la planche (ADR-035) — sa hauteur
  // native diffère, donc la clé doit être résolue AVANT de mesurer, sous peine
  // de composer le bloc sur la hauteur de la PETITE planche puis d'y dessiner
  // la grande (même défaut qu'ADR-032 : deux mesures qui ne se parlent pas).
  const RIBBON_SHARE: number = 0.26;
  const ribbonTone: RibbonTone = opts.locked ? "off" : opts.ribbonTone ?? "normal";
  const ribbonKey: string = uiRibbonKey(scene, ribbonTone, opts.primary);
  const ribbonH: number = uiRibbonAvailable(scene)
    ? Math.min(uiRibbonHeight(scene, ribbonKey), h * RIBBON_SHARE)
    : 0;
  const titleBlockH: number = Math.max(title.height, ribbonH);

  // Empilement d'après les hauteurs RÉELLES (les polices sont remontées sur petit
  // écran, ADR-015) et d'après la place DISPONIBLE : `composeTile` est pur et
  // testé, ce module ne fait que poser les objets aux positions qu'il renvoie.
  const barH: number = Math.max(6, uiProgressHeight(scene));
  const box: TileContentBox = composeTile({
    w, h, titleH: titleBlockH, subH: sub?.height ?? 0,
    maxGlyph: ICON_RASTER_PX, footerH: opts.progress !== undefined ? barH : 0,
    minPad: uiPanelPad(scene),
  });

  // Ombre portée sous l'emblème. Nos icônes sont des SILHOUETTES monochromes
  // (ADR-012) : posées à grande taille sur l'ardoise ouvragée du pack, elles
  // lisaient comme un aplat de remplissage. Un double sombre décalé leur rend
  // l'épaisseur que l'art du pack a partout ailleurs, sans changer d'iconographie.
  // Un emblème du pack (`raw`) arrive avec son relief : ni ombre, ni teinte.
  if (!opts.rawIcon) {
    const shadow: number = 3;
    container.add(scene.add.image(shadow, box.iconCy + shadow, opts.icon)
      .setDisplaySize(box.glyph, box.glyph)
      .setTint(0x0b0f1a).setAlpha(0.45));
  }
  const emblem: Phaser.GameObjects.Image = scene.add.image(0, box.iconCy, opts.icon);
  // Un raster du pack garde ses PROPORTIONS : l'étirer au carré écraserait le
  // Bastion, dont la planche fait 320×280.
  if (opts.rawIcon) emblem.setScale(box.glyph / Math.max(emblem.width, emblem.height));
  else emblem.setDisplaySize(box.glyph, box.glyph).setTint(opts.iconColor ?? ACCENT.goldSoft);
  container.add(emblem);
  const ruban: Phaser.GameObjects.Image | null = uiRibbon(
    scene, 0, box.titleTop + titleBlockH / 2, title.width, w - box.pad * 2,
    ribbonTone, ribbonH, opts.primary,
  );
  if (ruban) container.add(ruban);
  // Origine CENTRÉE une fois posé sur le ruban : aligner son haut le décalerait
  // vers le bas d'une demi-hauteur de ruban.
  title.setOrigin(0.5, ruban ? 0.5 : 0);
  // La grande planche de ruban (ADR-035, tuile PRINCIPALE) n'a pas son encre
  // centrée dans sa cellule source : mesuré pixel par pixel sur
  // `ribbons-big.png`, l'encre opaque occupe les lignes 20 à 122 d'une cellule
  // de 128 (centre à 71, pas 64) — 20 px de marge transparente au-dessus contre
  // seulement 6 en dessous. Un texte centré sur la cellule (comme le ruban lui
  // pose son image) se retrouve donc visiblement AU-DESSUS du centre du bandeau
  // dessiné. `ribbons-small.png` (tuiles secondaires), lui, est déjà centré à
  // 2 px près — négligeable, aucune correction là.
  const BIG_RIBBON_INK_OFFSET: number = 71 / 128 - 0.5; // ≈ 0.055, mesuré sur ribbons-big.png
  const ribbonInkDy: number = ruban && ribbonKey === UI_SKIN_RIBBON_BIG ? BIG_RIBBON_INK_OFFSET * ribbonH : 0;
  title.setY((ruban ? box.titleTop + titleBlockH / 2 : box.titleTop) + ribbonInkDy);
  container.add(title);
  if (sub) {
    sub.setY(box.subTop);
    container.add(sub);
  }

  if (opts.progress !== undefined) {
    const barW: number = w - box.pad * 2;
    container.add(uiProgress(scene, 0, box.footerTop, barW, opts.progress).objects);
  }

  // `setInteractive({})` ne définit AUCUNE zone de clic et fait planter Phaser au
  // premier pointeur (`input.hitAreaCallback is not a function`) : sans option de
  // curseur, il faut l'appeler sans argument du tout.
  const zone: Phaser.GameObjects.Zone = scene.add.zone(0, 0, w, h);
  if (opts.locked) zone.setInteractive();
  else zone.setInteractive({ cursor: CURSOR_POINT });

  // L'action part au RELÂCHEMENT, avec abandon au-delà d'un seuil de glissement —
  // comme `uiButton` et `uiLevelGrid`. Sur `pointerdown`, l'appui ouvrait l'écran
  // suivant et le relâchement retombait sur ce qui se trouvait dessous : appuyer
  // sur « Histoire » lançait directement le chapitre placé sous le doigt.
  const DRAG_SLOP: number = 10;
  let downAt: Vec2 | null = null;
  if (!opts.locked) {
    zone.on("pointerover", () => highlight.setVisible(true));
    zone.on("pointerout", () => { highlight.setVisible(false); downAt = null; });
  }
  zone.on("pointerdown", (p: Phaser.Input.Pointer) => { downAt = { x: p.x, y: p.y }; });
  zone.on("pointerup", (p: Phaser.Input.Pointer) => {
    const from: Vec2 | null = downAt;
    downAt = null;
    if (!from || Math.hypot(p.x - from.x, p.y - from.y) > DRAG_SLOP) return;
    opts.onSelect();
  });
  container.add(zone);

  return container;
}
