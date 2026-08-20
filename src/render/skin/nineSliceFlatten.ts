// ============================================================
// render/skin/nineSliceFlatten.ts — Rendre les pièces étirées constantes le long de
// leur axe d'étirement.
//
// PUR : travaille sur un tampon RGBA nu, sans Phaser, DOM ni canvas.
//
// POURQUOI. Un nine-slice n'étire que cinq de ses neuf pièces : la colonne du
// milieu en largeur, la rangée du milieu en hauteur, le centre dans les deux
// sens. Tout écart le long d'un axe étiré est donc MULTIPLIÉ par le facteur
// d'étirement : sur le parchemin du pack, la bande gauche avait huit profils de
// ligne différents pour huit lignes (grain moucheté de l'art), ce qui donnait à
// l'écran une traînée claire haute de 120 px sur le bord de chaque tuile. Le
// centre, lui, portait deux couleurs — la seconde devenait une barre verticale de
// 40 px de large.
//
// Le grain n'est pas perdu par principe : il se REMET en pavage (`tileSprite`),
// jamais en étirement. C'est la seule façon d'en garder la densité.
// ============================================================

import type { PieceRect } from "./nineSlicePlan";

/** Image RGBA nue — juste ce qu'il faut pour être testable hors navigateur. */
export interface PixelBuffer {
  w: number;
  h: number;
  /** RGBA entrelacé, 4 octets par pixel, comme `ImageData.data`. */
  data: Uint8ClampedArray;
}

/** Une couleur, telle qu'on la lit et l'écrit dans le tampon. */
export interface Rgba {
  r: number; g: number; b: number; a: number;
}

function read(img: PixelBuffer, x: number, y: number): Rgba {
  const i: number = (y * img.w + x) * 4;
  return { r: img.data[i]!, g: img.data[i + 1]!, b: img.data[i + 2]!, a: img.data[i + 3]! };
}

function write(img: PixelBuffer, x: number, y: number, c: Rgba): void {
  const i: number = (y * img.w + x) * 4;
  img.data[i] = c.r;
  img.data[i + 1] = c.g;
  img.data[i + 2] = c.b;
  img.data[i + 3] = c.a;
}

/**
 * Couleur DOMINANTE d'un échantillon : la plus fréquente, à égalité la première
 * rencontrée (donc déterministe).
 *
 * Dominante et non moyenne ni médiane par canal : les deux inventent une couleur
 * absente de l'art — une moyenne entre le crème du parchemin et son liseré bleu
 * nuit donne un gris qui n'existe nulle part sur la planche. La dominante rend
 * toujours un pixel réellement présent, et une moucheture minoritaire ne peut pas
 * l'emporter sur le remplissage.
 */
export function dominantRgba(sample: readonly Rgba[]): Rgba {
  if (sample.length === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const counts: Map<number, number> = new Map<number, number>();
  let best: Rgba = sample[0]!;
  let bestCount: number = 0;
  for (const c of sample) {
    const key: number = (c.r << 24) | (c.g << 16) | (c.b << 8) | c.a;
    const n: number = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return best;
}

/**
 * Aplatit sur place les pièces étirées du plan.
 *
 * Après cet appel, la garantie tenue par les tests est la suivante : pour toute
 * pièce dont `stretch` vaut `x`, `y` ou `both`, la pièce ne varie plus le long
 * du ou des axes concernés. Les quatre coins ne sont jamais touchés — c'est là
 * que vit tout le dessin du pack.
 *
 * Les rectangles sont lus en coordonnées de DESTINATION (`dx`/`dy`), puisqu'on
 * corrige la texture déjà assemblée, pas la planche d'origine.
 */
export function flattenStretched(img: PixelBuffer, rects: readonly PieceRect[]): void {
  for (const rect of rects) {
    if (rect.stretch === "none") continue;
    const { dx, dy, sw, sh } = rect;

    if (rect.stretch === "both") {
      // Étirée dans les deux sens : une seule couleur peut survivre.
      const sample: Rgba[] = [];
      for (let y: number = 0; y < sh; y++) for (let x: number = 0; x < sw; x++) sample.push(read(img, dx + x, dy + y));
      const c: Rgba = dominantRgba(sample);
      for (let y: number = 0; y < sh; y++) for (let x: number = 0; x < sw; x++) write(img, dx + x, dy + y, c);
      continue;
    }

    if (rect.stretch === "x") {
      // Étirée en largeur : chaque LIGNE se réduit à sa dominante, ce qui préserve
      // le profil vertical de la bordure (liseré, reflet, remplissage).
      for (let y: number = 0; y < sh; y++) {
        const sample: Rgba[] = [];
        for (let x: number = 0; x < sw; x++) sample.push(read(img, dx + x, dy + y));
        const c: Rgba = dominantRgba(sample);
        for (let x: number = 0; x < sw; x++) write(img, dx + x, dy + y, c);
      }
      continue;
    }

    // Étirée en hauteur : symétrique, chaque COLONNE se réduit à sa dominante.
    for (let x: number = 0; x < sw; x++) {
      const sample: Rgba[] = [];
      for (let y: number = 0; y < sh; y++) sample.push(read(img, dx + x, dy + y));
      const c: Rgba = dominantRgba(sample);
      for (let y: number = 0; y < sh; y++) write(img, dx + x, dy + y, c);
    }
  }
}
