import { describe, expect, it } from "vitest";
import { CONTENT, UNLOCKS } from "../content/index";
import { computeResult } from "../core/sim";
import { autoplayChapter } from "./autoplay";
import { playableChapter } from "./datasheet";
import { economyHealth, sceauxForRun, shardsForRun, sinks } from "./economy";

describe("economy — miroir fidèle du barème de fin de run", () => {
  // Même exigence que pour le datasheet : `shardsForRun` duplique la formule de
  // `computeResult` pour la projeter sans jouer. Les deux doivent coïncider, sinon
  // le rapport de méta-progression conseille des ajustements sur des chiffres faux.
  it("projette les mêmes Éclats qu'un run réellement joué", () => {
    for (let i = 0; i < CONTENT.chapters.length; i++) {
      if (!CONTENT.chapters[i]!.playable) continue;
      const run = autoplayChapter(CONTENT, i, { policy: "focus" });
      const ch = playableChapter(CONTENT, i);
      const projected = shardsForRun(CONTENT, i, {
        victory: run.result.victory,
        wavesCleared: run.result.wavesCleared,
        castleHpPct: run.result.castleHpLeft / ch.map.castleHp,
      });
      expect(projected, `chapitre ${i + 1}`).toBe(run.result.shards);
    }
  });

  it("projette les mêmes Sceaux qu'un run réellement joué", () => {
    const run = autoplayChapter(CONTENT, 0, { policy: "focus" });
    expect(sceauxForRun(CONTENT, run.result.heroBlockSeconds, run.result.victory, run.result.heroDeaths))
      .toBe(run.result.sceaux);
  });

  it("suit le barème depuis le content, pas depuis des constantes recopiées", () => {
    // ADR-003 : le barème vit dans `content`. Le modifier DOIT déplacer la projection ;
    // si ce test passe encore avec un barème doublé, c'est qu'une valeur est en dur.
    const doubled = { ...CONTENT, rewards: { ...CONTENT.rewards, shardsPerWave: CONTENT.rewards.shardsPerWave * 2 } };
    expect(shardsForRun(doubled, 0)).toBeGreaterThan(shardsForRun(CONTENT, 0));
  });

  it("applique le multiplicateur de chapitre quand il existe", () => {
    // Le levier contre le farm du premier chapitre : sans effet mesurable ici, il
    // serait déclaré dans les types mais ignoré par la sim. Comparé à un barème PLAT
    // et non au content courant, qui porte désormais sa propre courbe.
    const flat = { ...CONTENT, rewards: { ...CONTENT.rewards, shardsChapterMult: undefined } };
    const scaled = {
      ...CONTENT,
      rewards: { ...CONTENT.rewards, shardsChapterMult: CONTENT.chapters.map((_, i) => 1 + i) },
    };
    expect(shardsForRun(scaled, 0)).toBe(shardsForRun(flat, 0));
    expect(shardsForRun(scaled, 2)).toBe(shardsForRun(flat, 2) * 3);
  });

  it("fait payer les chapitres tardifs nettement plus que le premier", () => {
    // GARANTIE : tant que le ratio reste proche de 1, farmer la carte la plus facile
    // est strictement optimal — c'était le cas (×1,11 entre le ch.1 et le ch.10).
    const h = economyHealth(CONTENT, UNLOCKS);
    expect(h.lastVsFirstRatio).toBeGreaterThanOrEqual(2);
  });

  it("garde l'armurerie ouverte sur toute la campagne", () => {
    // Elle se vidait en 2 runs pour 10 chapitres. Le seuil se compare au nombre de
    // chapitres, il n'est pas arbitraire.
    const h = economyHealth(CONTENT, UNLOCKS);
    expect(h.runsToBuyUnlocks).toBeGreaterThanOrEqual(4);
  });
});

describe("economy — santé de la méta", () => {
  it("additionne le puits complet : armurerie ET forge", () => {
    const s = sinks(CONTENT, UNLOCKS);
    expect(s.unlocks).toBe(UNLOCKS.reduce((a, u) => a + u.cost, 0));
    const perTower = CONTENT.forge.upgradeCosts.reduce((a, b) => a + b, 0);
    expect(s.forge).toBe(perTower * Object.keys(CONTENT.towers).length);
    expect(s.totalShards).toBe(s.unlocks + s.forge);
  });

  it("détecte une armurerie saturée avant la fin du jeu", () => {
    // C'est le symptôme constaté en jouant : tout acheté au chapitre 3 sur 10.
    // Le seuil n'est pas arbitraire — il compare le nombre de runs au nombre de chapitres.
    const h = economyHealth(CONTENT, UNLOCKS);
    expect(h.runsToBuyUnlocks).toBeLessThan(h.chapterCount);
  });

  it("mesure la platitude de la courbe de récompense", () => {
    // Tant que le dernier chapitre paie comme le premier, farmer le plus facile est
    // strictement optimal. Ce ratio est l'indicateur à faire monter.
    const h = economyHealth(CONTENT, UNLOCKS);
    expect(h.lastVsFirstRatio).toBeGreaterThan(0);
    expect(h.shardsPerChapter).toHaveLength(h.chapterCount);
  });

  it("réagit à un catalogue élargi", () => {
    const bigger = [...UNLOCKS, { id: "x", name: "X", desc: "", cost: 1000 }];
    expect(economyHealth(CONTENT, bigger).runsToBuyUnlocks)
      .toBeGreaterThan(economyHealth(CONTENT, UNLOCKS).runsToBuyUnlocks);
  });
});
