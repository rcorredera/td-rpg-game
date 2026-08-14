import { describe, expect, it } from "vitest";
import { EMBLEM, ICON } from "./icons";

describe("registre d'icônes UI", () => {
  it("associe une texture distincte à chaque rôle", () => {
    const keys: string[] = Object.values(ICON);
    expect(new Set(keys).size).toBe(keys.length);
    // Un mot composé est admis (`ui_star_empty`) : ce que la convention protège,
    // c'est le PRÉFIXE — aucune icône d'UI ne doit pouvoir entrer en collision
    // avec une texture du monde — et la casse, pas le nombre de mots.
    for (const k of keys) expect(k).toMatch(/^ui_[a-z]+(?:_[a-z]+)*$/);
  });

  it("couvre les rôles attendus par les écrans", () => {
    // Garde-fou : un rôle retiré du registre casse ici plutôt qu'à l'écran, où
    // l'icône manquante rendrait juste une texture verte de remplacement.
    // `armory`/`chronicles` vivent dans EMBLEM (couvert ci-dessous) : des rasters
    // du pack, pas des silhouettes teintables.
    for (const role of ["story", "rift", "bestiary", "locked", "castle",
      "star", "starEmpty", "fullscreen", "fullscreenExit", "chevronDown"]) {
      expect(ICON).toHaveProperty(role);
    }
  });

  it("couvre les emblèmes RASTER attendus, séparés des icônes", () => {
    // Les deux registres ne se mélangent pas : une icône est une silhouette
    // monochrome que le rendu teinte pour porter un état, un emblème arrive du
    // pack avec ses couleurs. Les préfixer distinctement empêche de teinter l'un
    // en croyant manipuler l'autre.
    for (const role of ["bastion", "armory", "chronicles"]) expect(EMBLEM).toHaveProperty(role);
    const keys: ("ts_castle" | "ts_shield" | "ts_swords")[] = Object.values(EMBLEM);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^ts_[a-z]+$/);
    expect(keys.some(k => Object.values(ICON).includes(k as never))).toBe(false);
  });
});
