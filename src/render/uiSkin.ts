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
import type { NineSlicePlan, StripPlan } from "./nineSlicePlan";
import {
  planNineSlice, planStrip, sliceInsets,
  type Insets, type PieceRect, type SheetFrame, type StripFrame,
} from "./nineSlicePlan";

const SRC: string = "assets/tiny-swords/ui";

/** `Phaser.Textures.FilterMode.NEAREST`, en littéral pour la même raison :
 *  le nommer passerait par le namespace Phaser, donc par un import de valeur. */
const NEAREST: Phaser.Textures.FilterMode = 1 as Phaser.Textures.FilterMode;

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
// eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
const GRID = { cols: [0, 128, 256], rows: [0, 128, 256], cell: 64 } as const;

// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
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

/**
 * Rangées de `ribbons-small.png` : cinq couleurs, chacune en deux variantes —
 * en pointe (rangée paire) puis arrondie (rangée impaire).
 *
 * On prend l'ARRONDIE. Mesurée, la variante en pointe fait 60 de haut avec des
 * embouts de 62 : sur une tuile secondaire de 167, elle ne laissait plus la place
 * à l'emblème. L'arrondie est une plaque de libellé compacte, ce qu'on cherche.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
const RIBBON_ROW = { teal: 64, red: 192, yellow: 320, purple: 448, grey: 576 } as const;

// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
const STRIPS = {
  ts_bar: { file: "bar-small-base.png", cols: [0, 128, 256], row: 0, cell: 64 },
  ts_bar_big: { file: "bar-big-base.png", cols: [0, 128, 256], row: 0, cell: 64 },
  // Rubans de titre. Le teal et le rouge sont EXACTEMENT ceux des boutons du pack :
  // c'est ce qui raccroche visuellement les tuiles aux commandes, ce qui manquait.
  ts_ribbon: { file: "ribbons-small.png", cols: [0, 128, 256], row: RIBBON_ROW.teal, cell: 64 },
  ts_ribbon_rift: { file: "ribbons-small.png", cols: [0, 128, 256], row: RIBBON_ROW.purple, cell: 64 },
  ts_ribbon_off: { file: "ribbons-small.png", cols: [0, 128, 256], row: RIBBON_ROW.grey, cell: 64 },
} satisfies Record<string, StripSheet>;

// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_BAR = "ts_bar" satisfies keyof typeof STRIPS;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_BAR_BIG = "ts_bar_big" satisfies keyof typeof STRIPS;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_RIBBON = "ts_ribbon" satisfies keyof typeof STRIPS;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_RIBBON_RIFT = "ts_ribbon_rift" satisfies keyof typeof STRIPS;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_RIBBON_OFF = "ts_ribbon_off" satisfies keyof typeof STRIPS;

export type UiSkinKey = keyof typeof SHEETS;

// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_PANEL = "ts_panel" satisfies UiSkinKey;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_BTN = "ts_btn" satisfies UiSkinKey;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_BTN_PRESS = "ts_btn_press" satisfies UiSkinKey;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_BTN_PRIMARY = "ts_btn_primary" satisfies UiSkinKey;
// eslint-disable-next-line @typescript-eslint/typedef -- `satisfies` garde un type littéral précis ; l'annoter le réélargirait.
export const UI_SKIN_BTN_PRIMARY_PRESS = "ts_btn_primary_press" satisfies UiSkinKey;

/** Marges réelles, renseignées à la composition. */
const INSETS: Map<string, Insets> = new Map<string, Insets>();

/**
 * Marges SÛRES d'une bande : distance depuis chaque bord jusqu'au corps plat.
 *
 * Distinctes des marges de découpe. Sur un ruban, l'embout mesure 61 px de large
 * pour une texture de 130 — mais l'essentiel de ces 61 px est déjà le corps du
 * ruban ; seuls les premiers pixels portent l'arrondi. Dimensionner un libellé
 * sur la marge de DÉCOUPE réserverait 122 px pour rien et forcerait des rubans
 * démesurés ; le dimensionner « au jugé » ramènerait le texte sur l'arrondi.
 */
export interface SafeInsets { left: number; right: number }

const SAFE: Map<string, SafeInsets> = new Map();

/** Marge sûre pour poser un libellé sur une bande. */
export function uiSkinSafeInsets(key: string): SafeInsets {
  return SAFE.get(key) ?? { left: 8, right: 8 };
}

/** Marges d'une texture composée. Repli sur la valeur visée tant qu'elle n'est
 *  pas encore composée (la planche peut ne pas être chargée). */
export function uiSkinInsets(key: string): Insets {
  const known: Insets | undefined = INSETS.get(key);
  if (known) return known;
  const want: number = (SHEETS as Record<string, Sheet>)[key]?.inset ?? 16;
  return { left: want, right: want, top: want, bottom: want };
}

/** Plus petite marge : sert de plancher aux dimensions d'un élément habillé. */
export function uiSkinInset(key: string): number {
  const i: Insets = uiSkinInsets(key);
  return Math.max(i.left, i.right, i.top, i.bottom);
}

/**
 * Marges à appliquer pour habiller une boîte `w`×`h` avec `key` — bornées par la
 * boîte ET par la texture (cf. `sliceInsets`).
 */
export function uiSkinFit(scene: Phaser.Scene, key: string, w: number, h: number): Insets {
  const insets: Insets = uiSkinInsets(key);
  if (!scene.textures.exists(key)) return sliceInsets(insets, { w, h }, { w, h });
  const src: HTMLImageElement | HTMLCanvasElement | Phaser.GameObjects.RenderTexture = scene.textures.get(key).getSourceImage();
  return sliceInsets(insets, { w, h }, { w: src.width, h: src.height });
}

/**
 * Change la texture d'un nine-slice habillé — point d'entrée UNIQUE.
 *
 * `setTexture` seul est un piège : Phaser garde les marges de découpe de
 * l'ANCIENNE texture. Or les planches du pack ne composent pas toutes à la même
 * taille — un bouton enfoncé est plus plat que le même bouton au repos — et
 * l'écart suffit à faire se recouvrir les tranches. Constaté au playtest : tout
 * bouton virait au noir sous le doigt.
 */
export function uiSkinSetTexture(
  scene: Phaser.Scene, nine: Phaser.GameObjects.NineSlice, key: string, w: number, h: number,
): void {
  nine.setTexture(key);
  const i: Insets = uiSkinFit(scene, key, w, h);
  nine.setSlices(w, h, i.left, i.right, i.top, i.bottom);
}

/** Le chrome du pack est-il disponible ? */
export function uiSkinActive(scene: Phaser.Scene): boolean {
  return scene.textures.exists(UI_SKIN_PANEL);
}

/** À appeler dans le `preload()` de chaque scène affichant du chrome d'UI. */
export function preloadUiSkin(scene: Phaser.Scene): void {
  // Par FICHIER et non par clé : les trois rubans sortent de la même planche,
  // à trois rangées différentes.
  const fichiers: Set<string> = new Set(Object.values({ ...SHEETS, ...STRIPS }).map(s => s.file));
  for (const f of fichiers) scene.load.image(sheetKey(f), `${SRC}/${f}`);
}

/** Clé de texture de la planche BRUTE, dérivée de son nom de fichier. */
function sheetKey(file: string): string {
  return `__sheet_${file}`;
}

interface Box { x: number; y: number; w: number; h: number }

type Rgb = readonly [number, number, number];

function pixelAt(data: Uint8ClampedArray, sheetW: number, x: number, y: number): Rgb {
  const i: number = (y * sheetW + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

/** Même couleur à la tolérance près — le pixel art du pack a un léger grain. */
function sameColor(a: Rgb, b: Rgb): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) < 60;
}

/** Bornes opaques dans un rectangle de la planche, ou `null` si tout est vide. */
function opaqueBounds(
  data: Uint8ClampedArray, sheetW: number, x0: number, y0: number, size: number,
): Box | null {
  let minX: number = x0 + size, minY: number = y0 + size, maxX: number = x0 - 1, maxY: number = y0 - 1;
  for (let y: number = y0; y < y0 + size; y++) {
    for (let x: number = x0; x < x0 + size; x++) {
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
  const max: number = Math.min(corner.w, corner.h);
  let depth: number = 0;
  for (let k: number = 0; k < max; k++) {
    const i: number = ((corner.y + k) * sheetW + (corner.x + k)) * 4;
    if (data[i + 3]! > 40 && !proche(i)) depth = k + 1;
  }
  return depth;
}

/** Image source d'une planche préchargée, ou `null` si elle n'est pas là. */
interface SheetPixels { img: HTMLImageElement; data: Uint8ClampedArray }

function sheetPixels(
  scene: Phaser.Scene, file: string,
): SheetPixels | null {
  const k: string = sheetKey(file);
  if (!scene.textures.exists(k)) return null;
  const img: HTMLImageElement = scene.textures.get(k).getSourceImage() as HTMLImageElement;
  const probe: HTMLCanvasElement = document.createElement("canvas");
  probe.width = img.width;
  probe.height = img.height;
  const ctx: CanvasRenderingContext2D | null = probe.getContext("2d");
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
  const full: HTMLCanvasElement = document.createElement("canvas");
  full.width = plan.fullW;
  full.height = plan.fullH;
  const fctx: CanvasRenderingContext2D | null = full.getContext("2d");
  if (!fctx) return;
  fctx.imageSmoothingEnabled = false;
  for (const q of plan.rects) fctx.drawImage(img, q.sx, q.sy, q.sw, q.sh, q.dx, q.dy, q.sw, q.sh);

  // Les pièces que le slice ÉTIRE doivent être constantes le long de leur axe,
  // sinon le grain de la planche devient une traînée (cf. `nineSliceFlatten.ts`).
  const assemble: ImageData = fctx.getImageData(0, 0, plan.fullW, plan.fullH);
  flattenStretched({ w: plan.fullW, h: plan.fullH, data: assemble.data }, plan.rects);
  fctx.putImageData(assemble, 0, 0);

  const outW: number = Math.max(1, Math.round(plan.fullW * scale));
  const outH: number = Math.max(1, Math.round(plan.fullH * scale));
  const tex: Phaser.Textures.CanvasTexture | null = scene.textures.createCanvas(key, outW, outH);
  if (!tex) return;
  const ctx: CanvasRenderingContext2D = tex.getContext();
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
    const src: SheetPixels | null = sheetPixels(scene, strip.file);
    if (!src) continue;

    const piece: (Box | null)[] = strip.cols.map(x => opaqueBounds(src.data, src.img.width, x, strip.row, strip.cell));
    if (piece.some(p => p === null)) continue;
    const found: Box[] = piece as Box[];
    // Hauteur COMMUNE aux trois pièces : un embout plus haut que le corps
    // décalerait le raccord d'un pixel ou deux, très visible sur une jauge fine.
    const frame: StripFrame = {
      left: [found[0]!.x, found[1]!.x, found[2]!.x],
      right: [found[0]!.x + found[0]!.w, found[1]!.x + found[1]!.w, found[2]!.x + found[2]!.w],
      top: Math.min(...found.map(b => b.y)),
      bottom: Math.max(...found.map(b => b.y + b.h)),
    };
    const plan: StripPlan = planStrip(frame);
    paintPlan(scene, key, src.img, plan, 1, plan.insets);

    // Marge SÛRE, mesurée sur la rangée médiane : on avance depuis chaque bord
    // jusqu'à retomber sur la couleur du corps. C'est là que le libellé peut se
    // poser sans mordre l'arrondi de l'embout.
    const ligne: number = Math.round((frame.top + frame.bottom) / 2);
    const corps: Rgb = pixelAt(src.data, src.img.width, Math.round((frame.left[1]! + frame.right[1]!) / 2), ligne);
    const depuis = (x0: number, pas: number, max: number): number => {
      for (let k: number = 0; k < max; k++) {
        if (sameColor(pixelAt(src.data, src.img.width, x0 + k * pas, ligne), corps)) return k;
      }
      return max;
    };
    SAFE.set(key, {
      left: depuis(frame.left[0]!, 1, plan.insets.left),
      right: depuis(frame.right[2]! - 1, -1, plan.insets.right),
    });
  }
}

/** Recompose les nine-slice. Idempotent : les composants l'appellent à chaque
 *  usage, le premier fait le travail et les suivants sortent aussitôt. */
export function ensureUiSkinTextures(scene: Phaser.Scene): void {
  ensureStripTextures(scene);
  for (const [key, sheet] of Object.entries(SHEETS) as [string, Sheet][]) {
    if (scene.textures.exists(key)) continue;
    const src: SheetPixels | null = sheetPixels(scene, sheet.file);
    if (!src) continue;
    const { img, data } = src;

    const piece: (Box | null)[][] = sheet.rows.map(y =>
      sheet.cols.map(x => opaqueBounds(data, img.width, x, y, sheet.cell)));
    const corner: Box | null | undefined = piece[0]![0];
    const centre: Box | null | undefined = piece[1]![1];
    if (!corner || !centre) continue;

    // Repère COMMUN par rangée et par colonne : les pièces d'une même rangée
    // n'ont pas toutes la même hauteur, et sans repère commun le contour se
    // décale de quelques pixels entre le coin et le bord.
    const frame: SheetFrame = {
      left: [0, 1, 2].map(c => Math.min(...[0, 1, 2].map(r => piece[r]![c]?.x ?? Infinity))) as never,
      right: [0, 1, 2].map(c => Math.max(...[0, 1, 2].map(r => {
        const b: Box | null | undefined = piece[r]![c];
        return b ? b.x + b.w : -Infinity;
      }))) as never,
      top: [0, 1, 2].map(r => Math.min(...piece[r]!.map(b => b?.y ?? Infinity))) as never,
      bottom: [0, 1, 2].map(r => Math.max(...piece[r]!.map(b => b ? b.y + b.h : -Infinity))) as never,
    };

    const ci: number = ((centre.y + (centre.h >> 1)) * img.width + centre.x + (centre.w >> 1)) * 4;
    // eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
    const fill = [data[ci]!, data[ci + 1]!, data[ci + 2]!] as const;
    const plan: NineSlicePlan = planNineSlice(frame, cornerDetailDepth(data, img.width, corner, fill), sheet.inset);

    paintPlan(scene, key, img, plan, plan.scale, plan.insets);
  }
}
