// ============================================================
// render/assets/colorRemap.ts — Reteinte d'un raster par LUMINANCE.
//
// PUR : travaille sur un tampon RGBA nu, sans Phaser, DOM ni canvas.
//
// POURQUOI. `setTint` MULTIPLIE (ADR-014) : il assombrit un canal mais ne peut
// jamais en faire naître un que la source n'a pas — reteindre en or un rouge
// saturé (`bar-big-fill.png`) resterait rouge, quelle que soit la teinte posée
// dessus. Remapper par LUMINANCE change la TEINTE en gardant le RELIEF du
// dessin (reflet, ombre) : chaque pixel devient un point sur un dégradé
// sombre→clair, à la position que sa clarté d'ORIGINE lui donne.
// ============================================================

import type { PixelBuffer, Rgba } from "../skin/nineSliceFlatten";

export type Rgb = readonly [number, number, number];

/** Luminance perçue (poids ITU-R BT.601), 0..255. */
function luma601(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Bornes de luminance des pixels OPAQUES d'un tampon.
 *
 * Sert à étirer le dégradé cible sur tout le contraste RÉELLEMENT présent dans
 * la source, plutôt que sur [0,255] qu'elle n'occupe presque jamais en entier —
 * sans cet étirement, un dégradé qui varie peu dans la source (cas mesuré de
 * `bar-big-fill.png` : luminance 93 à 173 sur 255) ressortirait plat une fois
 * reteint.
 */
export function opaqueLumaRange(img: PixelBuffer, alphaThreshold: number = 40): readonly [number, number] {
  let lo: number = 255, hi: number = 0;
  for (let i: number = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3]! <= alphaThreshold) continue;
    const l: number = luma601(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!);
    if (l < lo) lo = l;
    if (l > hi) hi = l;
  }
  return lo <= hi ? [lo, hi] : [0, 255];
}

/**
 * Reteinte un pixel par sa luminance, étirée sur `range` puis reprojetée entre
 * `dark` et `light`. L'alpha traverse inchangé.
 */
export function remapByLuma(c: Rgba, range: readonly [number, number], dark: Rgb, light: Rgb): Rgba {
  const [lo, hi] = range;
  const t: number = hi > lo ? Math.max(0, Math.min(1, (luma601(c.r, c.g, c.b) - lo) / (hi - lo))) : 0;
  return {
    r: Math.round(dark[0] + (light[0] - dark[0]) * t),
    g: Math.round(dark[1] + (light[1] - dark[1]) * t),
    b: Math.round(dark[2] + (light[2] - dark[2]) * t),
    a: c.a,
  };
}

/**
 * Reteinte tout le tampon EN PLACE, sur ses propres bornes de luminance
 * opaques (`opaqueLumaRange`). Les pixels totalement transparents ne sont pas
 * lus : ni la forme ni les marges de découpe ne changent, seule la couleur.
 */
export function remapBufferByLuma(img: PixelBuffer, dark: Rgb, light: Rgb): void {
  const range: readonly [number, number] = opaqueLumaRange(img);
  for (let i: number = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] === 0) continue;
    const out: Rgba = remapByLuma(
      { r: img.data[i]!, g: img.data[i + 1]!, b: img.data[i + 2]!, a: img.data[i + 3]! },
      range, dark, light,
    );
    img.data[i] = out.r; img.data[i + 1] = out.g; img.data[i + 2] = out.b; img.data[i + 3] = out.a;
  }
}

export interface PixelBox { x: number; y: number; w: number; h: number }

/**
 * Rectangle opaque le plus ÉTROIT qui contient tout le contenu non transparent
 * d'un tampon, ou `null` si tout est transparent.
 *
 * Sert à retirer la marge que beaucoup de rasters gardent autour de leur motif
 * réel : `bar-big-fill.png` fait 64×64 mais ne peint que 24 px de haut — sans
 * ce recadrage, `setDisplaySize` étire la marge vide EN MÊME TEMPS que le
 * motif, et une jauge censée être pleine sur sa hauteur n'affiche plus qu'un
 * mince trait (bug réel, ADR-035).
 */
export function opaqueBBox(img: PixelBuffer, alphaThreshold: number = 40): PixelBox | null {
  let minX: number = img.w, minY: number = img.h, maxX: number = -1, maxY: number = -1;
  for (let y: number = 0; y < img.h; y++) {
    for (let x: number = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3]! <= alphaThreshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < minX ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Extrait un rectangle d'un tampon dans un nouveau tampon indépendant. */
export function cropBuffer(img: PixelBuffer, box: PixelBox): PixelBuffer {
  const out: PixelBuffer = { w: box.w, h: box.h, data: new Uint8ClampedArray(box.w * box.h * 4) };
  for (let y: number = 0; y < box.h; y++) {
    const srcStart: number = ((box.y + y) * img.w + box.x) * 4;
    const dstStart: number = (y * box.w) * 4;
    out.data.set(img.data.subarray(srcStart, srcStart + box.w * 4), dstStart);
  }
  return out;
}
