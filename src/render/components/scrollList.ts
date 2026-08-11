// ============================================================
// render/components/scrollList.ts — Fenêtre défilante verticale.
//
// Débloque tout écran dont le contenu peut dépasser la hauteur disponible
// (Bestiaire à mesure que des créatures s'ajoutent, Boutique, Chroniques).
// Avant : le contenu débordait hors écran, sans aucun recours.
// ============================================================

import Phaser from "phaser";
import { ACCENT } from "../theme";

/** Pure — décalage borné : 0 = haut, négatif = on descend dans le contenu.
 *  Exportée pour test unitaire (aucun DOM, aucun Phaser). */
export function clampScroll(offset: number, contentH: number, viewH: number): number {
  const max = Math.max(0, contentH - viewH);
  // `+ 0` normalise le -0 que produit Math.max(-0, …) : sans effet à l'affichage,
  // mais une position de défilement négative-zéro n'a aucun sens et fait échouer
  // toute comparaison stricte (Object.is distingue -0 de 0).
  return Math.min(0, Math.max(-max, offset)) + 0;
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
  const content = scene.add.container(0, y);

  const maskG = scene.make.graphics({}, false);
  maskG.fillStyle(0xffffff);
  maskG.fillRect(x, y, w, h);
  content.setMask(maskG.createGeometryMask());

  // Indicateur de défilement : la seule chose qui signale « il y a plus à voir ».
  const bar = scene.add.graphics().setDepth(5);
  content.parentContainer?.add(bar);

  let contentH = 0;
  let offset = 0;
  let dragging = false;
  let dragFrom = 0;
  let offsetFrom = 0;

  const inside = (wx: number, wy: number) => wx >= x && wx <= x + w && wy >= y && wy <= y + h;

  const redraw = () => {
    content.setY(y + offset);
    bar.clear();
    if (contentH <= h) return;
    const trackH = h - 8;
    const thumbH = Math.max(24, (h / contentH) * trackH);
    const t = -offset / (contentH - h); // 0 → 1
    const thumbY = y + 4 + t * (trackH - thumbH);
    bar.fillStyle(ACCENT.dimBorder, 0.35);
    bar.fillRoundedRect(x + w + 4, y + 4, 4, trackH, 2);
    bar.fillStyle(ACCENT.goldSoft, 0.75);
    bar.fillRoundedRect(x + w + 4, thumbY, 4, thumbH, 2);
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
