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

import type { ContentPack } from "../core/types";
import type { UnlockDef } from "../content/index";
import { playableChapter } from "./datasheet";

/** Gains d'un run, calculés comme `computeResult` — même barème, sans jouer. */
export function shardsForRun(
  c: ContentPack,
  chapterIndex: number,
  opts: { victory?: boolean; castleHpPct?: number; wavesCleared?: number } = {},
): number {
  const ch = playableChapter(c, chapterIndex);
  const victory = opts.victory ?? true;
  const waves = opts.wavesCleared ?? ch.waves.length;
  const r = c.rewards;
  const base = waves * r.shardsPerWave;
  const hpBonus = victory ? Math.round((opts.castleHpPct ?? 1) * r.shardsCastleBonus) : 0;
  const victoryBonus = victory ? r.shardsVictoryBonus : 0;
  const mult = r.shardsChapterMult?.[chapterIndex] ?? 1;
  return Math.max(waves > 0 ? r.shardsFloor : 0, Math.round((base + hpBonus + victoryBonus) * mult));
}

export function sceauxForRun(c: ContentPack, heroKills: number, victory = true): number {
  return Math.floor(heroKills / c.rewards.heroKillsPerSceau) + (victory ? c.rewards.sceauxVictoryBonus : 0);
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
  const unlockCost = unlocks.reduce((a, u) => a + u.cost, 0);
  const perTower = c.forge.upgradeCosts.reduce((a, b) => a + b, 0);
  const forgeCost = perTower * Object.keys(c.towers).length;
  const sceauxCost = Object.values(c.hero.skills)
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
  /** Runs pour maxer les sorts, à `heroKills` kills héros par run. */
  runsToMaxSkills: number;
  /** Chapitres jouables disponibles — la durée à couvrir. */
  chapterCount: number;
}

/** `heroKillsPerRun` : hypothèse de jeu actif, à confronter au chiffre mesuré par l'autoplay. */
export function economyHealth(c: ContentPack, unlocks: UnlockDef[], heroKillsPerRun = 40): EconomyHealth {
  const playable = c.chapters.flatMap((ch, i) => (ch.playable ? [i] : []));
  const shardsPerChapter = playable.map(i => shardsForRun(c, i));
  const first = shardsPerChapter[0] ?? 0;
  const last = shardsPerChapter[shardsPerChapter.length - 1] ?? 0;
  const s = sinks(c, unlocks);
  const perRunSceaux = sceauxForRun(c, heroKillsPerRun);
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
