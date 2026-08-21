// ============================================================
// artprep/strip.ts — Planche de poses -> planche à cases régulières (ADR-065).
//
// Une créature animée est livrée en UNE image contenant les poses de son cycle
// de marche, côte à côte, posées sur une LIGNE DE SOL dessinée. Générer les
// poses ensemble est ce qui garantit leur cohérence : demandées séparément,
// couleurs et proportions dérivent d'une image à l'autre.
//
// Ce module fait le reste : trouver la ligne, l'effacer sans percer ce qu'elle
// traverse, isoler les poses, et les recomposer en cases régulières TOUTES
// CALÉES sur cette ligne. C'est ce calage qui fait la différence entre « le
// corps monte » et « le sprite saute » (ADR-064) : chaque pose garde son
// élévation voulue au-dessus de la ligne, et toute dérive involontaire tombe.
//
// PUR : aucune E/S, aucune API Node, aucun Phaser.
// ============================================================

import { luma, type Rgba } from "./image";

/** Bande horizontale, bornes incluses. */
export interface Band {
  top: number;
  bottom: number;
}

/** Boîte d'une pose dans l'image source, bornes incluses. */
export interface FrameBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Abscisse d'ancrage : centre de masse du haut du corps (voir `frameAnchor`). */
  anchorX: number;
}

/** Étendue minimale d'une ligne de sol, en part de la largeur de l'image. */
export const GROUND_MIN_SPAN: number = 0.85;

/**
 * Taux de remplissage minimal d'une ligne de sol sur son étendue.
 *
 * C'est le critère qui la distingue vraiment : à hauteur des torses, quatre
 * personnages côte à côte couvrent eux aussi 85 % de la largeur — mais avec des
 * trous entre eux. Mesuré sur la planche de l'orc : 75 % de remplissage pour la
 * bande des torses, 100 % pour la ligne. L'étendue seule ne sépare pas.
 */
export const GROUND_MIN_FILL: number = 0.95;

function isBackground(img: Rgba, x: number, y: number, threshold: number): boolean {
  const i: number = (y * img.width + x) * 4;
  if (img.data[i + 3] === 0) return true;
  return img.data[i]! >= threshold && img.data[i + 1]! >= threshold && img.data[i + 2]! >= threshold;
}

/**
 * Trouve TOUTES les lignes de sol de la planche, de haut en bas.
 *
 * Une planche de marche complète en porte une par DIRECTION : face, profil, dos
 * (ADR-067). Une planche à une seule direction en a une, et le reste de la
 * chaîne ne fait pas la différence.
 */
export function detectGroundLines(img: Rgba, threshold: number): Band[] {
  const { width: w, height: h } = img;
  const bands: Band[] = [];
  let current: Band | null = null;
  for (let y: number = 0; y < h; y++) {
    let n: number = 0, first: number = -1, last: number = -1;
    for (let x: number = 0; x < w; x++) {
      if (isBackground(img, x, y, threshold)) continue;
      n++;
      if (first < 0) first = x;
      last = x;
    }
    const span: number = last - first + 1;
    const isLine: boolean = span >= w * GROUND_MIN_SPAN && n / span >= GROUND_MIN_FILL;
    if (isLine && current !== null && y === current.bottom + 1) current.bottom = y;
    else if (isLine) { current = { top: y, bottom: y }; bands.push(current); }
    else current = null;
  }
  return bands;
}

/** Première ligne de sol, ou `null`. Conservé pour les planches à une rangée. */
export function detectGroundLine(img: Rgba, threshold: number): Band | null {
  return detectGroundLines(img, threshold)[0] ?? null;
}

/**
 * Efface la ligne de sol LÀ OÙ ELLE EST LIBRE, en épargnant ce qu'elle traverse.
 *
 * La ligne passe derrière les pieds : l'effacer en bloc percerait une fente dans
 * chaque botte. On regarde donc quelques pixels AU-DESSUS : si c'est du fond,
 * la ligne est seule et part ; si c'est du dessin, on est sous une silhouette et
 * on garde tout. MUTE `img`.
 */
export function eraseGroundLine(img: Rgba, band: Band, threshold: number, probe: number = 4): number {
  const above: number = band.top - probe;
  if (above < 0) return 0;
  let erased: number = 0;
  for (let y: number = band.top; y <= band.bottom; y++) {
    for (let x: number = 0; x < img.width; x++) {
      if (isBackground(img, x, y, threshold)) continue;
      if (!isBackground(img, x, above, threshold)) continue;
      img.data[(y * img.width + x) * 4 + 3] = 0;
      erased++;
    }
  }
  return erased;
}

/**
 * Abscisse d'ancrage d'une pose : centre de masse de l'encre dans son HAUT.
 *
 * Aligner les poses sur le centre de leur boîte les ferait glisser : la boîte
 * s'élargit quand la jambe s'avance ou que l'arme balance. La tête et les
 * épaules, elles, restent en place d'une pose à l'autre — c'est donc sur elles
 * qu'on cale. Mesuré sur l'orc : 0,6 px de dispersion sur 247, contre plusieurs
 * pixels pour un calage sur la boîte.
 */
export function frameAnchor(img: Rgba, box: FrameBox, topShare: number = 0.35): number {
  const cut: number = box.y0 + Math.round((box.y1 - box.y0) * topShare);
  let sum: number = 0, n: number = 0;
  for (let y: number = box.y0; y <= cut; y++) {
    for (let x: number = box.x0; x <= box.x1; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] === 0) continue;
      sum += x;
      n++;
    }
  }
  return n > 0 ? sum / n : (box.x0 + box.x1) / 2;
}

/**
 * Découpe la planche en poses, par colonnes non vides.
 *
 * `minGap` recolle deux groupes séparés par un vide étroit : une pose a souvent
 * des morceaux détachés — un fer de hache, un pied levé — qu'il ne faut pas
 * prendre pour des poses à part entière.
 */
export function sliceFrames(
  img: Rgba, minGap: number = 30, minInk: number = 2,
  yFrom: number = 0, yTo: number = img.height - 1,
): FrameBox[] {
  const { width: w } = img;
  const top: number = Math.max(0, yFrom);
  const bottom: number = Math.min(img.height - 1, yTo);
  const cols: number[] = [];
  for (let x: number = 0; x < w; x++) {
    let n: number = 0;
    for (let y: number = top; y <= bottom; y++) if (img.data[(y * w + x) * 4 + 3] !== 0) n++;
    cols.push(n);
  }
  const spans: [number, number][] = [];
  let start: number = -1;
  for (let x: number = 0; x <= w; x++) {
    const filled: boolean = x < w && cols[x]! > minInk;
    if (filled && start < 0) start = x;
    if (!filled && start >= 0) { spans.push([start, x - 1]); start = -1; }
  }
  const merged: [number, number][] = [];
  for (const s of spans) {
    const prev: [number, number] | undefined = merged[merged.length - 1];
    if (prev && s[0] - prev[1] < minGap) prev[1] = s[1];
    else merged.push([s[0], s[1]]);
  }

  return merged.map(([x0, x1]) => {
    let y0: number = bottom + 1, y1: number = -1;
    for (let y: number = top; y <= bottom; y++) {
      for (let x: number = x0; x <= x1; x++) {
        if (img.data[(y * w + x) * 4 + 3] === 0) continue;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        break;
      }
    }
    const box: FrameBox = { x0, y0, x1, y1, anchorX: 0 };
    box.anchorX = frameAnchor(img, box);
    return box;
  });
}

/** Une rangée de la planche : ses poses, et la ligne de sol qui les porte. */
export interface StripRow {
  baseline: number;
  frames: FrameBox[];
}

export interface PackedStrip {
  sheet: Rgba;
  cellW: number;
  cellH: number;
  count: number;
  /** Rangées d'origine, c'est-à-dire DIRECTIONS dessinées (ADR-067). */
  rows: number;
  /** Poses par direction. Le tout est rangé direction-major : l'index de case
   *  vaut `direction * poses + pose`. */
  poses: number;
  /** Dispersion des hauteurs de pose, en px. Le rebond voulu s'y mêle à la
   *  dérive d'échelle — un écart important mérite un œil. */
  heightSpread: number;
  /** Dispersion du bas des poses par rapport à la ligne de sol, en px. */
  baselineSpread: number;
}

/**
 * Recompose les poses en cases régulières, calées sur la ligne de sol et sur
 * l'ancre horizontale. Renvoie une NOUVELLE image.
 */
export function packFrames(img: Rgba, boxes: readonly FrameBox[], baselineY: number, pad: number = 2): PackedStrip {
  return packRows(img, [{ baseline: baselineY, frames: [...boxes] }], pad);
}

/**
 * Recompose PLUSIEURS rangées en une planche unique de cases régulières.
 *
 * Les cases sont dimensionnées sur l'ensemble des poses, toutes rangées
 * confondues : elles doivent être identiques au pixel près, sinon Phaser
 * découpe de travers. Chaque pose est calée sur la ligne de sol de SA rangée —
 * c'est ce qui autorise des directions dessinées à des hauteurs différentes
 * dans l'image source sans qu'elles sautent une fois en jeu.
 *
 * Rangement DIRECTION-MAJOR : `direction * poses + pose`. Le rendu n'a alors
 * qu'une multiplication à faire pour trouver sa case.
 */
export function packRows(img: Rgba, rows: readonly StripRow[], pad: number = 2): PackedStrip {
  const all: { box: FrameBox; baseline: number }[] = rows.flatMap(
    r => r.frames.map(box => ({ box, baseline: r.baseline })),
  );
  const above: number = Math.max(...all.map(f => f.baseline - f.box.y0));
  const below: number = Math.max(...all.map(f => Math.max(0, f.box.y1 - f.baseline)));
  const left: number = Math.max(...all.map(f => f.box.anchorX - f.box.x0));
  const right: number = Math.max(...all.map(f => f.box.x1 - f.box.anchorX));
  const cellW: number = Math.ceil(left + right) + pad * 2;
  const cellH: number = above + below + pad;
  const anchorInCell: number = Math.ceil(left) + pad;

  const sheetW: number = cellW * all.length;
  const data: Uint8Array = new Uint8Array(sheetW * cellH * 4);
  all.forEach((f, i) => {
    const b: FrameBox = f.box;
    const dx: number = i * cellW + anchorInCell - Math.round(b.anchorX);
    const dy: number = above - f.baseline;
    for (let y: number = b.y0; y <= b.y1; y++) {
      for (let x: number = b.x0; x <= b.x1; x++) {
        const s: number = (y * img.width + x) * 4;
        if (img.data[s + 3] === 0) continue;
        const nx: number = x + dx, ny: number = y + dy;
        if (nx < 0 || ny < 0 || nx >= sheetW || ny >= cellH) continue;
        const d: number = (ny * sheetW + nx) * 4;
        data[d] = img.data[s]!;
        data[d + 1] = img.data[s + 1]!;
        data[d + 2] = img.data[s + 2]!;
        data[d + 3] = img.data[s + 3]!;
      }
    }
  });

  const heights: number[] = all.map(f => f.box.y1 - f.box.y0 + 1);
  // Écart des pieds à LEUR ligne de sol : comparer les ordonnées brutes n'aurait
  // aucun sens entre deux rangées dessinées à des hauteurs différentes.
  const drops: number[] = all.map(f => f.box.y1 - f.baseline);
  return {
    sheet: { width: sheetW, height: cellH, data },
    cellW, cellH, count: all.length,
    rows: rows.length,
    poses: rows.length > 0 ? all.length / rows.length : 0,
    heightSpread: Math.max(...heights) - Math.min(...heights),
    baselineSpread: Math.max(...drops) - Math.min(...drops),
  };
}

/** Luminance d'un pixel, réexportée pour les appelants qui inspectent une planche. */
export { luma };
