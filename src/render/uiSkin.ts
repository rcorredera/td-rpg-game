// ============================================================
// render/uiSkin.ts — Chrome d'UI composé depuis le pack Tiny Swords (CC0).
//
// Les planches du pack ne sont pas des nine-slice utilisables tels quels : ce
// sont des grilles 3×3 de pièces SÉPARÉES, entourées de vide transparent, alors
// que `scene.add.nineslice` exige une texture contiguë. On les recompose donc
// une fois sur canvas, comme `terrain.ts` génère le sol.
//
// Ce fichier ne fait plus que DEUX choses : mesurer la planche, et peindre le
// plan renvoyé par `nineSlicePlan.ts`. Toute la géométrie — donc tout ce qui
// peut se tromper — vit dans ce module pur, et y est testée.
//
// ⚠ Base CLAIRE obligatoire pour ce qui doit se teinter : `setTint` MULTIPLIE
// (piège récurrent du projet). Le parchemin crème vire donc vers n'importe quel
// thème d'ADR-026 ; les boutons, eux, sont colorés dans l'art et assumés tels.
// ============================================================

// `import TYPE` et non `import` : ce module est atteint depuis `components/`,
// et importer Phaser comme VALEUR y lit `window` dès le chargement, ce qui casse
// les tests unitaires purs sous Vitest (cf. `.ai/pitfalls.md`).
import type Phaser from "phaser";
import { flattenStretched } from "./nineSliceFlatten";
import {
  planNineSlice, planStrip,
  type Insets, type PieceRect, type SheetFrame, type StripFrame,
} from "./nineSlicePlan";

const SRC = "assets/tiny-swords/ui";

/** `Phaser.Textures.FilterMode.NEAREST`, en littéral pour la même raison :
 *  le nommer passerait par le namespace Phaser, donc par un import de valeur. */
const NEAREST = 1 as Phaser.Textures.FilterMode;

interface Sheet {
  file: string;
  /** Cellules de la grille, `[origine, taille]` par colonne puis par rangée. */
  cols: readonly [number, number, number];
  rows: readonly [number, number, number];
  cell: number;
  /** Marge de nine-slice visée. Elle borne la taille du plus petit élément
   *  habillé : deux marges doivent y tenir. */
  inset: number;
}

/** Grille commune aux planches carrées du pack : pièces de 64 aux offsets 0/128/256. */
const GRID = { cols: [0, 128, 256], rows: [0, 128, 256], cell: 64 } as const;

const SHEETS = {
  // Panneau OUVRAGÉ du pack — ardoise sombre et volutes dorées aux angles. C'est
  // lui l'habillage du jeu, pas le parchemin crème : `setTint` MULTIPLIE, donc
  // teindre un parchemin clair vers l'ardoise des thèmes (ADR-026) n'en gardait
  // que la forme du bord et jetait toute la matière — les boutons, eux, gardaient
  // leur art natif, d'où deux factures visuelles dans un même écran.
  // Marge 22 et non 16 : la volute d'angle s'étend jusqu'à 17 px, la rogner à 16
  // la couperait en deux. `paper-regular.png` reste en réserve pour les pages de
  // lore, où un parchemin a du sens.
  ts_panel: { file: "paper-special.png", ...GRID, inset: 22 },
  ts_btn: { file: "btn-big-blue.png", ...GRID, inset: 22 },
  ts_btn_press: { file: "btn-big-blue-pressed.png", ...GRID, inset: 22 },
  ts_btn_primary: { file: "btn-big-red.png", ...GRID, inset: 22 },
  ts_btn_primary_press: { file: "btn-big-red-pressed.png", ...GRID, inset: 22 },
} satisfies Record<string, Sheet>;

/** Bande à trois tranches : une seule rangée de la planche, deux embouts et un corps. */
interface StripSheet {
  file: string;
  cols: readonly [number, number, number];
  /** Ordonnée de la rangée à prélever. */
  row: number;
  cell: number;
}

const STRIPS = {
  ts_bar: { file: "bar-small-base.png", cols: [0, 128, 256], row: 0, cell: 64 },
} satisfies Record<string, StripSheet>;

export const UI_SKIN_BAR = "ts_bar" satisfies keyof typeof STRIPS;

export type UiSkinKey = keyof typeof SHEETS;

export const UI_SKIN_PANEL = "ts_panel" satisfies UiSkinKey;
export const UI_SKIN_BTN = "ts_btn" satisfies UiSkinKey;
export const UI_SKIN_BTN_PRESS = "ts_btn_press" satisfies UiSkinKey;
export const UI_SKIN_BTN_PRIMARY = "ts_btn_primary" satisfies UiSkinKey;
export const UI_SKIN_BTN_PRIMARY_PRESS = "ts_btn_primary_press" satisfies UiSkinKey;

/** Marges réelles, renseignées à la composition. */
const INSETS = new Map<string, Insets>();

/** Marges d'une texture composée. Repli sur la valeur visée tant qu'elle n'est
 *  pas encore composée (la planche peut ne pas être chargée). */
export function uiSkinInsets(key: string): Insets {
  const known = INSETS.get(key);
  if (known) return known;
  const want = (SHEETS as Record<string, Sheet>)[key]?.inset ?? 16;
  return { left: want, right: want, top: want, bottom: want };
}

/** Plus petite marge : sert de plancher aux dimensions d'un élément habillé. */
export function uiSkinInset(key: string): number {
  const i = uiSkinInsets(key);
  return Math.max(i.left, i.right, i.top, i.bottom);
}

/** Le chrome du pack est-il disponible ? */
export function uiSkinActive(scene: Phaser.Scene): boolean {
  return scene.textures.exists(UI_SKIN_PANEL);
}

/** À appeler dans le `preload()` de chaque scène affichant du chrome d'UI. */
export function preloadUiSkin(scene: Phaser.Scene): void {
  for (const [key, s] of Object.entries({ ...SHEETS, ...STRIPS })) {
    scene.load.image(`${key}__sheet`, `${SRC}/${s.file}`);
  }
}

interface Box { x: number; y: number; w: number; h: number }

/** Bornes opaques dans un rectangle de la planche, ou `null` si tout est vide. */
function opaqueBounds(
  data: Uint8ClampedArray, sheetW: number, x0: number, y0: number, size: number,
): Box | null {
  let minX = x0 + size, minY = y0 + size, maxX = x0 - 1, maxY = y0 - 1;
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      if (data[(y * sheetW + x) * 4 + 3]! <= 40) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < minX ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Profondeur du dessin d'angle : distance en diagonale, depuis l'angle de l'art,
 * jusqu'au DERNIER pixel qui n'est pas la couleur de remplissage.
 *
 * C'est la mesure qui décide de tout (cf. `planNineSlice`) : 3 px sur le
 * parchemin — donc rognable sans dommage — 18 sur le panneau ouvragé, dont
 * l'angle porte une volute dorée, 37 sur les boutons.
 *
 * ⚠ Le DERNIER pixel différent, et non le premier pixel de remplissage. La
 * première version s'arrêtait au premier retour au remplissage et rendait 3 sur
 * le panneau ouvragé, dont la volute est posée PLUS LOIN dans la pièce (entre 9
 * et 17 px de l'angle, mesuré) : le plan aurait rogné en plein milieu de
 * l'ornement. Un ornement d'angle n'est pas forcément collé à l'angle.
 *
 * La diagonale, et non la couronne à distance `k` : un liseré de bord court sur
 * toute la longueur de la pièce, donc toute couronne au-delà du liseré en
 * contient — la profondeur mesurée vaudrait toujours la pièce entière.
 */
function cornerDetailDepth(
  data: Uint8ClampedArray, sheetW: number, corner: Box, fill: readonly [number, number, number],
): number {
  const proche = (i: number) =>
    Math.abs(data[i]! - fill[0]) + Math.abs(data[i + 1]! - fill[1]) + Math.abs(data[i + 2]! - fill[2]) < 60;
  const max = Math.min(corner.w, corner.h);
  let depth = 0;
  for (let k = 0; k < max; k++) {
    const i = ((corner.y + k) * sheetW + (corner.x + k)) * 4;
    if (data[i + 3]! > 40 && !proche(i)) depth = k + 1;
  }
  return depth;
}

/** Image source d'une planche préchargée, ou `null` si elle n'est pas là. */
function sheetPixels(
  scene: Phaser.Scene, key: string,
): { img: HTMLImageElement; data: Uint8ClampedArray } | null {
  const sheetKey = `${key}__sheet`;
  if (!scene.textures.exists(sheetKey)) return null;
  const img = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement;
  const probe = document.createElement("canvas");
  probe.width = img.width;
  probe.height = img.height;
  const ctx = probe.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return { img, data: ctx.getImageData(0, 0, img.width, img.height).data };
}

/**
 * Peint un plan sur une texture de canvas et l'enregistre sous `key`.
 *
 * Assemblage à taille réelle PUIS réduction de l'image entière : réduire pièce
 * par pièce désaligne les raccords aux arrondis.
 */
function paintPlan(
  scene: Phaser.Scene, key: string, img: HTMLImageElement,
  plan: { fullW: number; fullH: number; rects: PieceRect[] }, scale: number, insets: Insets,
): void {
  const full = document.createElement("canvas");
  full.width = plan.fullW;
  full.height = plan.fullH;
  const fctx = full.getContext("2d");
  if (!fctx) return;
  fctx.imageSmoothingEnabled = false;
  for (const q of plan.rects) fctx.drawImage(img, q.sx, q.sy, q.sw, q.sh, q.dx, q.dy, q.sw, q.sh);

  // Les pièces que le slice ÉTIRE doivent être constantes le long de leur axe,
  // sinon le grain de la planche devient une traînée (cf. `nineSliceFlatten.ts`).
  const assemble = fctx.getImageData(0, 0, plan.fullW, plan.fullH);
  flattenStretched({ w: plan.fullW, h: plan.fullH, data: assemble.data }, plan.rects);
  fctx.putImageData(assemble, 0, 0);

  const outW = Math.max(1, Math.round(plan.fullW * scale));
  const outH = Math.max(1, Math.round(plan.fullH * scale));
  const tex = scene.textures.createCanvas(key, outW, outH);
  if (!tex) return;
  const ctx = tex.getContext();
  // Lissage à la RÉDUCTION seulement : sans lui, un facteur 0,5 jetterait une
  // ligne sur deux et hacherait le contour. L'affichage, lui, reste NEAREST.
  ctx.imageSmoothingEnabled = scale !== 1;
  ctx.drawImage(full, 0, 0, plan.fullW, plan.fullH, 0, 0, outW, outH);

  INSETS.set(key, insets);
  tex.refresh();
  tex.setFilter(NEAREST);
}

/** Recompose les bandes à trois tranches (jauges, rubans). */
function ensureStripTextures(scene: Phaser.Scene): void {
  for (const [key, strip] of Object.entries(STRIPS) as [string, StripSheet][]) {
    if (scene.textures.exists(key)) continue;
    const src = sheetPixels(scene, key);
    if (!src) continue;

    const piece = strip.cols.map(x => opaqueBounds(src.data, src.img.width, x, strip.row, strip.cell));
    if (piece.some(p => p === null)) continue;
    const found = piece as Box[];
    // Hauteur COMMUNE aux trois pièces : un embout plus haut que le corps
    // décalerait le raccord d'un pixel ou deux, très visible sur une jauge fine.
    const frame: StripFrame = {
      left: [found[0]!.x, found[1]!.x, found[2]!.x],
      right: [found[0]!.x + found[0]!.w, found[1]!.x + found[1]!.w, found[2]!.x + found[2]!.w],
      top: Math.min(...found.map(b => b.y)),
      bottom: Math.max(...found.map(b => b.y + b.h)),
    };
    const plan = planStrip(frame);
    paintPlan(scene, key, src.img, plan, 1, plan.insets);
  }
}

/** Recompose les nine-slice. Idempotent : les composants l'appellent à chaque
 *  usage, le premier fait le travail et les suivants sortent aussitôt. */
export function ensureUiSkinTextures(scene: Phaser.Scene): void {
  ensureStripTextures(scene);
  for (const [key, sheet] of Object.entries(SHEETS) as [string, Sheet][]) {
    if (scene.textures.exists(key)) continue;
    const src = sheetPixels(scene, key);
    if (!src) continue;
    const { img, data } = src;

    const piece: (Box | null)[][] = sheet.rows.map(y =>
      sheet.cols.map(x => opaqueBounds(data, img.width, x, y, sheet.cell)));
    const corner = piece[0]![0];
    const centre = piece[1]![1];
    if (!corner || !centre) continue;

    // Repère COMMUN par rangée et par colonne : les pièces d'une même rangée
    // n'ont pas toutes la même hauteur, et sans repère commun le contour se
    // décale de quelques pixels entre le coin et le bord.
    const frame: SheetFrame = {
      left: [0, 1, 2].map(c => Math.min(...[0, 1, 2].map(r => piece[r]![c]?.x ?? Infinity))) as never,
      right: [0, 1, 2].map(c => Math.max(...[0, 1, 2].map(r => {
        const b = piece[r]![c];
        return b ? b.x + b.w : -Infinity;
      }))) as never,
      top: [0, 1, 2].map(r => Math.min(...piece[r]!.map(b => b?.y ?? Infinity))) as never,
      bottom: [0, 1, 2].map(r => Math.max(...piece[r]!.map(b => b ? b.y + b.h : -Infinity))) as never,
    };

    const ci = ((centre.y + (centre.h >> 1)) * img.width + centre.x + (centre.w >> 1)) * 4;
    const fill = [data[ci]!, data[ci + 1]!, data[ci + 2]!] as const;
    const plan = planNineSlice(frame, cornerDetailDepth(data, img.width, corner, fill), sheet.inset);

    paintPlan(scene, key, img, plan, plan.scale, plan.insets);
  }
}
