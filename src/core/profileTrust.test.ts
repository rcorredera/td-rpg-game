// ============================================================
// Le PROFIL n'est pas une donnée de confiance.
//
// Ce test existe parce qu'un profil portant `skills.rally = 99` traversait tout
// et faisait planter la partie au premier tir de tour :
// `Cannot read properties of undefined (reading 'fireRateMult')`. Reproduit avant
// correction, sur un run complet du chapitre 1.
//
// Le profil vient de `localStorage`. Il peut donc avoir été écrit par une version
// antérieure du jeu, avoir survécu à une réduction du content, ou avoir été
// modifié à la main dans la console du navigateur — c'est un jeu web, cette
// dernière hypothèse n'est pas théorique. `normalize` (meta/save.ts) vérifie que
// les champs ont le bon TYPE, pas que leurs valeurs désignent quelque chose.
//
// La garde porte sur la FAMILLE : tout niveau venu du profil qui sert à indexer
// une table du content est borné à `createRun`, unique point d'entrée du profil
// dans la simulation. Le test balaie donc les deux sorts et une gamme de valeurs
// aberrantes, plutôt que le seul `rally: 99` trouvé.
// ============================================================

import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { buildTower, createRun, startNextWave, tick } from "./sim";
import type { PlayableChapter, Profile, RunState, SimEvent } from "./types";

/** Profil neuf, puis on y injecte le niveau aberrant à tester. */
function profileWith(skills: { whirlwind: number; rally: number }): Profile {
  return {
    shards: 0, sceaux: 0, introSeen: true, chaptersWon: [], chapterStars: {},
    bestiary: [], unlocks: [], forge: {}, skills, bestRuns: [],
    audio: { master: true, music: true, notifications: true, damage: true, volume: 1 },
  };
}

/** Joue assez longtemps pour que des tours TIRENT — c'est là que le défaut frappait. */
function playUntilFirstShots(s: RunState, ch: PlayableChapter): number {
  for (let i: number = 0; i < ch.map.slots.length; i++) {
    buildTower(s, CONTENT, i, "tower_archer", CONTENT.unlocks.map((u) => u.id));
  }
  startNextWave(s, CONTENT);
  let shots: number = 0;
  for (let f: number = 0; f < 3000 && shots < 5; f++) {
    const evs: SimEvent[] = tick(s, CONTENT, 1 / 60);
    shots += evs.filter((e) => e.type === "shot").length;
    if (s.phase === "building") startNextWave(s, CONTENT);
  }
  return shots;
}

const CH1: PlayableChapter = CONTENT.chapters[0] as PlayableChapter;
const RALLY_MAX: number = CONTENT.hero.skills.rally.levels.length;
const WHIRL_MAX: number = CONTENT.hero.skills.whirlwind.levels.length;

/** Valeurs qu'un profil abîmé peut réellement porter. */
const ABERRANTES: readonly number[] = [99, 0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY];

describe("profil non fiable — les niveaux de sorts sont bornés au content", () => {
  it("aucun niveau aberrant ne fait planter une partie qui tire", () => {
    for (const bad of ABERRANTES) {
      for (const skills of [{ whirlwind: 1, rally: bad }, { whirlwind: bad, rally: 1 }]) {
        const s: RunState = createRun(CONTENT, profileWith(skills), 0);
        expect(
          () => playUntilFirstShots(s, CH1),
          `profil { whirlwind: ${skills.whirlwind}, rally: ${skills.rally} }`,
        ).not.toThrow();
      }
    }
  });

  it("le niveau retenu désigne toujours un palier existant", () => {
    for (const bad of ABERRANTES) {
      const s: RunState = createRun(CONTENT, profileWith({ whirlwind: bad, rally: bad }), 0);
      expect(CONTENT.hero.skills.rally.levels[s.skillLevels.rally - 1], `rally depuis ${bad}`).toBeDefined();
      expect(CONTENT.hero.skills.whirlwind.levels[s.skillLevels.whirlwind - 1], `whirlwind depuis ${bad}`).toBeDefined();
    }
  });

  it("un niveau trop haut retombe sur le palier maximal, pas sur le premier", () => {
    // Écraser à 1 « corrigerait » le crash en dépouillant silencieusement un
    // joueur de la progression qu'il a payée en Sceaux. On borne, on ne réinitialise pas.
    const s: RunState = createRun(CONTENT, profileWith({ whirlwind: 50, rally: 50 }), 0);
    expect(s.skillLevels.rally).toBe(RALLY_MAX);
    expect(s.skillLevels.whirlwind).toBe(WHIRL_MAX);
  });

  it("un niveau légitime traverse inchangé", () => {
    const s: RunState = createRun(CONTENT, profileWith({ whirlwind: 2, rally: 2 }), 0);
    expect(s.skillLevels).toEqual({ whirlwind: 2, rally: 2 });
  });
});
