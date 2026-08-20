// ============================================================
// render/components/scrollList.ts — Fenêtre défilante verticale.
//
// Débloque tout écran dont le contenu peut dépasser la hauteur disponible
// (Bestiaire à mesure que des créatures s'ajoutent, Boutique, Chroniques).
// Avant : le contenu débordait hors écran, sans aucun recours.
// ============================================================

import Phaser from "phaser";
import { ACCENT } from "../theme/theme";
import { ICON } from "../theme/icons";

/** Pure — décalage borné : 0 = haut, négatif = on descend dans le contenu.
 *  Exportée pour test unitaire (aucun DOM, aucun Phaser). */
export function clampScroll(offset: number, contentH: number, viewH: number): number {
  const max: number = Math.max(0, contentH - viewH);
  // `+ 0` normalise le -0 que produit Math.max(-0, …) : sans effet à l'affichage,
  // mais une position de défilement négative-zéro n'a aucun sens et fait échouer
  // toute comparaison stricte (Object.is distingue -0 de 0).
  return Math.min(0, Math.max(-max, offset)) + 0;
}

/** Tolérance sous laquelle un reste de défilement ne mérite plus d'être signalé. */
const RESTE_MIN: number = 0.5;

export interface ScrollHints {
  /** Du contenu reste au-dessus / en dessous de la fenêtre. */
  up: boolean;
  down: boolean;
}

/**
 * Pure — y a-t-il encore à voir au-dessus, en dessous ?
 *
 * C'est la seule information dont l'affordance a besoin, et la sortir du rendu
 * la rend vérifiable : « la liste défile » ne doit pas se déduire d'une capture.
 */
export function scrollHints(offset: number, contentH: number, viewH: number): ScrollHints {
  const max: number = Math.max(0, contentH - viewH);
  const o: number = clampScroll(offset, contentH, viewH);
  return { up: -o > RESTE_MIN, down: max + o > RESTE_MIN };
}

export interface Rect { x: number; y: number; w: number; h: number }

/** Largeur de la gouttière de défilement et sa marge au bord de la fenêtre. */
const BAR_W: number = 5;
const BAR_PAD: number = 4;

/**
 * Pure — gouttière et curseur de défilement, `null` s'il n'y a rien à faire
 * défiler.
 *
 * Les deux rectangles sont TOUJOURS à l'intérieur de `view`. C'est la garantie
 * qui manquait : la barre se dessinait à `x + w + 4`, or la fenêtre du campement
 * occupe toute la largeur de l'écran — l'indicateur tombait donc 4 unités
 * DEHORS. Aucun défilement n'était signalé nulle part dans le jeu.
 */
export interface ScrollBarGeometry { track: Rect; thumb: Rect }

export function scrollBar(view: Rect, contentH: number, offset: number): ScrollBarGeometry | null {
  if (contentH <= view.h) return null;
  const x: number = view.x + view.w - BAR_PAD - BAR_W;
  const trackH: number = Math.max(0, view.h - 2 * BAR_PAD);
  const thumbH: number = Math.min(trackH, Math.max(24, (view.h / contentH) * trackH));
  const t: number = -clampScroll(offset, contentH, view.h) / (contentH - view.h); // 0 → 1
  return {
    track: { x, y: view.y + BAR_PAD, w: BAR_W, h: trackH },
    thumb: { x, y: view.y + BAR_PAD + t * (trackH - thumbH), w: BAR_W, h: thumbH },
  };
}

export interface UiScrollListOpts {
  /** Fenêtre visible, en coordonnées logiques (coin haut-gauche + taille). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UiScrollList {
  /** Container du contenu : y = 0 correspond au haut de la fenêtre. */
  content: Phaser.GameObjects.Container;
  /** Déclare la hauteur totale du contenu — active le défilement s'il dépasse. */
  setContentHeight(px: number): void;
}

/**
 * Crée une fenêtre défilante. Le contenu est masqué aux bords de la fenêtre, et
 * se déplace au glisser (tactile) ou à la molette (bureau).
 *
 * Les évènements sont écoutés au niveau de la SCÈNE, pas via une zone posée
 * sur la fenêtre : une zone au-dessus du contenu intercepterait les clics des
 * boutons, une zone en dessous ne verrait jamais les glissements qui commencent
 * sur un bouton. Le filtrage se fait donc par coordonnées monde.
 */
export function uiScrollList(scene: Phaser.Scene, opts: UiScrollListOpts): UiScrollList {
  const { x, y, w, h } = opts;
  // Le contenu est ancré en X=0 : ses enfants gardent donc leurs coordonnées X
  // absolues (le repère habituel des écrans), seul le Y devient relatif au haut
  // de la fenêtre. La fenêtre de masque, elle, est décrite séparément.
  const content: Phaser.GameObjects.Container = scene.add.container(0, y);

  const maskG: Phaser.GameObjects.Graphics = scene.make.graphics({}, false);
  maskG.fillStyle(0xffffff);
  maskG.fillRect(x, y, w, h);
  content.setMask(maskG.createGeometryMask());

  // Indicateur de défilement : la seule chose qui signale « il y a plus à voir ».
  const bar: Phaser.GameObjects.Graphics = scene.add.graphics().setDepth(5);
  content.parentContainer?.add(bar);

  // Chevrons. Sur mobile, une gouttière de 5 unités ne suffit pas à faire
  // comprendre qu'une liste défile — retour direct du PO. Un chevron posé sur le
  // bord vers lequel il reste du contenu, lui, se lit sans apprentissage.
  const chevron = (bas: boolean): Phaser.GameObjects.Image => {
    const taille: number = 18;
    const img: Phaser.GameObjects.Image = scene.add.image(
      x + w / 2, bas ? y + h - taille / 2 - 2 : y + taille / 2 + 2, ICON.chevronDown,
    ).setDisplaySize(taille, taille).setTint(ACCENT.goldSoft).setAlpha(0.8).setDepth(6).setVisible(false);
    if (!bas) img.setFlipY(true);
    content.parentContainer?.add(img);
    return img;
  };
  const chevronBas: Phaser.GameObjects.Image = chevron(true);
  const chevronHaut: Phaser.GameObjects.Image = chevron(false);
  // Un léger va-et-vient : c'est le mouvement qui attire l'œil, pas la forme.
  scene.tweens.add({
    targets: [chevronBas, chevronHaut], y: "+=3", duration: 700,
    yoyo: true, repeat: -1, ease: "Sine.easeInOut",
  });

  let contentH: number = 0;
  let offset: number = 0;
  let dragging: boolean = false;
  let dragFrom: number = 0;
  let offsetFrom: number = 0;

  const inside = (wx: number, wy: number) => wx >= x && wx <= x + w && wy >= y && wy <= y + h;

  const redraw = () => {
    content.setY(y + offset);
    bar.clear();
    const hints: ScrollHints = scrollHints(offset, contentH, h);
    chevronBas.setVisible(hints.down);
    chevronHaut.setVisible(hints.up);
    const g: ScrollBarGeometry | null = scrollBar({ x, y, w, h }, contentH, offset);
    if (!g) return;
    bar.fillStyle(ACCENT.dimBorder, 0.35);
    bar.fillRoundedRect(g.track.x, g.track.y, g.track.w, g.track.h, 2);
    bar.fillStyle(ACCENT.goldSoft, 0.85);
    bar.fillRoundedRect(g.thumb.x, g.thumb.y, g.thumb.w, g.thumb.h, 2);
  };

  const onDown = (p: Phaser.Input.Pointer) => {
    if (!inside(p.worldX, p.worldY)) return;
    dragging = true;
    dragFrom = p.worldY;
    offsetFrom = offset;
  };
  const onMove = (p: Phaser.Input.Pointer) => {
    if (!dragging) return;
    offset = clampScroll(offsetFrom + (p.worldY - dragFrom), contentH, h);
    redraw();
  };
  const onUp = () => { dragging = false; };
  const onWheel = (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    if (!inside(p.worldX, p.worldY)) return;
    offset = clampScroll(offset - dy * 0.5, contentH, h);
    redraw();
  };

  scene.input.on("pointerdown", onDown);
  scene.input.on("pointermove", onMove);
  scene.input.on("pointerup", onUp);
  scene.input.on("wheel", onWheel);

  // Le panneau parent est détruit à chaque changement d'écran : sans ce retrait,
  // les écouteurs s'empileraient et feraient défiler des listes déjà mortes.
  // Littéral "destroy", PAS `Phaser.GameObjects.Events.DESTROY` : y toucher comme
  // valeur charge Phaser, qui lit `window` à l'import et casse `clampScroll` sous
  // Vitest (cf. .ai/pitfalls.md — piège déjà rencontré sur ui.ts).
  content.once("destroy", () => {
    scene.input.off("pointerdown", onDown);
    scene.input.off("pointermove", onMove);
    scene.input.off("pointerup", onUp);
    scene.input.off("wheel", onWheel);
    maskG.destroy();
    bar.destroy();
    // Le tween cible les chevrons : le laisser tourner sur des objets détruits
    // lève à la frame suivante.
    scene.tweens.killTweensOf([chevronBas, chevronHaut]);
    chevronBas.destroy();
    chevronHaut.destroy();
  });

  return {
    content,
    setContentHeight(px: number) {
      contentH = px;
      offset = clampScroll(offset, contentH, h);
      redraw();
    },
  };
}
