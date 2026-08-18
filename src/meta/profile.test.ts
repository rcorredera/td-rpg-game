// Tests de la logique méta : gains de fin de run, achats, progression.
import { describe, expect, it } from "vitest";
import type { BestRun, Profile, RunResult, UnlockDef } from "../core/types";
import { CONTENT, UNLOCKS } from "../content/index";
import { ProfileService } from "./profile";
import type { SaveAdapter } from "./save";

function fresh(): Profile {
  return {
    shards: 0, sceaux: 0, introSeen: false, chaptersWon: [], chapterStars: {}, bestiary: [],
    unlocks: [], forge: {}, skills: { whirlwind: 1, rally: 1 }, bestRuns: [], muted: false,
  };
}

/** Adapter en mémoire : vérifie aussi que chaque mutation est persistée. */
class MemAdapter implements SaveAdapter {
  saves = 0;
  constructor(private p: Profile = fresh()) {}
  load(): Profile { return this.p; }
  save(p: Profile): void { this.p = p; this.saves += 1; }
}

function result(over: Partial<RunResult> = {}): RunResult {
  return {
    victory: false, wavesCleared: 3, castleHpLeft: 0,
    shards: 15, kills: 20, heroKills: 4, heroBlockSeconds: 36, heroDeaths: 0, sceaux: 1, seenEnemies: ["goblin"], stars: 0,
    ...over,
  };
}

describe("ProfileService — fin de run", () => {
  it("crédite Éclats et Sceaux, fusionne le bestiaire, et persiste", () => {
    const a: MemAdapter = new MemAdapter();
    const svc: ProfileService = new ProfileService(a);
    svc.applyRunResult(result(), 0);
    svc.applyRunResult(result({ seenEnemies: ["goblin", "orc"] }), 0);
    const p: Profile = svc.get();
    expect(p.shards).toBe(30);
    expect(p.sceaux).toBe(2);
    expect(p.bestiary).toEqual(["goblin", "orc"]); // pas de doublon
    expect(a.saves).toBe(2);
  });

  it("une victoire marque le chapitre conquis (une seule fois), une défaite jamais", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    svc.applyRunResult(result({ victory: false }), 2);
    expect(svc.chapterWon(2)).toBe(false);
    svc.applyRunResult(result({ victory: true }), 2);
    svc.applyRunResult(result({ victory: true }), 2);
    expect(svc.get().chaptersWon).toEqual([2]);
  });

  it("les Chroniques gardent le top 5, triées par vagues puis kills", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    for (const [waves, kills] of [[2, 10], [8, 50], [5, 30], [8, 70], [1, 5], [6, 40], [3, 20]] as const) {
      svc.applyRunResult(result({ wavesCleared: waves, kills }), 0);
    }
    const runs: BestRun[] = svc.get().bestRuns;
    expect(runs).toHaveLength(5);
    expect(runs.map(r => [r.waves, r.kills])).toEqual([[8, 70], [8, 50], [6, 40], [5, 30], [3, 20]]);
    expect(runs[0]!.chapter).toBe(0);
  });

  it("la meilleure note en étoiles est conservée par chapitre, jamais dégradée", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    svc.applyRunResult(result({ victory: true, stars: 2 }), 1);
    expect(svc.chapterStarsOf(1)).toBe(2);
    svc.applyRunResult(result({ victory: true, stars: 3 }), 1);
    expect(svc.chapterStarsOf(1)).toBe(3);
    svc.applyRunResult(result({ victory: true, stars: 1 }), 1); // moins bien → ignoré
    expect(svc.chapterStarsOf(1)).toBe(3);
    expect(svc.chapterStarsOf(5)).toBe(0); // jamais joué
  });

  it("l'Histoire est achevée quand le dernier chapitre est conquis", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    expect(svc.storyCompleted()).toBe(false);
    svc.applyRunResult(result({ victory: true }), CONTENT.chapters.length - 1);
    expect(svc.storyCompleted()).toBe(true);
  });
});

describe("ProfileService — son coupé", () => {
  it("bascule et persiste, désactivé par défaut", () => {
    const a: MemAdapter = new MemAdapter();
    const svc: ProfileService = new ProfileService(a);
    expect(svc.isMuted()).toBe(false);
    expect(svc.toggleMuted()).toBe(true);
    expect(svc.isMuted()).toBe(true);
    expect(a.saves).toBe(1);
    expect(svc.toggleMuted()).toBe(false);
    expect(svc.isMuted()).toBe(false);
  });
});

describe("ProfileService — achats", () => {
  it("unlock : débit des Éclats, pas de rachat, pas d'achat sans fonds", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    const u: UnlockDef = UNLOCKS[0]!;
    expect(svc.buy(u.id)).toBe(false); // 0 Éclat
    svc.get().shards = u.cost;
    expect(svc.buy(u.id)).toBe(true);
    expect(svc.get().shards).toBe(0);
    expect(svc.get().unlocks).toEqual([u.id]);
    svc.get().shards = 999;
    expect(svc.buy(u.id)).toBe(false); // déjà acquis
  });

  it("forge : coûts croissants jusqu'au niveau max, tour inconnue refusée", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    svc.get().shards = 1000;
    for (const cost of CONTENT.forge.upgradeCosts) {
      expect(svc.forgeNextCost("tower_archer")).toBe(cost);
      expect(svc.buyForge("tower_archer")).toBe(true);
    }
    expect(svc.forgeNextCost("tower_archer")).toBeNull();
    expect(svc.buyForge("tower_archer")).toBe(false); // max
    const spent: number = CONTENT.forge.upgradeCosts.reduce((a, b) => a + b, 0);
    expect(svc.get().shards).toBe(1000 - spent);
    expect(svc.buyForge("tower_inexistante")).toBe(false);
  });

  it("sorts : débit des Sceaux, plafonné au nombre de niveaux du content", () => {
    const svc: ProfileService = new ProfileService(new MemAdapter());
    svc.get().sceaux = 1000;
    const maxLvl: number = CONTENT.hero.skills.whirlwind.levels.length;
    let bought: number = 0;
    while (svc.buySkill("whirlwind")) bought++;
    expect(bought).toBe(maxLvl - 1);
    expect(svc.skillLevel("whirlwind")).toBe(maxLvl);
    const spent: number = CONTENT.hero.skills.whirlwind.upgradeCosts.reduce((a, b) => a + b, 0);
    expect(svc.get().sceaux).toBe(1000 - spent);
  });
});
