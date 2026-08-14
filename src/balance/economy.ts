// ============================================================
// balance/economy.ts — Santé de la MÉTA-PROGRESSION (ADR-018).
//
// Une méta tient si la SOURCE (ce qu'un run rapporte) et le PUITS (ce qu'il y a
// à acheter) restent en tension sur toute la durée du jeu. Deux façons de la
// casser : un puits trop petit — tout est acheté avant la fin — ou une source
// plate — un chapitre tardif ne rapporte pas plus qu'un rejeu du premier, et
// farmer la carte la plus facile devient optimal.
//
// Ce module mesure les deux. PUR : dérive tout de `ContentPack` + `UNLOCKS`.
// ============================================================

import type { ContentPack, PlayableChapter, RewardRules } from "../core/types";
import type { UnlockDef } from "../core/types";
import { playableChapter } from "./datasheet";

/** Gains d'un run, calculés comme `computeResult` — même barème, sans jouer. */
export function shardsForRun(
  c: ContentPack,
  chapterIndex: number,
  opts: { victory?: boolean; castleHpPct?: number; wavesCleared?: number } = {},
): number {
  const ch: PlayableChapter = playableChapter(c, chapterIndex);
  const victory: boolean = opts.victory ?? true;
  const waves: number = opts.wavesCleared ?? ch.waves.length;
  const r: RewardRules = c.rewards;
  const base: number = waves * r.shardsPerWave;
  const hpBonus: number = victory ? Math.round((opts.castleHpPct ?? 1) * r.shardsCastleBonus) : 0;
  const victoryBonus: number = victory ? r.shardsVictoryBonus : 0;
  const mult: number = r.shardsChapterMult?.[chapterIndex] ?? 1;
  return Math.max(waves > 0 ? r.shardsFloor : 0, Math.round((base + hpBonus + victoryBonus) * mult));
}

export function sceauxForRun(c: ContentPack, heroBlockSeconds: number, victory = true, heroDeaths = 0): number {
  return Math.max(0,
    Math.floor(heroBlockSeconds / c.rewards.heroBlockSecondsPerSceau)
    + (victory ? c.rewards.sceauxVictoryBonus : 0)
    - heroDeaths * c.rewards.sceauxPerHeroDeath,
  );
}

// ---------- Puits ----------

export interface SinkBreakdown {
  /** Coût cumulé des déblocages de l'armurerie. */
  unlocks: number;
  /** Coût cumulé de tous les niveaux de forge, toutes tours. */
  forge: number;
  /** Total des Éclats qu'il y a à dépenser dans le jeu. */
  totalShards: number;
  /** Coût cumulé des niveaux de sorts, en Sceaux. */
  totalSceaux: number;
}

export function sinks(c: ContentPack, unlocks: UnlockDef[]): SinkBreakdown {
  const unlockCost: number = unlocks.reduce((a, u) => a + u.cost, 0);
  const perTower: number = c.forge.upgradeCosts.reduce((a, b) => a + b, 0);
  const forgeCost: number = perTower * Object.keys(c.towers).length;
  const sceauxCost: number = Object.values(c.hero.skills)
    .reduce((a, sk) => a + sk.upgradeCosts.reduce((x, y) => x + y, 0), 0);
  return {
    unlocks: unlockCost,
    forge: forgeCost,
    totalShards: unlockCost + forgeCost,
    totalSceaux: sceauxCost,
  };
}

// ---------- Verdict ----------

export interface EconomyHealth {
  sinks: SinkBreakdown;
  /** Éclats d'une victoire parfaite, par chapitre. */
  shardsPerChapter: number[];
  /** Éclats d'une victoire parfaite sur le PREMIER chapitre — la référence du farm. */
  firstChapterShards: number;
  /** Éclats du dernier chapitre rapportés au premier. 1.0 = aucune progression. */
  lastVsFirstRatio: number;
  /** Runs du chapitre 1 pour tout acheter dans l'armurerie. */
  runsToBuyUnlocks: number;
  /** Runs du chapitre 1 pour épuiser TOUT le puits d'Éclats (armurerie + forge). */
  runsToDrainShards: number;
  /** Runs pour maxer les sorts, au temps de blocage supposé par run. */
  runsToMaxSkills: number;
  /** Chapitres jouables disponibles — la durée à couvrir. */
  chapterCount: number;
}

/** `blockSecondsPerRun` : médiane MESURÉE au banc (14 à 50 s selon le chapitre), pas une hypothèse — la valeur optimiste d'origine faisait croire le puits de Sceaux trois fois plus vite rempli qu'il ne l'est. */
export function economyHealth(c: ContentPack, unlocks: UnlockDef[], blockSecondsPerRun = 35): EconomyHealth {
  const playable: number[] = c.chapters.flatMap((ch, i) => (ch.playable ? [i] : []));
  const shardsPerChapter: number[] = playable.map(i => shardsForRun(c, i));
  const first: number = shardsPerChapter[0] ?? 0;
  const last: number = shardsPerChapter[shardsPerChapter.length - 1] ?? 0;
  const s: SinkBreakdown = sinks(c, unlocks);
  const perRunSceaux: number = sceauxForRun(c, blockSecondsPerRun);
  return {
    sinks: s,
    shardsPerChapter,
    firstChapterShards: first,
    lastVsFirstRatio: first === 0 ? 0 : last / first,
    runsToBuyUnlocks: first === 0 ? Infinity : Math.ceil(s.unlocks / first),
    runsToDrainShards: first === 0 ? Infinity : Math.ceil(s.totalShards / first),
    runsToMaxSkills: perRunSceaux === 0 ? Infinity : Math.ceil(s.totalSceaux / perRunSceaux),
    chapterCount: playable.length,
  };
}
