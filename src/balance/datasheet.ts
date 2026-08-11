// ============================================================
// balance/datasheet.ts — Lecture ANALYTIQUE du content (ADR-018).
//
// Répond sans jouer aux questions d'équilibrage : combien de PV arrive à la
// vague 7 du chapitre 5 ? combien de DPS mon or peut-il acheter ? combien de
// secondes une tour peut-elle tirer sur un ennemi qui traverse ?
//
// PUR : dérive tout de `ContentPack`, ne contient AUCUNE valeur d'équilibrage
// (ADR-003) — uniquement les formules qui les combinent. Aucune dépendance
// Phaser ni DOM : ce module tourne en Node comme en test.
// ============================================================

import type { ContentPack, PlayableChapter, Vec2, WaveDef } from "../core/types";

/** Chapitre jouable par index — les chapitres non jouables n'ont ni carte ni vagues. */
export function playableChapter(c: ContentPack, index: number): PlayableChapter {
  const ch = c.chapters[index];
  if (!ch || !ch.playable) throw new Error(`datasheet: chapitre ${index} injouable`);
  return ch;
}

// ---------- Ennemis ----------

/**
 * PV d'un ennemi à la vague `waveIndex` (0-based).
 * Miroir exact de `startNextWave` : `base × hpExponent^waveIndex`, arrondi comme
 * à l'instanciation. Toute divergence ici rendrait le banc d'essai menteur.
 */
export function enemyHpAtWave(c: ContentPack, enemyId: string, waveIndex: number, hpMult = 1): number {
  const def = c.enemies[enemyId];
  if (!def) throw new Error(`datasheet: ennemi inconnu « ${enemyId} »`);
  return Math.round(def.hp * Math.pow(c.scaling.hpExponent, waveIndex) * hpMult);
}

/** Dégâts au château d'un ennemi renforcé — miroir de l'impact dans `stepOnce`. */
export function castleDamageOf(c: ContentPack, enemyId: string, hpMult: number): number {
  const def = c.enemies[enemyId];
  if (!def) throw new Error(`datasheet: ennemi inconnu « ${enemyId} »`);
  const strength = Math.pow(hpMult, c.scaling.castleDamageExponent);
  return Math.max(def.damageToCastle, Math.round(def.damageToCastle * strength));
}

// ---------- Tours ----------

function statsOf(c: ContentPack, towerId: string, level: number, specId?: string | null) {
  const def = c.towers[towerId];
  if (!def) throw new Error(`datasheet: tour inconnue « ${towerId} »`);
  const spec = specId ? def.specs?.find(s => s.id === specId) : undefined;
  const stats = spec ? spec.stats : def.levels[level - 1];
  if (!stats) throw new Error(`datasheet: niveau ${level} inconnu pour « ${towerId} »`);
  return { def, spec, stats };
}

/**
 * DPS infligé à UNE cible isolée. Ni multishot ni splash : c'est le plancher,
 * ce sur quoi on peut compter face à un ennemi seul (typiquement un boss).
 * Vaut 0 pour l'aura de givre, qui ne tire pas.
 */
export function towerDps(c: ContentPack, towerId: string, level: number, specId?: string | null): number {
  const { stats } = statsOf(c, towerId, level, specId);
  return stats.damage * stats.fireRate;
}

/**
 * DPS maximal théorique : multishot compté plein. C'est le PLAFOND, atteint
 * seulement quand assez de cibles sont à portée simultanément — le splash n'y
 * est toujours pas compté, faute de savoir combien d'ennemis il touche.
 *
 * Un écart marqué entre `towerDps` et celui-ci désigne une tour anti-horde ;
 * les comparer entre deux spécialisations dit laquelle domine, et dans quel cas.
 */
export function towerBurstDps(c: ContentPack, towerId: string, level: number, specId?: string | null): number {
  const { spec, stats } = statsOf(c, towerId, level, specId);
  return stats.damage * stats.fireRate * (spec?.multishot ?? 1);
}

/** Or investi pour amener une tour au niveau donné (construction + upgrades + spécialisation). */
export function towerInvestment(c: ContentPack, towerId: string, level: number, specId?: string | null): number {
  const def = c.towers[towerId];
  if (!def) throw new Error(`datasheet: tour inconnue « ${towerId} »`);
  let gold = def.costs.slice(0, level).reduce((a, b) => a + b, 0);
  if (specId) gold += def.specs?.find(s => s.id === specId)?.cost ?? 0;
  return gold;
}

/** Rendement d'une tour : DPS de pointe par pièce d'or investie. Le comparateur le plus utile. */
export function dpsPerGold(c: ContentPack, towerId: string, level: number, specId?: string | null): number {
  const gold = towerInvestment(c, towerId, level, specId);
  return gold === 0 ? 0 : towerBurstDps(c, towerId, level, specId) / gold;
}

// ---------- Cartes ----------

export function pathLength(waypoints: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!, b = waypoints[i]!;
    total += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return total;
}

/**
 * Secondes qu'un ennemi met à traverser un chemin, sans ralentissement.
 * C'est la FENÊTRE DE TIR : le DPS total de la défense multiplié par cette durée
 * borne les dégâts infligeables. Une vague dont les PV dépassent ce produit passe,
 * quelle que soit la façon de jouer.
 */
export function traversalSeconds(c: ContentPack, chapterIndex: number, pathIndex: number, enemyId: string): number {
  const ch = playableChapter(c, chapterIndex);
  const path = ch.map.paths[pathIndex];
  if (!path) throw new Error(`datasheet: chemin ${pathIndex} inconnu (chapitre ${chapterIndex})`);
  const def = c.enemies[enemyId];
  if (!def) throw new Error(`datasheet: ennemi inconnu « ${enemyId} »`);
  return pathLength(path.waypoints) / def.speed;
}

/** Distance d'un emplacement au chemin le plus proche de lui. */
export function distanceToPath(slot: Vec2, waypoints: readonly Vec2[]): number {
  let best = Infinity;
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]!, b = waypoints[i]!;
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((slot.x - a.x) * dx + (slot.y - a.y) * dy) / len2));
    best = Math.min(best, Math.hypot(slot.x - (a.x + t * dx), slot.y - (a.y + t * dy)));
  }
  return best;
}

/**
 * Nombre d'emplacements capables d'atteindre chaque voie, à la portée donnée.
 *
 * Une voie mal couverte n'est pas « plus difficile », elle est **injouable** : le
 * joueur n'a nulle part où poser une tour qui la défende. C'est une propriété de
 * la CARTE, indépendante de l'équilibrage — et elle explique une fuite récurrente
 * mieux que n'importe quel réglage de vague.
 */
export function slotCoverage(c: ContentPack, chapterIndex: number, range?: number): number[] {
  const ch = playableChapter(c, chapterIndex);
  // Portée de référence : la tour de base au niveau 1, le pire cas du joueur.
  const r = range ?? c.towers.tower_archer?.levels[0]?.range ?? 130;
  return ch.map.paths.map(p => ch.map.slots.filter(s => distanceToPath(s, p.waypoints) <= r).length);
}

// ---------- Vagues ----------

export interface WaveStats {
  /** Index 0-based de la vague. */
  index: number;
  /** Nombre d'ennemis, mini-boss compris. */
  count: number;
  /** PV cumulés de tous les ennemis de la vague, à leur niveau de scaling. */
  totalHp: number;
  /** Part des PV portée par des volants — les tours `groundOnly` n'y peuvent rien. */
  flyingHpShare: number;
  /** Or gagné si TOUT est tué (borne haute du budget de la vague suivante). */
  gold: number;
  /** Dégâts au château si TOUT passe (borne haute du risque). */
  castleDamage: number;
  /** Types d'ennemis présents. */
  enemyIds: string[];
}

/** Chaque ennemi d'une vague, aplati : les `count` spawns plus le mini-boss. */
function waveUnits(wave: WaveDef): { enemyId: string; hpMult: number }[] {
  const units: { enemyId: string; hpMult: number }[] = [];
  for (const spawn of wave.spawns) {
    for (let i = 0; i < spawn.count; i++) units.push({ enemyId: spawn.enemyId, hpMult: 1 });
  }
  if (wave.miniBoss) units.push({ enemyId: wave.miniBoss.enemyId, hpMult: wave.miniBoss.hpMult });
  return units;
}

export function waveStats(c: ContentPack, chapterIndex: number, waveIndex: number): WaveStats {
  const ch = playableChapter(c, chapterIndex);
  const wave = ch.waves[waveIndex];
  if (!wave) throw new Error(`datasheet: vague ${waveIndex} inconnue (chapitre ${chapterIndex})`);

  const units = waveUnits(wave);
  let totalHp = 0, flyingHp = 0, gold = 0, castleDamage = 0;
  const enemyIds: string[] = [];
  for (const u of units) {
    const def = c.enemies[u.enemyId]!;
    const hp = enemyHpAtWave(c, u.enemyId, waveIndex, u.hpMult);
    totalHp += hp;
    if (def.flying) flyingHp += hp;
    gold += def.goldReward;
    castleDamage += castleDamageOf(c, u.enemyId, u.hpMult);
    if (!enemyIds.includes(u.enemyId)) enemyIds.push(u.enemyId);
  }
  return {
    index: waveIndex,
    count: units.length,
    totalHp,
    flyingHpShare: totalHp === 0 ? 0 : flyingHp / totalHp,
    gold,
    castleDamage,
    enemyIds,
  };
}

// ---------- Chapitres ----------

export interface ChapterStats {
  index: number;
  id: string;
  name: string;
  waveCount: number;
  slotCount: number;
  pathCount: number;
  castleHp: number;
  /** Longueur du chemin le plus court : la fenêtre de tir la plus serrée de la carte. */
  shortestPath: number;
  waves: WaveStats[];
  /** PV cumulés de toutes les vagues — la « masse » du chapitre. */
  totalHp: number;
  /** Or théorique du chapitre : départ + tout ce que les vagues rapportent. */
  totalGold: number;
  /** Part des PV du chapitre portée par des volants. */
  flyingHpShare: number;
}

export function chapterStats(c: ContentPack, index: number): ChapterStats {
  const ch = playableChapter(c, index);
  const waves = ch.waves.map((_, w) => waveStats(c, index, w));
  const totalHp = waves.reduce((a, w) => a + w.totalHp, 0);
  const flyingHp = waves.reduce((a, w) => a + w.totalHp * w.flyingHpShare, 0);
  return {
    index, id: ch.id, name: ch.name,
    waveCount: ch.waves.length,
    slotCount: ch.map.slots.length,
    pathCount: ch.map.paths.length,
    castleHp: ch.map.castleHp,
    shortestPath: Math.min(...ch.map.paths.map(p => pathLength(p.waypoints))),
    waves,
    totalHp,
    totalGold: c.economy.startingGold + waves.reduce((a, w) => a + w.gold, 0),
    flyingHpShare: totalHp === 0 ? 0 : flyingHp / totalHp,
  };
}

/** Tous les chapitres jouables, dans l'ordre. */
export function allChapterStats(c: ContentPack): ChapterStats[] {
  return c.chapters.flatMap((ch, i) => (ch.playable ? [chapterStats(c, i)] : []));
}
