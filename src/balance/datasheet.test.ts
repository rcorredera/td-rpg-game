import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { createRun, startNextWave, tick } from "../core/sim";
import type { ContentPack, Profile, RunState } from "../core/types";
import {
  allChapterStats, chapterStats, castleDamageOf, enemyHpAtWave, pathLength,
  playableChapter, slotCoverage, towerBurstDps, towerDps, towerInvestment,
  traversalSeconds, waveStats,
} from "./datasheet";

function blankProfile(): Profile {
  return {
    shards: 0, sceaux: 0, introSeen: true, chaptersWon: [], chapterStars: {},
    bestiary: [], unlocks: [], forge: {}, skills: { whirlwind: 1, rally: 1 }, bestRuns: [],
  };
}

/** Amène un run au début de la vague `waveIndex` et fait sortir les premiers spawns. */
function runAtWave(chapterIndex: number, waveIndex: number): RunState {
  const s = createRun(CONTENT, blankProfile(), chapterIndex);
  s.waveIndex = waveIndex - 1;
  s.phase = "building";
  startNextWave(s, CONTENT);
  for (let i = 0; i < 60 * 20 && s.enemies.length === 0; i++) tick(s, CONTENT, 1 / 60);
  return s;
}

describe("datasheet — miroir fidèle de la simulation", () => {
  // LE test du banc d'essai. Si une formule d'analyse diverge de la sim, tous les
  // chiffres du rapport deviennent faux SANS que rien n'échoue : on rééquilibrerait
  // le jeu sur des mesures inventées. Chaque formule dupliquée est donc confrontée
  // à la sim elle-même, pas à une valeur écrite à la main.
  it("calcule les mêmes PV que la sim, à chaque vague de chaque chapitre", () => {
    for (const ch of allChapterStats(CONTENT)) {
      for (let w = 0; w < ch.waveCount; w++) {
        const s = runAtWave(ch.index, w);
        const spawned = s.enemies[0];
        expect(spawned, `ch${ch.index + 1} v${w + 1} : aucun ennemi apparu`).toBeDefined();
        expect(spawned!.maxHp).toBe(enemyHpAtWave(CONTENT, spawned!.defId, w));
      }
    }
  });

  it("calcule les mêmes dégâts au château que la sim", () => {
    // Un ennemi lâché en bout de chemin : la sim applique son propre calcul d'impact.
    const s = createRun(CONTENT, blankProfile(), 0);
    const ch = playableChapter(CONTENT, 0);
    const hpMult = 2.5;
    s.waveIndex = 0;
    s.phase = "wave";
    s.pendingSpawns.push({ at: 0, enemyId: "brute", hpMult, pathIndex: 0 });
    tick(s, CONTENT, 1 / 60);
    const enemy = s.enemies[0]!;
    enemy.dist = pathLength(ch.map.paths[0]!.waypoints) + 10; // au château
    const before = s.castleHp;
    tick(s, CONTENT, 1 / 60);
    expect(before - s.castleHp).toBe(castleDamageOf(CONTENT, "brute", hpMult));
  });

  it("compte tous les ennemis d'une vague, mini-boss compris", () => {
    // Oublier le mini-boss sous-estimerait la vague la plus dangereuse du chapitre.
    const ch = playableChapter(CONTENT, 0);
    for (let w = 0; w < ch.waves.length; w++) {
      const wave = ch.waves[w]!;
      const expected = wave.spawns.reduce((a, sp) => a + sp.count, 0) + (wave.miniBoss ? 1 : 0);
      expect(waveStats(CONTENT, 0, w).count).toBe(expected);
    }
  });
});

describe("datasheet — métriques dérivées", () => {
  it("sépare le DPS mono-cible du DPS de pointe", () => {
    // Confondre les deux fait passer une tour anti-horde pour un tueur de boss.
    const salve = CONTENT.towers.tower_archer!.specs!.find(s => s.id === "spec_volley")!;
    const level = CONTENT.towers.tower_archer!.levels.length;
    const solo = towerDps(CONTENT, "tower_archer", level, salve.id);
    const burst = towerBurstDps(CONTENT, "tower_archer", level, salve.id);
    expect(burst).toBeCloseTo(solo * salve.multishot!, 5);
    expect(burst).toBeGreaterThan(solo);
  });

  it("chiffre l'investissement cumulé, pas le coût du dernier palier", () => {
    const def = CONTENT.towers.tower_archer!;
    expect(towerInvestment(CONTENT, "tower_archer", 1)).toBe(def.costs[0]);
    expect(towerInvestment(CONTENT, "tower_archer", 3))
      .toBe(def.costs[0]! + def.costs[1]! + def.costs[2]!);
  });

  it("mesure une fenêtre de tir strictement positive sur chaque chapitre", () => {
    // Une traversée nulle voudrait dire un chemin dégénéré : la carte serait injouable.
    for (const ch of allChapterStats(CONTENT)) {
      expect(traversalSeconds(CONTENT, ch.index, 0, "goblin")).toBeGreaterThan(0);
      expect(ch.shortestPath).toBeGreaterThan(0);
    }
  });

  it("agrège la masse d'un chapitre depuis ses vagues", () => {
    const ch = chapterStats(CONTENT, 0);
    const sum = ch.waves.reduce((a, w) => a + w.totalHp, 0);
    expect(ch.totalHp).toBe(sum);
    expect(ch.waveCount).toBe(ch.waves.length);
  });

  it("repère la pression aérienne, que les catapultes ne peuvent pas traiter", () => {
    // Un chapitre 100% volant avec des tours `groundOnly` seulement serait ingagnable :
    // la part de PV volants est la métrique qui l'annonce avant de jouer.
    for (const ch of allChapterStats(CONTENT)) {
      expect(ch.flyingHpShare).toBeGreaterThanOrEqual(0);
      expect(ch.flyingHpShare).toBeLessThanOrEqual(1);
    }
  });

  it("refuse un chapitre injouable plutôt que de rendre des zéros", () => {
    expect(() => playableChapter(CONTENT, 999)).toThrow();
  });
});

describe("cartes — toute voie doit être défendable", () => {
  // Une voie que peu d'emplacements atteignent n'est pas « plus difficile », elle
  // est injouable : le joueur n'a nulle part où poser une tour qui la couvre. Défaut
  // réel du layout « Tenailles » — 3 emplacements sur 6 atteignaient sa seconde voie,
  // 27 % plus courte que la principale, d'où une fuite systématique dès la vague 4.
  const MIN_SHARE = 2 / 3;

  it("laisse au moins deux tiers des emplacements couvrir chaque voie", () => {
    for (let i = 0; i < CONTENT.chapters.length; i++) {
      if (!CONTENT.chapters[i]!.playable) continue;
      const ch = playableChapter(CONTENT, i);
      const need = Math.ceil(ch.map.slots.length * MIN_SHARE);
      slotCoverage(CONTENT, i).forEach((n, lane) => {
        expect(n, `ch${i + 1} voie ${lane + 1} : ${n}/${ch.map.slots.length} emplacements à portée`)
          .toBeGreaterThanOrEqual(need);
      });
    }
  });

  it("échouerait sur une carte dont une voie est hors de portée", () => {
    // Contre-épreuve : sans elle, le test précédent pourrait passer parce que
    // `slotCoverage` compte tout, pas parce que les cartes sont bien dessinées.
    const far: ContentPack = {
      ...CONTENT,
      chapters: [{
        id: "x", name: "X", lore: "", playable: true,
        map: {
          castleHp: 20,
          paths: [{ waypoints: [{ x: 0, y: 0 }, { x: 800, y: 0 }] }],
          slots: [{ x: 400, y: 580 }, { x: 200, y: 560 }],
        },
        waves: [],
      }],
    };
    expect(slotCoverage(far, 0)).toEqual([0]);
  });

  it("garde des voies de longueurs comparables sur une même carte", () => {
    // Deux voies permanentes de longueurs très différentes créent un déséquilibre
    // invisible : la plus courte laisse moins de temps de tir à défense égale. Un
    // portail de Faille, lui, est un raccourci ASSUMÉ — exclu de la règle.
    for (let i = 0; i < CONTENT.chapters.length; i++) {
      if (!CONTENT.chapters[i]!.playable) continue;
      const ch = playableChapter(CONTENT, i);
      const lens = ch.map.paths.filter(p => !p.portal).map(p => pathLength(p.waypoints));
      if (lens.length < 2) continue;
      const ratio = Math.max(...lens) / Math.min(...lens);
      expect(ratio, `ch${i + 1} : voies de ${lens.map(Math.round).join(" et ")} px`)
        .toBeLessThan(1.25);
    }
  });
});
