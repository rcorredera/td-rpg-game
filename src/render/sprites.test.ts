// Garantit que le registre de skin couvre TOUT le contenu : ajouter un ennemi
// ou une tour sans son sprite casse ce test (pas une surprise en jeu).
import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { enemyView, heroView, keepView, SHEET_FRAME_MAX, tileFor, towerView, type SpriteRef, type TileKind } from "./sprites";
import type { TowerView } from "./sprites";

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
      const v: TowerView = towerView(defId);
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
    const keys: string[] = Object.keys(CONTENT.enemies).map(id => enemyView(id).key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("lève sur un defId inconnu (détecte un sprite oublié)", () => {
    expect(() => enemyView("inconnu")).toThrow();
    expect(() => towerView("inconnu")).toThrow();
  });
});

describe("paliers visuels de tour (ADR-017)", () => {
  it("change de sprite au niveau 3 et à la spécialisation", () => {
    // L'amélioration doit se voir sur la carte : sans ça, le joueur ne distingue
    // pas une tour de rang 1 d'une tour maximale.
    for (const defId of Object.keys(CONTENT.towers)) {
      const lvl1: string = towerView(defId, 1).base.key;
      const lvl3: string = towerView(defId, 3).base.key;
      expect(lvl3).not.toBe(lvl1);
      // Niveau 2 reste au palier bas : le saut visuel marque le niveau max.
      expect(towerView(defId, 2).base.key).toBe(lvl1);
      // Une tour spécialisée est au moins au palier haut.
      expect(towerView(defId, 3, "spec_x").base.key).toBe(lvl3);
    }
  });

  it("distingue deux spécialisations d'un même palier par la teinte", () => {
    const plain: TowerView = towerView("tower_catapult", 4, "spec_trebuchet");
    const fire: TowerView = towerView("tower_catapult", 4, "spec_greekfire");
    expect(plain.base.key).toBe(fire.base.key);
    expect(fire.base.tint).toBeDefined();
    expect(plain.base.tint).not.toBe(fire.base.tint);
  });

  it("borne le palier aux sprites réellement disponibles", () => {
    // Un niveau au-delà des paliers dessinés ne doit pas viser une texture absente.
    expect(() => towerView("tower_archer", 99, "spec_volley")).not.toThrow();
    expect(towerView("tower_archer", 99).base.key).toBeTruthy();
  });
});
