import { describe, expect, it } from "vitest";
import { computeViewport, MAX_DPR, TOUCH_MIN_CSS, WORLD_H, WORLD_W } from "./viewport";
import type { Viewport } from "./viewport";

describe("computeViewport", () => {
  it("garde la zone de jeu (WORLD_W×WORLD_H) entièrement visible sur tout écran", () => {
    const screens: [number, number][] = [
      [1280, 800], [1920, 1080], [812, 375], [375, 812], [1024, 768], [2560, 1440],
    ];
    for (const [w, h] of screens) {
      const v: Viewport = computeViewport(w, h, 2);
      expect(v.width).toBeGreaterThanOrEqual(WORLD_W - 0.001);
      expect(v.height).toBeGreaterThanOrEqual(WORLD_H - 0.001);
      // Le rectangle visible est centré sur la zone de jeu.
      expect(v.left + v.width / 2).toBeCloseTo(WORLD_W / 2, 6);
      expect(v.top + v.height / 2).toBeCloseTo(WORLD_H / 2, 6);
    }
  });

  it("étend la vue dans le sens le plus large (bleed), sans rogner l'autre", () => {
    // Écran plus large que 16:9 → débord horizontal, hauteur pile à WORLD_H.
    const wide: Viewport = computeViewport(1200, 600, 1);
    expect(wide.height).toBeCloseTo(WORLD_H, 6);
    expect(wide.width).toBeGreaterThan(WORLD_W);
    expect(wide.left).toBeLessThan(0);

    // Écran plus haut que 16:9 → débord vertical, largeur pile à WORLD_W.
    const tall: Viewport = computeViewport(600, 1200, 1);
    expect(tall.width).toBeCloseTo(WORLD_W, 6);
    expect(tall.height).toBeGreaterThan(WORLD_H);
    expect(tall.top).toBeLessThan(0);
  });

  it("dimensionne le framebuffer à la densité réelle, plafonnée", () => {
    const v: Viewport = computeViewport(400, 300, 2);
    expect(v.canvasW).toBe(800);
    expect(v.canvasH).toBe(600);
    expect(v.cssW).toBe(400);

    // Au-delà du plafond, on ne paie pas la densité supplémentaire.
    const dense: Viewport = computeViewport(400, 300, 4);
    expect(dense.canvasW).toBe(400 * MAX_DPR);

    // Densité absurde ou nulle : on retombe sur 1, jamais sur 0 ou NaN.
    const zero: Viewport = computeViewport(400, 300, 0);
    expect(zero.canvasW).toBe(400);
    expect(zero.zoom).toBeGreaterThan(0);
  });

  it("retranche les encoches des bords sûrs, converties en unités logiques", () => {
    // WORLD_W×WORLD_H @dpr1 → zoom 1 : 1 px CSS = 1 unité logique, conversion triviale.
    const v: Viewport = computeViewport(WORLD_W, WORLD_H, 1, { top: 40, right: 10, bottom: 20, left: 30 });
    expect(v.zoom).toBeCloseTo(1, 6);
    expect(v.safeTop).toBeCloseTo(v.top + 40, 6);
    expect(v.safeLeft).toBeCloseTo(v.left + 30, 6);
    expect(v.safeRight).toBeCloseTo(v.right - 10, 6);
    expect(v.safeBottom).toBeCloseTo(v.bottom - 20, 6);

    // Sans encoche, les bords sûrs sont les bords tout court.
    const plain: Viewport = computeViewport(WORLD_W, WORLD_H, 1);
    expect(plain.safeTop).toBeCloseTo(plain.top, 6);
    expect(plain.safeBottom).toBeCloseTo(plain.bottom, 6);
  });

  it("signale le portrait pour proposer la rotation", () => {
    expect(computeViewport(375, 812, 2).portrait).toBe(true);
    expect(computeViewport(812, 375, 2).portrait).toBe(false);
  });

  it("traduit le plancher tactile en unités logiques pour chaque appareil", () => {
    // Le contrat : `touchMin` unités logiques doivent VALOIR TOUCH_MIN_CSS pixels réels.
    // C'est la propriété qui compte — la valeur en unités logiques, elle, dépend de l'écran.
    const devices: [string, number, number, number][] = [
      ["bureau", 2004, 1030, 1],
      ["mobile paysage", 780, 360, 2],
      ["tablette", 1024, 768, 2],
      ["petit portable", 1280, 800, 1],
    ];
    for (const [, w, h, dpr] of devices) {
      const v: Viewport = computeViewport(w, h, dpr);
      expect(v.touchMin * v.cssPerLogical).toBeCloseTo(TOUCH_MIN_CSS, 6);
    }
  });

  it("exige des cibles plus grandes sur un écran court que sur un grand écran", () => {
    // Piège que ce socle corrige : une hauteur écrite en dur (ex. 40) est confortable
    // sur un grand écran et trop petite sur mobile — le plancher doit donc MONTER
    // quand l'écran rapetisse, pas rester constant.
    const desktop: Viewport = computeViewport(2004, 1030, 1);
    const mobile: Viewport = computeViewport(780, 360, 2);
    expect(mobile.touchMin).toBeGreaterThan(desktop.touchMin);
    // Sur mobile, un bouton de 40 unités logiques serait sous le plancher : c'est
    // exactement le cas que `touchSize()` doit rattraper.
    expect(mobile.touchMin).toBeGreaterThan(40);
    expect(desktop.touchMin).toBeLessThan(40);
  });

  it("ne divise jamais par zéro sur un écran dégénéré", () => {
    const v: Viewport = computeViewport(0, 0, 1);
    expect(Number.isFinite(v.zoom)).toBe(true);
    expect(v.zoom).toBeGreaterThan(0);
    expect(Number.isFinite(v.width)).toBe(true);
  });
});
