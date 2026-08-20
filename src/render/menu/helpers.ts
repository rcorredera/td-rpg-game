// ============================================================
// render/menu/helpers.ts — Constructions partagées par les écrans
// du Campement (cadre, en-tête, onglets, liste défilante, fiche de
// lore, rangée de boutique). Chaque écran reçoit un `MenuCtx`
// plutôt que d'agir sur `this` (ADR-034).
// ============================================================

import type Phaser from "phaser";
import { touchSize, viewport } from "../platform/viewport";
import type { Viewport } from "../platform/viewport";
import { UI_TINT } from "../theme/ui";
import {
  decorativeEdgeVisible, uiButton, uiListRow, uiPanel, uiPanelPad, uiScrollList, uiSectionHeader,
  type LayoutCursor, type RowState, type UiButton, type UiListRow, type UiScrollList, type UiSectionHeader,
} from "../components";
import { fitSquare } from "../assets/sprites";
import { CX, TXT } from "./theme";
import type { MenuCtx } from "./types";

/** Panneau Kenney (nine-slice teinté) + liseré d'état, ajouté au panel courant
 *  ou à `target` si fourni. */
export function box(
  ctx: MenuCtx, x: number, y: number, w: number, h: number, fill: number, stroke: number, r = 10,
  target?: Phaser.GameObjects.Container,
): Phaser.GameObjects.Graphics {
  // fill historique (0x22…/0x2b…) → teinte sombre ; on garde la sémantique des appels existants
  const t: Phaser.GameObjects.Container = target ?? ctx.panel;
  const tint: number = fill === 0x221b12 ? UI_TINT.panelDim : UI_TINT.panel;
  t.add(uiPanel(ctx.scene, x, y, w, h, tint));
  const g: Phaser.GameObjects.Graphics = ctx.scene.add.graphics();
  // Le panneau du pack porte son propre cadre : un liseré vectoriel par-dessus
  // le double (ADR-030). Même règle que `uiFramedPanel`, appliquée ici aussi —
  // ce helper sert les Chroniques et les fiches du Bestiaire.
  if (decorativeEdgeVisible(ctx.scene)) {
    g.lineStyle(1, stroke, 0.85); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
  }
  t.add(g);
  return g;
}

/** En-tête de sous-écran (retour + titre). Renvoie le Y à partir duquel empiler :
 *  les écrans ne doivent PLUS partir d'une constante, le bouton retour grandissant
 *  avec le plancher tactile (c'est ce qui masquait le titre du Bestiaire sur mobile). */
export function header(ctx: MenuCtx, title: string): number {
  // L'en-tête se place SOUS les chips de monnaie, mesurées : le bouton retour
  // grandit avec le plancher tactile et la police, et un Y en dur le faisait
  // remonter par-dessus « Éclats » (constaté sur appareil réel).
  const y: number = ctx.chipsBottomY + 12 + touchSize(30) / 2;
  const h: UiSectionHeader = uiSectionHeader(ctx.scene, { title, y, onBack: () => ctx.navigate("home") });
  ctx.panel.add(h.container);
  return h.bottom;
}

/** Barre d'onglets posée sous `top`. Renvoie le Y du BAS des onglets — leur
 *  hauteur suit le plancher tactile, elle ne peut pas être supposée. */
export function tabs<T extends string>(
  ctx: MenuCtx, top: number, defs: { id: T; label: string }[], active: T, onPick: (id: T) => void,
): number {
  const h: number = touchSize(32);
  const gap: number = 14;
  const cy: number = top + 10 + h / 2;
  // Les boutons s'élargissent pour contenir leur libellé (ADR-015) : on les crée
  // d'abord, puis on les positionne d'après leur largeur RÉELLE. Calculer les X
  // avant les faisait se toucher dès que la police est remontée.
  const made: UiButton[] = defs.map(t => uiButton(ctx.scene, 0, cy, t.label,
    { w: touchSize(130), h, gold: active === t.id, fontSize: 15 }, () => onPick(t.id)));
  const totalW: number = made.reduce((s, b) => s + b.w, 0) + gap * (made.length - 1);
  let x: number = CX - totalW / 2;
  made.forEach((b) => {
    b.container.setX(x + b.w / 2);
    x += b.w + gap;
    ctx.panel.add(b.container);
  });
  return cy + h / 2;
}

/** Zone défilante occupant tout l'espace restant sous `top`, jusqu'au bas de l'écran. */
export function scrollArea(ctx: MenuCtx, top: number): UiScrollList {
  const v: Viewport = viewport();
  const y: number = top + 10;
  const scroll: UiScrollList = uiScrollList(ctx.scene, { x: v.left, y, w: v.width, h: Math.max(80, v.bottom - y - 12) });
  ctx.panel.add(scroll.content);
  return scroll;
}

/** Portrait affiché à gauche d'une fiche de lore : le Bestiaire montre la
 *  créature, il ne la décrit pas seulement (ADR-016). `known: false` = silhouette. */
export interface LorePortrait { key: string; known: boolean }

/**
 * Fiche du Bestiaire : empile des lignes de texte et dimensionne son cadre
 * D'APRÈS leur hauteur mesurée. Les tailles de police sont remontées sur petit
 * écran (ADR-015), donc une hauteur de carte fixe faisait déborder le texte
 * hors du cadre — constaté sur appareil réel.
 */
export function lorePage(
  ctx: MenuCtx, cursor: LayoutCursor, c: Phaser.GameObjects.Container,
  lines: { text: string; size: number; color: string; wrap?: number }[],
  stroke: number, fill: number,
  portrait?: LorePortrait,
): void {
  // Géométrie DÉRIVÉE de la carte. `textX` valait `110 + artW` et la carte va de
  // 160 à 800 : le texte du Bestiaire commençait 50 unités HORS de son panneau,
  // un reste du monde 800×600 que le passage en 960×540 (ADR-027) n'avait pas
  // rattrapé. La marge, elle, vient de l'ornement du pack (ADR-030).
  const cardW: number = 640;
  const pad: number = Math.max(14, uiPanelPad(ctx.scene)), lead: number = 4;
  const cardLeft: number = CX - cardW / 2;
  const artW: number = portrait ? 76 : 0;
  const textX: number = cardLeft + pad + artW;
  const wrapMax: number = cardW - pad * 2 - artW;
  const objs: Phaser.GameObjects.Text[] = lines.map(l => ctx.scene.add.text(0, 0, l.text, {
    fontSize: `${l.size}px`, color: l.color, ...TXT, lineSpacing: 2,
    ...(l.wrap ? { wordWrap: { width: Math.min(l.wrap, wrapMax) } } : {}),
  }));
  const inner: number = objs.reduce((s, o, i) => s + o.height + (i ? lead : 0), 0);
  const h: number = Math.max(inner + pad * 2, portrait ? 78 : 0);
  const y: number = cursor.next(h, 10);
  box(ctx, CX, y, cardW, h, fill, stroke, 10, c);

  if (portrait) {
    const size: number = Math.min(62, h - 14);
    const img: Phaser.GameObjects.Image = ctx.scene.add.image(cardLeft + pad + artW / 2 - 8, y, portrait.key);
    // Proportions natives conservées (`fitSquare`, ADR-046) — cf. entities.ts.
    const { w: fitW, h: fitH } = fitSquare(img.width, img.height, size);
    img.setDisplaySize(fitW, fitH);
    // Créature non découverte : silhouette noire, comme un Pokédex — on voit la
    // forme sans révéler l'unité.
    if (!portrait.known) img.setTint(0x120d09);
    c.add(img);
  }

  let ty: number = y - h / 2 + pad;
  objs.forEach((o) => {
    o.setPosition(textX, ty);
    ty += o.height + lead;
    c.add(o);
  });
}

/** Rangée de boutique, empilée dans une zone défilante. Migrée sur `uiListRow`
 *  (kit ADR-007) : hauteur effective et états gérés par le composant. */
export function row(
  ctx: MenuCtx, cursor: LayoutCursor, c: Phaser.GameObjects.Container,
  title: string, desc: string, trailingLabel: string, trailingColor: string,
  cb: (() => void) | null, state: RowState = "normal",
): void {
  const r: UiListRow = uiListRow(ctx.scene, CX, 0, {
    w: 640, title, desc, state,
    trailing: cb ? { label: trailingLabel, onClick: cb } : { label: trailingLabel, color: trailingColor },
  });
  r.container.setY(cursor.next(r.h, 10));
  c.add(r.container);
}
