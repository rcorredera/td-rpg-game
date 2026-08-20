import { describe, expect, it } from "vitest";
import { cropBuffer, opaqueBBox, opaqueLumaRange, remapBufferByLuma, remapByLuma } from "./colorRemap";
import type { PixelBox } from "./colorRemap";
import type { PixelBuffer, Rgba } from "../skin/nineSliceFlatten";

const DARK = [40, 30, 10] as const;
const LIGHT = [250, 240, 200] as const;

function px(r: number, g: number, b: number, a: number = 255): Rgba {
  return { r, g, b, a };
}

/** Construit un tampon 1×N à partir d'une liste de pixels. */
function buffer(pixels: readonly Rgba[]): PixelBuffer {
  const data: Uint8ClampedArray = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((p, i) => {
    data[i * 4] = p.r; data[i * 4 + 1] = p.g; data[i * 4 + 2] = p.b; data[i * 4 + 3] = p.a;
  });
  return { w: pixels.length, h: 1, data };
}

/** Construit un tampon W×H à partir de rangées de pixels (une ligne par entrée). */
function buffer2d(rows: readonly (readonly Rgba[])[]): PixelBuffer {
  const h: number = rows.length, w: number = rows[0]?.length ?? 0;
  const data: Uint8ClampedArray = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) => row.forEach((p, x) => {
    const i: number = (y * w + x) * 4;
    data[i] = p.r; data[i + 1] = p.g; data[i + 2] = p.b; data[i + 3] = p.a;
  }));
  return { w, h, data };
}

const T = px(0, 0, 0, 0);

describe("colorRemap", () => {
  it("ignore les pixels transparents pour les bornes de luminance", () => {
    const buf: PixelBuffer = buffer([px(0, 0, 0, 0), px(200, 200, 200), px(0, 0, 0, 0)]);
    const [lo, hi]: readonly [number, number] = opaqueLumaRange(buf);
    expect(lo).toBeCloseTo(200, 0);
    expect(hi).toBeCloseTo(200, 0);
  });

  it("repose sur [0,255] quand tout est transparent", () => {
    const buf: PixelBuffer = buffer([px(0, 0, 0, 0), px(0, 0, 0, 0)]);
    expect(opaqueLumaRange(buf)).toEqual([0, 255]);
  });

  it("projette la borne basse sur `dark` et la borne haute sur `light`", () => {
    const range = [50, 150] as const;
    expect(remapByLuma(px(50, 50, 50), range, DARK, LIGHT)).toEqual(px(...DARK));
    expect(remapByLuma(px(150, 150, 150), range, DARK, LIGHT)).toEqual(px(...LIGHT));
  });

  it("conserve l'alpha d'origine, jamais celui de `dark`/`light`", () => {
    const out: Rgba = remapByLuma(px(100, 100, 100, 77), [50, 150], DARK, LIGHT);
    expect(out.a).toBe(77);
  });

  it("préserve l'ordre : un pixel plus clair à la source ressort plus clair reteint", () => {
    const buf: PixelBuffer = buffer([px(60, 30, 30), px(120, 60, 60), px(200, 100, 100)]);
    remapBufferByLuma(buf, DARK, LIGHT);
    const luma = (i: number) => 0.299 * buf.data[i * 4]! + 0.587 * buf.data[i * 4 + 1]! + 0.114 * buf.data[i * 4 + 2]!;
    expect(luma(0)).toBeLessThan(luma(1));
    expect(luma(1)).toBeLessThan(luma(2));
  });

  it("laisse les pixels totalement transparents intacts", () => {
    const buf: PixelBuffer = buffer([px(0, 0, 0, 0), px(120, 60, 60)]);
    remapBufferByLuma(buf, DARK, LIGHT);
    expect([buf.data[0], buf.data[1], buf.data[2], buf.data[3]]).toEqual([0, 0, 0, 0]);
  });

  it("ne réutilise ni dark ni light au hasard : bornes égales retombent sur dark", () => {
    // Un tampon d'une seule couleur opaque donne lo === hi ; `remapByLuma` doit
    // alors se rabattre sur `dark` (t=0) plutôt que de diviser par zéro.
    const buf: PixelBuffer = buffer([px(80, 80, 80), px(80, 80, 80)]);
    remapBufferByLuma(buf, DARK, LIGHT);
    expect([buf.data[0], buf.data[1], buf.data[2]]).toEqual([...DARK]);
  });

  it("opaqueBBox ignore la marge transparente autour du motif réel", () => {
    // Même défaut que bar-big-fill.png : un canevas large, un motif étroit au
    // centre. Sans ce recadrage, étirer le canevas entier étire le vide avec.
    const buf: PixelBuffer = buffer2d([
      [T, T, T, T],
      [T, px(255, 0, 0), px(255, 0, 0), T],
      [T, T, T, T],
    ]);
    expect(opaqueBBox(buf)).toEqual({ x: 1, y: 1, w: 2, h: 1 });
  });

  it("opaqueBBox renvoie null quand tout est transparent", () => {
    const buf: PixelBuffer = buffer2d([[T, T], [T, T]]);
    expect(opaqueBBox(buf)).toBeNull();
  });

  it("cropBuffer extrait exactement le rectangle demandé, ligne par ligne", () => {
    const buf: PixelBuffer = buffer2d([
      [px(1, 0, 0), px(2, 0, 0), px(3, 0, 0)],
      [px(4, 0, 0), px(5, 0, 0), px(6, 0, 0)],
      [px(7, 0, 0), px(8, 0, 0), px(9, 0, 0)],
    ]);
    const box: PixelBox = { x: 1, y: 0, w: 2, h: 2 };
    const out: PixelBuffer = cropBuffer(buf, box);
    expect([out.w, out.h]).toEqual([2, 2]);
    expect([out.data[0], out.data[4], out.data[8], out.data[12]]).toEqual([2, 3, 5, 6]);
  });
});
