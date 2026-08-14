// ============================================================
// render/components/button.ts — Bouton nine-slice avec hover/press.
// ============================================================

import Phaser from "phaser";
import { UI_TINT } from "../theme";
import { CURSOR_POINT, FONT_DISPLAY } from "../ui";
import { touchSize } from "../viewport";
import type { Insets } from "../nineSlicePlan";
import type { Vec2 } from "../../core/types";
import {
  ensureUiSkinTextures, uiSkinActive, uiSkinFit, uiSkinInsets, uiSkinSetTexture,
  UI_SKIN_BTN, UI_SKIN_BTN_PRESS, UI_SKIN_BTN_PRIMARY, UI_SKIN_BTN_PRIMARY_PRESS,
} from "../uiSkin";

/** Hauteur minimale d'un bouton habillé par le pack : deux marges de nine-slice
 *  doivent y tenir. La pièce du pack fait 47 de haut et la texture est réduite de
 *  moitié (cf. `BTN_SCALE`), soit des marges de ~23 — d'où 48. */
const SKIN_MIN_H: number = 48;

/** Décalage vertical du libellé/icône d'un bouton habillé enfoncé. Cale sur
 *  l'écart de hauteur entre planche au repos et planche enfoncée du pack
 *  (52×52 contre 48×41, mesuré ADR-032) : sans lui le libellé reste centré sur
 *  la hauteur au repos et flotte au-dessus du creux. */
export const SKIN_PRESS_DY: number = 3;

/**
 * Bascule un bouton habillé du pack entre repos et enfoncé — texture
 * (`uiSkinSetTexture`) ET libellé/icône qui doit suivre la plaque plus plate.
 * Point d'entrée UNIQUE du « push » du pack, partagé par `uiButton` et la barre
 * du HUD (ADR-035) : la planche enfoncée porte déjà le signal d'appui telle que
 * dessinée par l'artiste ; composer une mise à l'échelle par-dessus le double
 * et désynchronise le libellé du creux qu'elle dessine.
 */
export function skinPressVisual(
  scene: Phaser.Scene, plate: Phaser.GameObjects.NineSlice, keyUp: string, keyDown: string,
  movers: readonly Phaser.GameObjects.Components.Transform[], baseY: readonly number[], on: boolean,
): void {
  uiSkinSetTexture(scene, plate, on ? keyDown : keyUp, plate.width, plate.height);
  movers.forEach((m, i) => { m.y = baseY[i]! + (on ? SKIN_PRESS_DY : 0); });
}

export interface UiButtonOpts {
  w: number;
  h?: number;
  /** true = bouton d'action principal (jaune Kenney, texte sombre). */
  gold?: boolean;
  fontSize?: number;
  color?: string;
  disabled?: boolean;
  /** Bouton-ICÔNE carré (bascule plein écran…) : il ne porte pas de libellé, donc
   *  ni le plancher de hauteur ni la marge horizontale de l'habillage ne
   *  s'appliquent — sinon un glyphe unique se retrouve dans une plaque de 66×56. */
  compact?: boolean;
  /**
   * Clé d'icône du registre (ADR-012), affichée à la place du libellé.
   *
   * Un glyphe Unicode tenait ce rôle (« ⛶ » / « ⤡ ») et c'était la même erreur
   * que les emojis : il est rendu par la police du SYSTÈME. Mesuré, « ⤡ » n'est
   * pas dans Cinzel, son encre occupe le bas-gauche de sa boîte de texte — et
   * `setOrigin(0.5)` centre la BOÎTE, pas l'encre. Le bouton paraissait de
   * travers une fois en plein écran. Une image du registre est centrée par
   * construction et identique d'un appareil à l'autre.
   */
  icon?: string;
}

export interface UiButton {
  container: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.NineSlice;
  /** Libellé, ou `null` sur un bouton-icône. */
  txt: Phaser.GameObjects.Text | null;
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
  const c: Phaser.GameObjects.Container = scene.add.container(x, y);

  // Boutons du pack Tiny Swords quand il est chargé : ils portent leur propre
  // gamme (bleu au repos, rouge pour l'action principale) et leur propre état
  // enfoncé. Pas de teinte de thème ici — `setTint` multiplie, une planche bleue
  // ne pourrait pas devenir dorée ; le repli Kenney, lui, est gris et se teinte.
  ensureUiSkinTextures(scene);
  const skin: boolean = uiSkinActive(scene);

  // Plancher tactile appliqué ici, une fois pour tous les appelants : une hauteur
  // écrite à la main reste confortable sur grand écran mais devient inatteignable
  // au doigt sur mobile (cf. `touchSize`, ADR-011).
  //
  // L'habillage du pack impose EN PLUS son propre plancher : deux marges de
  // nine-slice doivent tenir dans la plaque, sinon les coins se recouvrent.
  const h: number = touchSize(Math.max(opts.h ?? 36, skin ? SKIN_MIN_H : 0));
  const keyUp: string = skin
    ? (opts.gold ? UI_SKIN_BTN_PRIMARY : UI_SKIN_BTN)
    : (opts.gold ? "ui_btn_gold" : "ui_btn");
  const keyDown: string = skin
    ? (opts.gold ? UI_SKIN_BTN_PRIMARY_PRESS : UI_SKIN_BTN_PRESS)
    : keyUp;
  const i: Insets = skin ? uiSkinInsets(keyUp) : { left: 14, right: 14, top: 14, bottom: 16 };
  const inset: number = Math.max(i.left, i.right, i.top, i.bottom);

  const w0: number = touchSize(opts.w);
  const fit: Insets = skin ? uiSkinFit(scene, keyUp, w0, h) : i;
  const img: Phaser.GameObjects.NineSlice = scene.add.nineslice(0, 0, keyUp, undefined, w0, h, fit.left, fit.right, fit.top, fit.bottom);
  if (!skin && !opts.gold) img.setTint(UI_TINT.btn);

  // Icône du registre, ou libellé — jamais les deux.
  const icon: Phaser.GameObjects.Image | null = opts.icon
    ? scene.add.image(0, 0, opts.icon).setOrigin(0.5)
    : null;
  if (icon) icon.setDisplaySize(h * 0.42, h * 0.42);
  const txt: Phaser.GameObjects.Text | null = icon ? null : scene.add.text(0, -2, label, {
    fontSize: `${opts.fontSize ?? 15}px`,
    color: opts.color ?? (skin ? "#f7efe0" : opts.gold ? "#3a2c12" : "#f0e6d2"),
    fontFamily: FONT_DISPLAY,
  }).setOrigin(0.5);

  // Le bouton s'élargit pour contenir son libellé : la police est remontée sur
  // petit écran (ADR-015), et une largeur demandée en dur laissait le texte
  // dépasser de la plaque.
  // Marge horizontale : le contour du pack mange ~8 unités de CHAQUE côté, donc
  // 22 de marge totale collerait le libellé au cadre.
  // Plancher de LARGEUR, pas seulement de hauteur : deux coins de 37 doivent tenir
  // côte à côte, sinon Phaser les fait se chevaucher et la plaque se replie sur
  // elle-même. Un libellé court comme « x1 » passait à deux pixels près.
  const contenu: number = (txt?.width ?? 0) + (skin && !opts.compact ? 46 : 22);
  const w: number = Math.max(img.width, contenu, skin ? 2 * inset + 2 : 0);
  if (w !== img.width) img.setSize(w, h);
  c.add(img);
  c.add(icon ?? txt!);
  if (opts.disabled || !cb) {
    c.setAlpha(0.55);
    return { container: c, img, txt, w, h };
  }
  img.setInteractive({ cursor: CURSOR_POINT });
  // Survol : sur l'habillage du pack, la plaque porte déjà son propre reflet
  // clair — la teinter par-dessus la DÉLAVE au lieu de l'éclairer (relevé au
  // playtest). Le grossissement suffit à signaler le survol ; seul le repli
  // Kenney, uniformément gris, gagne à être teinté.
  const restTint: number = opts.gold ? 0xffffff : UI_TINT.btn;
  const hoverTint: number = opts.gold ? 0xfff2cf : 0xa68c64;
  img.on("pointerover", () => { c.setScale(1.04); if (!skin) img.setTint(hoverTint); });
  img.on("pointerout", () => { c.setScale(1); if (!skin) img.setTint(restTint); });

  // L'action part au RELÂCHEMENT, pas à l'appui : dans une liste défilante, un
  // glissement commencé sur un bouton déclencherait sinon son action avant même
  // que le doigt ait bougé. Au-delà de DRAG_SLOP, le geste est lu comme un
  // défilement et le clic est abandonné.
  const DRAG_SLOP: number = 10;
  let downAt: Vec2 | null = null;
  // État enfoncé : sur l'habillage du pack, la planche dessinée porte déjà le
  // signal (skinPressVisual) — un scale-squish ajouté par-dessus le doublerait.
  // Le squish reste le SEUL signal du repli Kenney, qui n'a pas de planche
  // enfoncée à afficher.
  const movers: readonly Phaser.GameObjects.Components.Transform[] = icon ? [icon] : txt ? [txt] : [];
  const baseY: readonly number[] = movers.map(m => m.y);
  img.on("pointerdown", (p: Phaser.Input.Pointer, _x: unknown, _y: unknown, ev?: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    downAt = { x: p.x, y: p.y };
    if (skin) skinPressVisual(scene, img, keyUp, keyDown, movers, baseY, true);
    else c.setScale(0.96);
  });
  img.on("pointerup", (p: Phaser.Input.Pointer, _x: unknown, _y: unknown, ev?: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    c.setScale(1.04);
    if (skin) skinPressVisual(scene, img, keyUp, keyDown, movers, baseY, false);
    const from: Vec2 | null = downAt;
    downAt = null;
    if (!from || Math.hypot(p.x - from.x, p.y - from.y) > DRAG_SLOP) return;
    cb();
  });
  img.on("pointerout", () => { downAt = null; if (skin) skinPressVisual(scene, img, keyUp, keyDown, movers, baseY, false); });
  return { container: c, img, txt, w, h };
}
