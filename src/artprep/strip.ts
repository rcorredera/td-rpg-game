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

/** Trouve la ligne de sol dessinée. `null` si la planche n'en a pas. */
export function detectGroundLine(img: Rgba, threshold: number): Band | null {
  const { width: w, height: h } = img;
  let band: Band | null = null;
  for (let y: number = 0; y < h; y++) {
    let n: number = 0, first: number = -1, last: number = -1;
    for (let x: number = 0; x < w; x++) {
      if (isBackground(img, x, y, threshold)) continue;
      n++;
      if (first < 0) first = x;
      last = x;
    }
    const span: number = last - first + 1;
    if (span < w * GROUND_MIN_SPAN || n / span < GROUND_MIN_FILL) continue;
    if (band !== null && y === band.bottom + 1) band.bottom = y;
    else if (band === null) band = { top: y, bottom: y };
  }
  return band;
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
export function sliceFrames(img: Rgba, minGap: number = 30, minInk: number = 2): FrameBox[] {
  const { width: w, height: h } = img;
  const cols: number[] = [];
  for (let x: number = 0; x < w; x++) {
    let n: number = 0;
    for (let y: number = 0; y < h; y++) if (img.data[(y * w + x) * 4 + 3] !== 0) n++;
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
    let y0: number = h, y1: number = -1;
    for (let y: number = 0; y < h; y++) {
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

export interface PackedStrip {
  sheet: Rgba;
  cellW: number;
  cellH: number;
  count: number;
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
  const above: number = Math.max(...boxes.map(b => baselineY - b.y0));
  const below: number = Math.max(...boxes.map(b => Math.max(0, b.y1 - baselineY)));
  const left: number = Math.max(...boxes.map(b => b.anchorX - b.x0));
  const right: number = Math.max(...boxes.map(b => b.x1 - b.anchorX));
  const cellW: number = Math.ceil(left + right) + pad * 2;
  const cellH: number = above + below + pad;
  const anchorInCell: number = Math.ceil(left) + pad;

  const sheetW: number = cellW * boxes.length;
  const data: Uint8Array = new Uint8Array(sheetW * cellH * 4);
  boxes.forEach((b, i) => {
    const dx: number = i * cellW + anchorInCell - Math.round(b.anchorX);
    const dy: number = above - baselineY;
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

  const heights: number[] = boxes.map(b => b.y1 - b.y0 + 1);
  const bottoms: number[] = boxes.map(b => b.y1);
  return {
    sheet: { width: sheetW, height: cellH, data },
    cellW, cellH, count: boxes.length,
    heightSpread: Math.max(...heights) - Math.min(...heights),
    baselineSpread: Math.max(...bottoms) - Math.min(...bottoms),
  };
}

/** Luminance d'un pixel, réexportée pour les appelants qui inspectent une planche. */
export { luma };
