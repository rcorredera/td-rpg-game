import { describe, expect, it } from "vitest";
import { gridLayout } from "./levelGrid";

describe("gridLayout", () => {
  it("remplit la largeur disponible, gouttières comprises", () => {
    const g = gridLayout(10, 640, 5, 10, 74);
    expect(g.cols).toBe(5);
    expect(g.rows).toBe(2);
    // 5 colonnes + 4 gouttières de 10 doivent redonner exactement 640.
    expect(g.cols * g.cellW + 10 * (g.cols - 1)).toBeCloseTo(640, 6);
    expect(g.totalW).toBeCloseTo(640, 6);
  });

  it("ne crée jamais plus de colonnes que de tuiles", () => {
    // 3 chapitres sur 5 colonnes laisseraient deux trous à droite.
    const g = gridLayout(3, 640, 5, 10, 74);
    expect(g.cols).toBe(3);
    expect(g.rows).toBe(1);
    expect(g.cellW).toBeGreaterThan(gridLayout(10, 640, 5, 10, 74).cellW);
  });

  it("ajoute des lignes au-delà du nombre de colonnes", () => {
    expect(gridLayout(11, 640, 5, 10, 74).rows).toBe(3);
    expect(gridLayout(5, 640, 5, 10, 74).rows).toBe(1);
    expect(gridLayout(6, 640, 5, 10, 74).rows).toBe(2);
  });

  it("reste valide sur les cas dégénérés", () => {
    const empty = gridLayout(0, 640, 5, 10, 74);
    expect(empty.cols).toBe(1);
    expect(empty.rows).toBe(0);
    expect(Number.isFinite(empty.cellW)).toBe(true);

    const one = gridLayout(1, 640, 5, 10, 74);
    expect(one.cols).toBe(1);
    expect(one.cellW).toBeCloseTo(640, 6);
  });
});
