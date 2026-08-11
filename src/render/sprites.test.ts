// Garantit que le registre de skin couvre TOUT le contenu : ajouter un ennemi
// ou une tour sans son sprite casse ce test (pas une surprise en jeu).
import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { enemyView, heroView, keepView, SHEET_FRAME_MAX, tileFor, towerView, type SpriteRef, type TileKind } from "./sprites";

/** Une référence doit désigner soit une texture autonome (`key` seul), soit une
 *  frame de planche valide. Les deux formes coexistent depuis ADR-016. */
const validRef = (r: SpriteRef) => {
  expect(typeof r.key).toBe("string");
  expect(r.key.length).toBeGreaterThan(0);
  if (r.frame !== undefined) {
    expect(r.frame).toBeGreaterThanOrEqual(0);
    expect(r.frame).toBeLessThanOrEqual(SHEET_FRAME_MAX);
  }
};

describe("registre de sprites (sprites.ts)", () => {
  it("mappe chaque ennemi de CONTENT vers une texture valide", () => {
    for (const defId of Object.keys(CONTENT.enemies)) validRef(enemyView(defId));
  });

  it("mappe chaque tour de CONTENT vers une texture valide", () => {
    for (const defId of Object.keys(CONTENT.towers)) {
      const v = towerView(defId);
      validRef(v.base);
      if (v.emblem) validRef(v.emblem);
    }
  });

  it("mappe le héros, le Bastion et chaque type de tuile", () => {
    validRef(heroView());
    validRef(keepView());
    for (const kind of ["pad", "keep"] as TileKind[]) validRef(tileFor(kind));
  });

  it("donne une texture DISTINCTE à chaque ennemi", () => {
    // Deux ennemis partageant un sprite seraient indiscernables en jeu — c'est
    // précisément ce que le skin médiéval corrige.
    const keys = Object.keys(CONTENT.enemies).map(id => enemyView(id).key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("lève sur un defId inconnu (détecte un sprite oublié)", () => {
    expect(() => enemyView("inconnu")).toThrow();
    expect(() => towerView("inconnu")).toThrow();
  });
});
