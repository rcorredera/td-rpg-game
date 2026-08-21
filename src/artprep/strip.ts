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
  // Les bandes rendues sont ÉLARGIES à tout le voisinage qui ressemble encore à
  // un trait. Deux raisons, et la seconde n'est pas cosmétique :
  //  - le nettoyage doit emporter les segments décalés que le critère strict
  //    laisse passer ;
  //  - la FRONTIÈRE entre deux rangées suit cette bande. Sous les pieds, la ligne
  //    est conservée à dessein (c'est le bas de la botte) ; si la frontière
  //    restait à la bande stricte, ces pixels-là tomberaient dans la rangée
  //    SUIVANTE et y passeraient pour une pose montant très haut.
  return bands
    .map(b => widenToLineLike(img, b, threshold))
    .filter((b, i, all) => i === 0 || b.top > all[i - 1]!.bottom);
}

/**
 * Remplissage tolérable pour NETTOYER un trait, plus large que pour le détecter.
 *
 * Mesuré : une bande de torses côte à côte plafonne à 75 % de remplissage, un
 * segment de sol un peu court en atteint 90. Le seuil se place entre les deux, et
 * ne s'applique QU'AU VOISINAGE d'une bande déjà identifiée — jamais pour
 * déclarer une rangée.
 */
export const ERASE_MIN_FILL: number = 0.82;

/** Étendue et remplissage d'encre sur une ligne. */
function rowSpanFill(img: Rgba, y: number, threshold: number): { span: number; fill: number } {
  let n: number = 0, first: number = -1, last: number = -1;
  for (let x: number = 0; x < img.width; x++) {
    if (isBackground(img, x, y, threshold)) continue;
    n++;
    if (first < 0) first = x;
    last = x;
  }
  const span: number = last - first + 1;
  return { span, fill: span > 0 ? n / span : 0 };
}

/**
 * Élargit une bande aux traits voisins, en TOLÉRANT un trou entre eux.
 *
 * Un générateur dessine parfois le sol en plusieurs segments décalés de quelques
 * pixels, reliés par de l'anticrénelage qui, lui, ne ressemble pas à un trait.
 * Une croissance strictement contiguë s'arrêterait sur ce trou et laisserait le
 * second segment en place — mesuré sur la planche du gobelin : deux segments à
 * 5 px l'un de l'autre.
 */
function widenToLineLike(
  img: Rgba, band: Band, threshold: number, maxGrow: number = 12, gapTolerance: number = 8,
): Band {
  const lineLike = (y: number): boolean => {
    if (y < 0 || y >= img.height) return false;
    const { span, fill } = rowSpanFill(img, y, threshold);
    return span >= img.width * GROUND_MIN_SPAN && fill >= ERASE_MIN_FILL;
  };
  let top: number = band.top, bottom: number = band.bottom;
  for (let i: number = 0; i < maxGrow; i++) {
    let found: number = -1;
    for (let y: number = bottom + 1; y <= bottom + gapTolerance; y++) if (lineLike(y)) { found = y; break; }
    if (found < 0) break;
    bottom = found;
  }
  for (let i: number = 0; i < maxGrow; i++) {
    let found: number = -1;
    for (let y: number = top - 1; y >= top - gapTolerance; y--) if (lineLike(y)) { found = y; break; }
    if (found < 0) break;
    top = found;
  }
  return { top, bottom };
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
export function eraseGroundLine(
  img: Rgba, band: Band, threshold: number, probe: number = 4, bleed: number = 2,
): number {
  // Le trait déborde de la bande DÉTECTÉE, de deux façons : son anticrénelage,
  // et le fait qu'un générateur le dessine parfois en plusieurs segments décalés
  // de quelques pixels. Mesuré sur la planche du gobelin : un second segment à
  // 90 % de remplissage, juste sous le seuil strict de détection — donc invisible
  // à celle-ci, mais bien présent. Laissé en place, il atterrit dans la rangée
  // SUIVANTE, y passe pour une pose très haute et fait exploser la hauteur de case.
  //
  // Le seuil strict sert à IDENTIFIER une rangée ; nettoyer demande d'être plus
  // large, sur le seul voisinage immédiat de la bande.
  const wide: Band = widenToLineLike(img, band, threshold);
  const from: number = Math.max(0, wide.top - bleed);
  const to: number = Math.min(img.height - 1, wide.bottom + bleed);
  const above: number = wide.top - probe - bleed;
  if (above < 0) return 0;
  let erased: number = 0;
  for (let y: number = from; y <= to; y++) {
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

/** Quantité d'encre par colonne sur une bande horizontale. */
export function columnInk(img: Rgba, yFrom: number, yTo: number): number[] {
  const { width: w } = img;
  const top: number = Math.max(0, yFrom);
  const bottom: number = Math.min(img.height - 1, yTo);
  const out: number[] = [];
  for (let x: number = 0; x < w; x++) {
    let n: number = 0;
    for (let y: number = top; y <= bottom; y++) if (img.data[(y * w + x) * 4 + 3] !== 0) n++;
    out.push(n);
  }
  return out;
}

/**
 * Découpe une rangée en `count` cases en coupant aux CREUX du profil d'encre.
 *
 * `sliceFrames` sépare les poses par les trous entre elles — ça ne marche que si
 * elles ne se touchent pas. Mesuré sur la planche du gobelin : 15 à 29 px
 * d'écart entre poses, quand le seuil qui rattache un fer d'épée détaché à sa
 * pose en vaut 30 ; et en vue de profil, les épées se CHEVAUCHENT franchement.
 * Aucun seuil ne peut trancher.
 *
 * Une planche est une GRILLE : on sait combien de cases attendre. On vise donc
 * la frontière théorique de chaque case, puis on cherche autour d'elle la
 * colonne la MOINS encrée — là où les deux poses se touchent le moins. Robuste à
 * un espacement irrégulier, et robuste à des poses jointives.
 */
export function sliceRowInto(
  img: Rgba, count: number, yFrom: number, yTo: number, minInk: number = 2,
): FrameBox[] {
  const ink: number[] = columnInk(img, yFrom, yTo);
  let x0: number = -1, x1: number = -1;
  for (let x: number = 0; x < ink.length; x++) {
    if (ink[x]! <= minInk) continue;
    if (x0 < 0) x0 = x;
    x1 = x;
  }
  if (x0 < 0 || count < 1) return [];
  if (count === 1) return [boxFrom(img, x0, x1, yFrom, yTo)];

  const cellW: number = (x1 - x0 + 1) / count;
  // Fenêtre de recherche : assez large pour rattraper un espacement irrégulier,
  // assez étroite pour ne pas couper en plein milieu d'une pose.
  const halfWindow: number = Math.max(2, Math.round(cellW * 0.3));
  const cuts: number[] = [];
  for (let k: number = 1; k < count; k++) {
    const target: number = Math.round(x0 + k * cellW);
    let best: number = target, bestInk: number = Number.POSITIVE_INFINITY;
    for (let x: number = target - halfWindow; x <= target + halfWindow; x++) {
      if (x <= x0 || x >= x1) continue;
      const v: number = ink[x]!;
      // À encre égale, on reste au plus près de la frontière théorique : sur une
      // zone plate, s'éloigner ferait dériver toutes les cases suivantes.
      if (v < bestInk || (v === bestInk && Math.abs(x - target) < Math.abs(best - target))) {
        bestInk = v;
        best = x;
      }
    }
    cuts.push(best);
  }

  const bounds: number[] = [x0, ...cuts, x1 + 1];
  const out: FrameBox[] = [];
  for (let i: number = 0; i < count; i++) {
    const from: number = bounds[i]!;
    const to: number = bounds[i + 1]! - 1;
    if (to >= from) out.push(boxFrom(img, from, to, yFrom, yTo));
  }
  return out;
}

/**
 * Boîte d'une case, SERRÉE sur l'encre réelle.
 *
 * Les bornes reçues sont les traits de coupe, qui englobent le vide entre deux
 * poses. Les garder telles quelles gonflerait la case, la créature n'en
 * occuperait plus qu'une partie — et comme `fitSquare` cale l'affichage sur la
 * CASE (ADR-046), elle paraîtrait d'autant plus petite en jeu.
 */
function boxFrom(img: Rgba, from: number, to: number, yFrom: number, yTo: number): FrameBox {
  const { width: w } = img;
  const top: number = Math.max(0, yFrom);
  const bottom: number = Math.min(img.height - 1, yTo);
  let y0: number = bottom + 1, y1: number = -1;
  let x0: number = to + 1, x1: number = -1;
  for (let y: number = top; y <= bottom; y++) {
    for (let x: number = from; x <= to; x++) {
      if (img.data[(y * w + x) * 4 + 3] === 0) continue;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }
  // Case vide : on rend la coupe telle quelle plutôt qu'une boîte inversée.
  if (x1 < x0) { x0 = from; x1 = to; y0 = top; y1 = bottom; }
  const box: FrameBox = { x0, y0, x1, y1, anchorX: 0 };
  box.anchorX = frameAnchor(img, box);
  return box;
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
  /** Abscisse de l'ancre DANS une case. Toutes les poses y sont alignées. */
  anchorInCell: number;
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
export function packRows(
  img: Rgba, rows: readonly StripRow[], pad: number = 2,
  mirrorRows: ReadonlySet<number> = new Set<number>(),
): PackedStrip {
  const all: { box: FrameBox; baseline: number; mirror: boolean }[] = rows.flatMap(
    (r, i) => r.frames.map(box => ({ box, baseline: r.baseline, mirror: mirrorRows.has(i) })),
  );
  const above: number = Math.max(...all.map(f => f.baseline - f.box.y0));
  const below: number = Math.max(...all.map(f => Math.max(0, f.box.y1 - f.baseline)));
  // Débords mesurés APRÈS retournement : une pose miroir a besoin de place du
  // côté OPPOSÉ à celui qu'elle occupe dans la source. Sans cela, une épée qui
  // dépassait à gauche se ferait couper à droite une fois la pose retournée.
  const left: number = Math.max(...all.map(
    f => f.mirror ? f.box.x1 - f.box.anchorX : f.box.anchorX - f.box.x0,
  ));
  const right: number = Math.max(...all.map(
    f => f.mirror ? f.box.anchorX - f.box.x0 : f.box.x1 - f.box.anchorX,
  ));
  const cellW: number = Math.ceil(left + right) + pad * 2;
  const cellH: number = above + below + pad;
  const anchorInCell: number = Math.ceil(left) + pad;

  const sheetW: number = cellW * all.length;
  const data: Uint8Array = new Uint8Array(sheetW * cellH * 4);
  all.forEach((f, i) => {
    const b: FrameBox = f.box;
    const dy: number = above - f.baseline;
    const cellX: number = i * cellW;
    for (let y: number = b.y0; y <= b.y1; y++) {
      for (let x: number = b.x0; x <= b.x1; x++) {
        const s: number = (y * img.width + x) * 4;
        if (img.data[s + 3] === 0) continue;
        // Le miroir se fait POSE PAR POSE, jamais sur la rangée entière : retourner
        // la bande inverserait aussi l ordre des poses, et le cycle marcherait à
        // l envers.
        const local: number = f.mirror
          ? Math.round(b.anchorX) - x
          : x - Math.round(b.anchorX);
        const nx: number = cellX + anchorInCell + local, ny: number = y + dy;
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
    cellW, cellH, count: all.length, anchorInCell,
    rows: rows.length,
    poses: rows.length > 0 ? all.length / rows.length : 0,
    heightSpread: Math.max(...heights) - Math.min(...heights),
    baselineSpread: Math.max(...drops) - Math.min(...drops),
  };
}

/** Luminance d'un pixel, réexportée pour les appelants qui inspectent une planche. */
export { luma };
