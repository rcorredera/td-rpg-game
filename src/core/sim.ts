// ============================================================
// core/sim.ts — Simulation déterministe du run (ADR-001).
// Pas d'aléatoire, pas de Phaser, pas de DOM. Testable en Vitest.
// Toutes les valeurs d'équilibrage viennent de ContentPack (ADR-003).
// ============================================================

import { BATTLEFIELD } from "./types";
import type { ChapterDef, ContentPack, EnemyDef, EnemyState, HeroState, PendingSpawn, PlayableChapter, Profile, RallyLevel, RewardRules, RunResult, RunState, SimEvent, SlowEffect, TowerDef, TowerLevelStats, TowerSpecDef, TowerState, UnlockDef, Vec2, WaveDef, WhirlwindLevel } from "./types";

const FIXED_DT: number = 1 / 60; // pas de temps fixe : la vitesse x2 multiplie le nb de ticks, pas dt

/**
 * Niveau auquel un joueur sans aucun achat méta peut déjà monter ses tours.
 *
 * À 2, le chapitre 1 lui-même devenait imperdable-ment dur (mesuré : défaite à 9
 * vagues sur 10, avec 400 pièces inutilisables faute de quoi les dépenser). Les
 * trois rangs du content sont donc ouverts d'emblée ; c'est le rang 4 — les
 * spécialisations — que l'armurerie vend (ADR-024).
 */
const BASE_MAX_TOWER_LEVEL: number = 3;

/** Chapitre du run. Un run ne peut exister que sur un chapitre playable. */
function chapterOf(s: RunState, c: ContentPack): PlayableChapter {
  const ch: ChapterDef | undefined = c.chapters[s.chapterIndex];
  if (!ch || !ch.playable) throw new Error(`chapitre ${s.chapterIndex} injouable`);
  return ch;
}

// ---------- helpers géométrie ----------

function dist(a: Vec2, b: Vec2): number { return Math.hypot(a.x - b.x, a.y - b.y); }

/** Longueurs cumulées du chemin, calculées une fois. */
function pathLengths(path: Vec2[]): number[] {
  const acc: number[] = [0];
  for (let i: number = 1; i < path.length; i++) {
    const prev: Vec2 = path[i - 1]!, cur: Vec2 = path[i]!;
    acc.push(acc[i - 1]! + dist(prev, cur));
  }
  return acc;
}

function posOnPath(path: Vec2[], lengths: number[], d: number): Vec2 {
  const total: number = lengths[lengths.length - 1]!;
  if (d >= total) { const last: Vec2 = path[path.length - 1]!; return { ...last }; }
  let i: number = 1;
  while (lengths[i]! < d) i++;
  const a: Vec2 = path[i - 1]!, b: Vec2 = path[i]!;
  const segStart: number = lengths[i - 1]!, segLen: number = lengths[i]! - segStart;
  const t: number = segLen === 0 ? 0 : (d - segStart) / segLen;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ---------- création ----------

export function createRun(content: ContentPack, profile: Profile, chapterIndex = 0): RunState {
  const ch: ChapterDef | undefined = content.chapters[chapterIndex];
  if (!ch || !ch.playable) throw new Error(`chapitre ${chapterIndex} injouable`);
  // Effets des déblocages : lus dans le content, jamais codés ici (ADR-003/021).
  // Ajouter un palier d'armurerie ne doit pas obliger à toucher à la simulation.
  const owned: UnlockDef[] = content.unlocks.filter(u => profile.unlocks.includes(u.id));
  const sum = (pick: (u: UnlockDef) => number | undefined) =>
    owned.reduce((a, u) => a + (pick(u) ?? 0), 0);
  const castleBonus: number = sum(u => u.castleHp);
  // Plafond de niveau : la méta ne débloque plus des TOURS entières mais des paliers
  // de puissance. Une tour manquante rendait le chapitre 1 injouable tant qu'on ne
  // l'avait pas achetée ; un plafond, lui, laisse toujours jouer (ADR-024).
  const maxTowerLevel: number = Math.max(BASE_MAX_TOWER_LEVEL, ...owned.map(u => u.maxTowerLevel ?? 0));
  const heroStart: Vec2 = ch.map.paths[0]!.waypoints[0]!;
  return {
    time: 0, timeAcc: 0, speed: 1, phase: "building", chapterIndex,
    gold: content.economy.startingGold + sum(u => u.startingGold),
    castleHp: ch.map.castleHp + castleBonus,
    castleHpMax: ch.map.castleHp + castleBonus,
    waveIndex: -1,
    pendingSpawns: [], enemies: [], towers: [],
    hero: {
      pos: { x: heroStart.x + 60, y: heroStart.y },
      target: { x: heroStart.x + 60, y: heroStart.y },
      hp: content.hero.hp, maxHp: content.hero.hp,
      alive: true, respawnAt: 0, whirlwindReady: 0, rallyReady: 0,
      // Plancher à 2 s : un respawn instantané ferait du héros un bloqueur infini.
      respawnS: Math.max(2, content.hero.respawnS - sum(u => u.heroRespawnS)),
    },
    accountSpellReady: 0,
    hasAccountSpell: owned.some(u => u.accountSpell),
    maxTowerLevel,
    canSpecialize: owned.some(u => u.allowSpecialize),
    nextUid: 1, kills: 0, heroKills: 0, heroDeaths: 0, heroBlockSeconds: 0,
    skillLevels: { whirlwind: profile.skills?.whirlwind ?? 1, rally: profile.skills?.rally ?? 1 },
    forgeLevels: { ...profile.forge },
    seenEnemies: [],
  };
}

// ---------- commandes joueur ----------

export function buildTower(s: RunState, c: ContentPack, slotIndex: number, defId: string, unlocks: string[]): boolean {
  const def: TowerDef | undefined = c.towers[defId];
  if (!def) return false;
  if (def.requiresUnlock && !unlocks.includes(def.requiresUnlock)) return false;
  if (s.towers.some(t => t.slotIndex === slotIndex)) return false;
  const cost: number = def.costs[0]!;
  if (s.gold < cost) return false;
  s.gold -= cost;
  s.towers.push({ slotIndex, defId, level: 1, specId: null, cooldown: 0, rallyUntil: 0 });
  return true;
}

/** Spécialisation choisie pour une tour (undefined si aucune). */
export function specOf(c: ContentPack, t: TowerState): TowerSpecDef | undefined {
  if (!t.specId) return undefined;
  return c.towers[t.defId]!.specs?.find(sp => sp.id === t.specId);
}

/** Niveau 4 : transforme une tour au niveau max en l'une de ses spécialisations (choix définitif). */
export function specializeTower(s: RunState, c: ContentPack, slotIndex: number, specId: string): boolean {
  const t: TowerState | undefined = s.towers.find(t => t.slotIndex === slotIndex);
  if (!t || t.specId || !s.canSpecialize) return false;
  const def: TowerDef = c.towers[t.defId]!;
  if (t.level < def.levels.length) return false;
  const spec: TowerSpecDef | undefined = def.specs?.find(sp => sp.id === specId);
  if (!spec || s.gold < spec.cost) return false;
  s.gold -= spec.cost;
  t.specId = specId;
  return true;
}

export function upgradeTower(s: RunState, c: ContentPack, slotIndex: number): boolean {
  const t: TowerState | undefined = s.towers.find(t => t.slotIndex === slotIndex);
  if (!t) return false;
  const def: TowerDef = c.towers[t.defId]!;
  // Deux plafonds : celui du content (nombre de niveaux) et celui de la méta.
  if (t.level >= Math.min(def.levels.length, s.maxTowerLevel)) return false;
  const cost: number = def.costs[t.level]!;
  if (s.gold < cost) return false;
  s.gold -= cost;
  t.level += 1;
  return true;
}

/** Remboursement à la vente : % de l'investissement total (construction + upgrades + spécialisation). */
export function sellRefundFor(c: ContentPack, defId: string, level: number, specId: string | null = null): number {
  const def: TowerDef = c.towers[defId]!;
  let invested: number = def.costs.slice(0, level).reduce((a, b) => a + b, 0);
  if (specId) invested += def.specs?.find(sp => sp.id === specId)?.cost ?? 0;
  return Math.round(invested * c.economy.sellRefundRate);
}

export function sellTower(s: RunState, c: ContentPack, slotIndex: number): boolean {
  const idx: number = s.towers.findIndex(t => t.slotIndex === slotIndex);
  if (idx < 0) return false;
  const t: TowerState = s.towers[idx]!;
  s.gold += sellRefundFor(c, t.defId, t.level, t.specId);
  s.towers.splice(idx, 1);
  return true;
}

/**
 * Ramène un point dans le champ de bataille.
 *
 * **Toute commande ciblée par un tap DOIT y passer.** Depuis ADR-010 l'écran déborde
 * de la carte et ce hors-champ est tapable : une commande qui prend les coordonnées
 * brutes agit hors de la zone de jeu (le héros la quittait, un sort s'y gaspillait).
 * Point d'entrée unique et non des clamps recopiés : c'est ce qui rend la garantie
 * vérifiable d'un seul endroit — `sim.test.ts` teste chaque commande ciblée.
 */
export function clampToBattlefield(p: Vec2): Vec2 {
  return {
    x: Math.min(Math.max(p.x, 0), BATTLEFIELD.w),
    y: Math.min(Math.max(p.y, 0), BATTLEFIELD.h),
  };
}

/** Ordonne un déplacement au héros (cible bornée, cf. `clampToBattlefield`). */
export function moveHero(s: RunState, target: Vec2): void {
  if (!s.hero.alive) return;
  s.hero.target = clampToBattlefield(target);
}

export function castWhirlwind(s: RunState, c: ContentPack, events: SimEvent[]): boolean {
  const h: HeroState = s.hero, sk: WhirlwindLevel = c.hero.skills.whirlwind.levels[s.skillLevels.whirlwind - 1]!;
  if (!h.alive || s.time < h.whirlwindReady) return false;
  h.whirlwindReady = s.time + sk.cooldownS;
  events.push({ type: "explosion", pos: { ...h.pos }, radius: sk.radius });
  for (const e of s.enemies) {
    if (e.alive && dist(e.pos, h.pos) <= sk.radius) damageEnemy(s, c, e, sk.damage, events, true);
  }
  return true;
}

export function castRally(s: RunState, c: ContentPack): boolean {
  const h: HeroState = s.hero, sk: RallyLevel = c.hero.skills.rally.levels[s.skillLevels.rally - 1]!;
  if (!h.alive || s.time < h.rallyReady) return false;
  h.rallyReady = s.time + sk.cooldownS;
  for (const t of s.towers) {
    const slot: Vec2 = chapterOf(s, c).map.slots[t.slotIndex]!;
    if (dist(slot, h.pos) <= sk.radius) t.rallyUntil = s.time + sk.durationS;
  }
  return true;
}

export function castAccountSpell(s: RunState, c: ContentPack, at: Vec2, events: SimEvent[]): boolean {
  if (!s.hasAccountSpell || s.time < s.accountSpellReady) return false;
  // Cible bornée : un tap dans le hors-champ (ADR-010) gaspillait le sort — le
  // cooldown était posé alors que la zone d'effet ne pouvait toucher personne.
  const target: Vec2 = clampToBattlefield(at);
  s.accountSpellReady = s.time + c.accountSpell.cooldownS;
  events.push({ type: "explosion", pos: { ...target }, radius: c.accountSpell.radius });
  for (const e of s.enemies) {
    if (e.alive && dist(e.pos, target) <= c.accountSpell.radius) damageEnemy(s, c, e, c.accountSpell.damage, events);
  }
  return true;
}

/** Lance la vague suivante. Valide uniquement en phase "building". */
export function startNextWave(s: RunState, c: ContentPack): boolean {
  if (s.phase !== "building") return false;
  const next: number = s.waveIndex + 1;
  const wave: WaveDef | undefined = chapterOf(s, c).waves[next];
  if (!wave) return false;
  s.waveIndex = next;
  s.phase = "wave";
  const hpMult: number = Math.pow(c.scaling.hpExponent, next); // GDD : base * 1.15^n
  for (const spawn of wave.spawns) {
    for (let i: number = 0; i < spawn.count; i++) {
      s.pendingSpawns.push({
        at: s.time + spawn.delayS + i * spawn.intervalS,
        enemyId: spawn.enemyId, hpMult, pathIndex: spawn.pathIndex ?? 0,
      });
    }
  }
  if (wave.miniBoss) {
    const lastAt: number = Math.max(...s.pendingSpawns.map(p => p.at), s.time);
    s.pendingSpawns.push({ at: lastAt + 2, enemyId: wave.miniBoss.enemyId, hpMult: hpMult * wave.miniBoss.hpMult, pathIndex: 0, boss: true });
  }
  return true;
}

// ---------- tick ----------

/**
 * Part des dégâts bruts qu'une armure ne peut jamais absorber. Sans plancher, une
 * tour trop faible infligerait 0 et la vague ne finirait jamais.
 *
 * À 10 %, une armure de 11 ramenait l'archerie de base à un dixième de ses dégâts :
 * la tour la plus courante devenait décorative, ce qui punit surtout le joueur qui
 * n'a pas encore les moyens de s'adapter. 25 % laisse l'armure très dissuasive sans
 * la rendre absolue (ADR-022).
 */
const ARMOR_FLOOR: number = 0.25;

/**
 * `ignoreArmor` : les dégâts exprimés en % des PV max (brûlures) traversent
 * l'armure — c'est précisément ce qui en fait la réponse aux ennemis cuirassés.
 */
function damageEnemy(
  s: RunState, c: ContentPack, e: EnemyState, dmg: number,
  events: SimEvent[], byHero = false, ignoreArmor = false,
): void {
  if (!e.alive) return;
  const armor: number = ignoreArmor ? 0 : c.enemies[e.defId]!.armor ?? 0;
  e.hp -= armor > 0 ? Math.max(dmg * ARMOR_FLOOR, dmg - armor) : dmg;
  if (e.hp <= 0) {
    e.alive = false;
    const def: EnemyDef = c.enemies[e.defId]!;
    s.gold += def.goldReward;
    s.kills += 1;
    if (byHero) s.heroKills += 1;
    events.push({ type: "enemyDied", pos: { ...e.pos }, gold: def.goldReward });
  }
}

/**
 * Avance la simulation. dtReal = temps réel écoulé (s).
 * Retourne les événements produits (pour fx/sons côté rendu).
 */
function isOver(s: RunState): boolean {
  return s.phase === "victory" || s.phase === "defeat";
}

export function tick(s: RunState, c: ContentPack, dtReal: number): SimEvent[] {
  const events: SimEvent[] = [];
  if (isOver(s)) return events;

  // Accumulateur : le temps réel non consommé est conservé entre les appels.
  // Sans ça, une frame plus courte que FIXED_DT (écran 120Hz) n'avancerait jamais la sim.
  s.timeAcc += dtReal * s.speed;
  const ch: PlayableChapter = chapterOf(s, c);
  const lengthsByPath: number[][] = ch.map.paths.map(p => pathLengths(p.waypoints));

  while (s.timeAcc >= FIXED_DT) {
    s.timeAcc -= FIXED_DT;
    s.time += FIXED_DT;
    stepOnce(s, c, ch, FIXED_DT, lengthsByPath, events);
    if (isOver(s)) break;
  }
  return events;
}

function stepOnce(s: RunState, c: ContentPack, ch: PlayableChapter, dt: number, lengthsByPath: number[][], events: SimEvent[]): void {
  // 1. Spawns — chacun sur son chemin d'arrivée
  for (let i: number = s.pendingSpawns.length - 1; i >= 0; i--) {
    const p: PendingSpawn = s.pendingSpawns[i]!;
    if (s.time >= p.at) {
      const def: EnemyDef = c.enemies[p.enemyId]!;
      const hp: number = Math.round(def.hp * p.hpMult);
      s.enemies.push({
        uid: s.nextUid++, defId: p.enemyId, hp, maxHp: hp, pathIndex: p.pathIndex, dist: 0,
        pos: { ...ch.map.paths[p.pathIndex]!.waypoints[0]! }, slowUntil: 0, slowFactor: 1,
        burnUntil: 0, burnPctPerS: 0, blocked: false, alive: true, boss: p.boss ?? false,
      });
      if (!s.seenEnemies.includes(p.enemyId)) s.seenEnemies.push(p.enemyId); // → Bestiaire
      s.pendingSpawns.splice(i, 1);
    }
  }

  // 2. Héros : respawn, déplacement
  const h: HeroState = s.hero;
  if (!h.alive && s.time >= h.respawnAt) {
    h.alive = true; h.hp = h.maxHp;
  }
  if (h.alive) {
    const d: number = dist(h.pos, h.target);
    if (d > 2) {
      const step: number = Math.min(d, c.hero.speed * dt);
      h.pos.x += ((h.target.x - h.pos.x) / d) * step;
      h.pos.y += ((h.target.y - h.pos.y) / d) * step;
    }
  }

  // 3. Blocage mêlée : le héros bloque l'ennemi terrestre le plus avancé à portée
  let blockedUid: number | null = null;
  if (h.alive) {
    let best: EnemyState | null = null;
    for (const e of s.enemies) {
      if (!e.alive || c.enemies[e.defId]!.flying) continue;
      if (dist(e.pos, h.pos) <= c.hero.meleeRange && (!best || e.dist > best.dist)) best = e;
    }
    if (best) {
      blockedUid = best.uid;
      s.heroBlockSeconds += dt; // → Sceaux : le temps passé à retenir la horde
      damageEnemy(s, c, best, c.hero.meleeDps * dt, events, true);
      if (best.alive) {
        h.hp -= c.enemies[best.defId]!.meleeDps * dt;
        if (h.hp <= 0) {
          h.alive = false; h.respawnAt = s.time + h.respawnS;
          s.heroDeaths += 1; // → étoiles
          events.push({ type: "heroDied" });
        }
      }
    }
  }

  // 4. Déplacement ennemis — chacun sur son chemin (+ brûlure des spécialisations feu)
  for (const e of s.enemies) {
    if (!e.alive) continue;
    // La brûlure ronge un % des PV max : elle IGNORE l'armure, ce qui en fait la
    // réponse aux ennemis cuirassés que les tirs directs n'entament plus (ADR-022).
    if (s.time < e.burnUntil) damageEnemy(s, c, e, e.maxHp * e.burnPctPerS * dt, events, false, true);
    if (!e.alive) continue;
    e.blocked = e.uid === blockedUid;
    if (e.blocked) continue;
    const def: EnemyDef = c.enemies[e.defId]!;
    const slow: number = s.time < e.slowUntil ? e.slowFactor : 1;
    const lengths: number[] = lengthsByPath[e.pathIndex]!;
    const totalLen: number = lengths[lengths.length - 1]!;
    e.dist += def.speed * slow * dt;
    e.pos = posOnPath(ch.map.paths[e.pathIndex]!.waypoints, lengths, e.dist);
    if (e.dist >= totalLen) {
      // L'ennemi "explose" sur le château : plus il est renforcé (vagues, mini-boss), plus ça fait mal
      e.alive = false;
      const strength: number = Math.pow(e.maxHp / def.hp, c.scaling.castleDamageExponent);
      const dmg: number = Math.max(def.damageToCastle, Math.round(def.damageToCastle * strength));
      s.castleHp -= dmg;
      events.push({ type: "castleHit", damage: dmg });
      // Un boss doit être ABATTU pour emporter le niveau. Sans cette règle, il
      // suffisait de le laisser passer : atteindre le château le retirait du jeu,
      // la vague se terminait et la victoire tombait quand même (ADR-024).
      if (e.boss) { s.castleHp = Math.max(0, s.castleHp); s.phase = "defeat"; return; }
    }
  }

  // 5. Tirs des tours — cibles les plus avancées à portée (multishot via spécialisation)
  for (const t of s.towers) {
    const def: TowerDef = c.towers[t.defId]!;
    const spec: TowerSpecDef | undefined = specOf(c, t);

    // Aura de givre (spécialisation) : pas de tir, ralentissement continu dans le rayon
    if (spec?.aura) {
      const slot: Vec2 = ch.map.slots[t.slotIndex]!;
      for (const e of s.enemies) {
        const eDef: EnemyDef = c.enemies[e.defId]!;
        if (!e.alive || (def.groundOnly && eDef.flying) || eDef.slowImmune) continue;
        if (dist(e.pos, slot) <= spec.aura.radius) {
          e.slowUntil = s.time + 0.15;
          e.slowFactor = spec.aura.slowFactor;
        }
      }
      continue;
    }

    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const stats: TowerLevelStats = spec ? spec.stats : def.levels[t.level - 1]!;
    const splashRadius: number = spec?.splashRadius ?? def.splashRadius;
    const slowFx: SlowEffect | undefined = spec && spec.slow !== undefined ? spec.slow ?? undefined : def.slow;
    const slot: Vec2 = ch.map.slots[t.slotIndex]!;

    const inRange: EnemyState[] = [];
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (def.groundOnly && c.enemies[e.defId]!.flying) continue;
      if (dist(e.pos, slot) <= stats.range) inRange.push(e);
    }
    if (inRange.length === 0) continue;
    inRange.sort((a, b) => b.dist - a.dist);
    const targets: EnemyState[] = inRange.slice(0, spec?.multishot ?? 1);

    const rallyMult: number = c.hero.skills.rally.levels[s.skillLevels.rally - 1]!.fireRateMult;
    const rate: number = s.time < t.rallyUntil ? stats.fireRate * rallyMult : stats.fireRate;
    t.cooldown = 1 / rate;
    // Forge (méta) : bonus de dégâts permanent par niveau acheté en Éclats
    const damage: number = stats.damage * (1 + c.forge.damageMultPerLevel * (s.forgeLevels[t.defId] ?? 0));

    const applyHit = (e: EnemyState) => {
      damageEnemy(s, c, e, damage, events);
      if (!e.alive) return;
      if (slowFx && !c.enemies[e.defId]!.slowImmune) {
        e.slowUntil = s.time + slowFx.duration; e.slowFactor = slowFx.factor;
      }
      if (spec?.burn) { e.burnUntil = s.time + spec.burn.durationS; e.burnPctPerS = spec.burn.pctMaxHpPerS; }
    };

    for (const target of targets) {
      events.push({ type: "shot", from: { ...slot }, to: { ...target.pos }, towerDefId: def.id });
      if (splashRadius > 0) {
        events.push({ type: "explosion", pos: { ...target.pos }, radius: splashRadius });
        const center: Vec2 = { ...target.pos };
        for (const e of s.enemies) {
          if (e.alive && !(def.groundOnly && c.enemies[e.defId]!.flying) && dist(e.pos, center) <= splashRadius) {
            applyHit(e);
          }
        }
      } else {
        applyHit(target);
      }
    }
  }

  // 6. Fin de vague / de run
  if (s.castleHp <= 0) { s.castleHp = 0; s.phase = "defeat"; return; }
  if (s.phase === "wave" && s.pendingSpawns.length === 0 && s.enemies.every(e => !e.alive)) {
    s.enemies = [];
    if (s.waveIndex + 1 >= ch.waves.length) s.phase = "victory";
    else s.phase = "building";
  }
}

// ---------- fin de run : Éclats ----------

/**
 * GDD §Économie : Éclats = f(vagues, PV restants, victoire).
 * Une défaite paie toujours (jamais 0 si au moins 1 vague entamée).
 */
export function computeResult(s: RunState, c: ContentPack): RunResult {
  const ch: PlayableChapter = chapterOf(s, c);
  const victory: boolean = s.phase === "victory";
  const wavesCleared: number = victory ? ch.waves.length : Math.max(0, s.waveIndex);
  const r: RewardRules = c.rewards;
  const base: number = wavesCleared * r.shardsPerWave;
  const hpBonus: number = victory ? Math.round((s.castleHp / ch.map.castleHp) * r.shardsCastleBonus) : 0;
  const victoryBonus: number = victory ? r.shardsVictoryBonus : 0;
  // Un chapitre tardif doit payer plus qu'un rejeu du premier, sinon la méta se
  // remplit en farmant la carte la plus facile (GDD §Économie).
  const chapterMult: number = r.shardsChapterMult?.[s.chapterIndex] ?? 1;
  const shards: number = Math.max(
    s.waveIndex >= 0 ? r.shardsFloor : 0,
    Math.round((base + hpBonus + victoryBonus) * chapterMult),
  );
  // Sceaux (monnaie héros) : récompense le TEMPS passé à retenir la horde, pas les
  // kills. Mesuré : un héros posté en dernier rempart tue moins mais fait gagner ;
  // indexer sur les kills payait donc le placement le moins efficace (ADR-021).
  const sceaux: number = Math.max(0,
    Math.floor(s.heroBlockSeconds / r.heroBlockSecondsPerSceau)
    + (victory ? r.sceauxVictoryBonus : 0)
    - s.heroDeaths * r.sceauxPerHeroDeath,
  );
  // Étoiles (GDD §Étoiles) : 3 = sans-faute, 1 = héros mort ET château très entamé, 2 = entre les deux
  let stars: number = 0;
  if (victory) {
    const dmgPct: number = 1 - s.castleHp / s.castleHpMax;
    if (dmgPct <= 0 && s.heroDeaths === 0) stars = 3;
    else if (s.heroDeaths > 0 && dmgPct >= c.rating.heavyDamagePct) stars = 1;
    else stars = 2;
  }
  return {
    victory, wavesCleared, castleHpLeft: s.castleHp, shards,
    kills: s.kills, heroKills: s.heroKills, heroBlockSeconds: s.heroBlockSeconds,
    heroDeaths: s.heroDeaths, sceaux, seenEnemies: [...s.seenEnemies], stars,
  };
}
