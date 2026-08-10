// Garantit que le registre de skin couvre TOUT le contenu : ajouter un ennemi
// ou une tour sans son sprite casse ce test (pas une surprise en jeu).
import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { enemyView, heroView, SHEET_FRAME_MAX, tileFor, towerView, type SpriteRef, type TileKind } from "./sprites";

const validRef = (r: SpriteRef) => {
  expect(["td"]).toContain(r.sheet);
  expect(r.frame).toBeGreaterThanOrEqual(0);
  expect(r.frame).toBeLessThanOrEqual(SHEET_FRAME_MAX);
};

describe("registre de sprites (sprites.ts)", () => {
  it("mappe chaque ennemi de CONTENT vers une frame valide", () => {
    for (const defId of Object.keys(CONTENT.enemies)) validRef(enemyView(defId));
  });

  it("mappe chaque tour de CONTENT (socle + emblème) vers des frames valides", () => {
    for (const defId of Object.keys(CONTENT.towers)) {
      const v = towerView(defId);
      validRef(v.base);
      if (v.emblem) validRef(v.emblem);
    }
  });

  it("mappe le héros et chaque type de tuile", () => {
    validRef(heroView());
    for (const kind of ["grass", "grassAlt", "path", "pad"] as TileKind[]) validRef(tileFor(kind));
  });

  it("lève sur un defId inconnu (détecte un sprite oublié)", () => {
    expect(() => enemyView("inconnu")).toThrow();
    expect(() => towerView("inconnu")).toThrow();
  });
});
