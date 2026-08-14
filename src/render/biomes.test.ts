import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { BIOMES, DEFAULT_BIOME, biomeFor } from "./biomes";
import type { ChapterDef } from "../core/types";

describe("biomes — chaque chapitre a son identité visuelle", () => {
  // Le défaut d'origine : « Le Col du Gel » s'affichait sur la même prairie verte
  // que tous les autres. Un chapitre qui ne se reconnaît pas d'un coup d'œil n'est
  // pas un chapitre, c'est la même carte avec d'autres vagues (ADR-023).
  it("déclare un biome connu sur chaque chapitre jouable", () => {
    for (const ch of CONTENT.chapters) {
      if (!ch.playable) continue;
      expect(ch.biome, `${ch.name} n'a pas de biome`).toBeDefined();
      expect(BIOMES[ch.biome!], `${ch.name} : biome « ${ch.biome} » inconnu`).toBeDefined();
    }
  });

  it("ne réutilise pas le même biome sur deux chapitres consécutifs", () => {
    // Deux chapitres voisins au même décor donnent l'impression de rejouer le même.
    const playable: ChapterDef[] = CONTENT.chapters.filter(c => c.playable);
    for (let i: number = 1; i < playable.length; i++) {
      expect(playable[i]!.biome, `ch${i + 1} a le même décor que le précédent`)
        .not.toBe(playable[i - 1]!.biome);
    }
  });

  it("donne à chaque biome un sol ET une route distincts", () => {
    // Ne changer que le sol laisse une route de terre battue traverser un col gelé.
    const grounds: Set<number> = new Set<number>(), paths: Set<number> = new Set<number>();
    for (const b of Object.values(BIOMES)) {
      grounds.add(b.ground);
      paths.add(b.path);
    }
    expect(grounds.size).toBe(Object.keys(BIOMES).length);
    expect(paths.size).toBe(Object.keys(BIOMES).length);
  });

  it("retombe sur la prairie plutôt que de casser sur un biome inconnu", () => {
    // Un chapitre mal déclaré doit rester jouable ; le test précédent est là pour
    // que l'oubli se voie, celui-ci pour qu'il ne fasse pas écran noir.
    expect(biomeFor(undefined)).toBe(BIOMES[DEFAULT_BIOME]);
    expect(biomeFor("n-existe-pas")).toBe(BIOMES[DEFAULT_BIOME]);
  });

  it("garde un décor désaturé, qui ne concurrence pas les unités", () => {
    // Règle de palette : plus une couleur est saturée, plus elle porte du sens. Un
    // sol vif rendrait les créatures illisibles quel que soit leur propre coloris.
    for (const [id, b] of Object.entries(BIOMES)) {
      const r: number = (b.ground >> 16) & 0xff, g: number = (b.ground >> 8) & 0xff, bl: number = b.ground & 0xff;
      const max: number = Math.max(r, g, bl), min: number = Math.min(r, g, bl);
      const saturation: number = max === 0 ? 0 : (max - min) / max;
      expect(saturation, `biome « ${id} » trop saturé`).toBeLessThan(0.55);
    }
  });
});
