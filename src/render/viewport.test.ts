import { describe, expect, it } from "vitest";
import { computeViewport, MAX_DPR, WORLD_H, WORLD_W } from "./viewport";

describe("computeViewport", () => {
  it("garde la zone de jeu 800×600 entièrement visible sur tout écran", () => {
    const screens: [number, number][] = [
      [1280, 800], [1920, 1080], [812, 375], [375, 812], [1024, 768], [2560, 1440],
    ];
    for (const [w, h] of screens) {
      const v = computeViewport(w, h, 2);
      expect(v.width).toBeGreaterThanOrEqual(WORLD_W - 0.001);
      expect(v.height).toBeGreaterThanOrEqual(WORLD_H - 0.001);
      // Le rectangle visible est centré sur la zone de jeu.
      expect(v.left + v.width / 2).toBeCloseTo(WORLD_W / 2, 6);
      expect(v.top + v.height / 2).toBeCloseTo(WORLD_H / 2, 6);
    }
  });

  it("étend la vue dans le sens le plus large (bleed), sans rogner l'autre", () => {
    // Écran plus large que 4:3 → débord horizontal, hauteur pile à 600.
    const wide = computeViewport(1200, 600, 1);
    expect(wide.height).toBeCloseTo(WORLD_H, 6);
    expect(wide.width).toBeGreaterThan(WORLD_W);
    expect(wide.left).toBeLessThan(0);

    // Écran plus haut que 4:3 → débord vertical, largeur pile à 800.
    const tall = computeViewport(600, 1200, 1);
    expect(tall.width).toBeCloseTo(WORLD_W, 6);
    expect(tall.height).toBeGreaterThan(WORLD_H);
    expect(tall.top).toBeLessThan(0);
  });

  it("dimensionne le framebuffer à la densité réelle, plafonnée", () => {
    const v = computeViewport(400, 300, 2);
    expect(v.canvasW).toBe(800);
    expect(v.canvasH).toBe(600);
    expect(v.cssW).toBe(400);

    // Au-delà du plafond, on ne paie pas la densité supplémentaire.
    const dense = computeViewport(400, 300, 4);
    expect(dense.canvasW).toBe(400 * MAX_DPR);

    // Densité absurde ou nulle : on retombe sur 1, jamais sur 0 ou NaN.
    const zero = computeViewport(400, 300, 0);
    expect(zero.canvasW).toBe(400);
    expect(zero.zoom).toBeGreaterThan(0);
  });

  it("retranche les encoches des bords sûrs, converties en unités logiques", () => {
    // 800×600 @dpr1 → zoom 1 : 1 px CSS = 1 unité logique, conversion triviale.
    const v = computeViewport(WORLD_W, WORLD_H, 1, { top: 40, right: 10, bottom: 20, left: 30 });
    expect(v.zoom).toBeCloseTo(1, 6);
    expect(v.safeTop).toBeCloseTo(v.top + 40, 6);
    expect(v.safeLeft).toBeCloseTo(v.left + 30, 6);
    expect(v.safeRight).toBeCloseTo(v.right - 10, 6);
    expect(v.safeBottom).toBeCloseTo(v.bottom - 20, 6);

    // Sans encoche, les bords sûrs sont les bords tout court.
    const plain = computeViewport(WORLD_W, WORLD_H, 1);
    expect(plain.safeTop).toBeCloseTo(plain.top, 6);
    expect(plain.safeBottom).toBeCloseTo(plain.bottom, 6);
  });

  it("signale le portrait pour proposer la rotation", () => {
    expect(computeViewport(375, 812, 2).portrait).toBe(true);
    expect(computeViewport(812, 375, 2).portrait).toBe(false);
  });

  it("ne divise jamais par zéro sur un écran dégénéré", () => {
    const v = computeViewport(0, 0, 1);
    expect(Number.isFinite(v.zoom)).toBe(true);
    expect(v.zoom).toBeGreaterThan(0);
    expect(Number.isFinite(v.width)).toBe(true);
  });
});
