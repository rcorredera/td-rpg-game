// ============================================================
// core/sim.ts — Simulation déterministe du run (ADR-001).
// Pas d'aléatoire, pas de Phaser, pas de DOM. Testable en Vitest.
// Toutes les valeurs d'équilibrage viennent de ContentPack (ADR-003).
// ============================================================

import { BATTLEFIELD } from "./types";
import type {
  ContentPack, EnemyState, PlayableChapter, Profile, RunResult, RunState, SimEvent,
  TowerSpecDef, TowerState, Vec2,
} from "./types";

const FIXED_DT = 1 / 60; // pas de temps fixe : la vitesse x2 multiplie le nb de ticks, pas dt

/** Chapitre du run. Un run ne peut exister que sur un chapitre playable. */
function chapterOf(s: RunState, c: ContentPack): PlayableChapter {
  const ch = c.chapters[s.chapterIndex];
  if (!ch || !ch.playable) throw new Error(`chapitre ${s.chapterIndex} injouable`);
  return ch;
}

// ---------- helpers géométrie ----------

function dist(a: Vec2, b: Vec2): number { return Math.hypot(a.x - b.x, a.y - b.y); }

/** Longueurs cumulées du chemin, calculées une fois. */
function pathLengths(path: Vec2[]): number[] {
  const acc = [0];
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]!, cur = path[i]!;
    acc.push(acc[i - 1]! + dist(prev, cur));
  }
  return acc;
}

function posOnPath(path: Vec2[], lengths: number[], d: number): Vec2 {
  const total = lengths[lengths.length - 1]!;
  if (d >= total) { const last = path[path.length - 1]!; return { ...last }; }
  let i = 1;
  while (lengths[i]! < d) i++;
  const a = path[i - 1]!, b = path[i]!;
  const segStart = lengths[i - 1]!, segLen = lengths[i]! - segStart;
  const t = segLen === 0 ? 0 : (d - segStart) / segLen;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ---------- création ----------

export function createRun(content: ContentPack, profile: Profile, chapterIndex = 0): RunState {
  const ch = content.chapters[chapterIndex];
  if (!ch || !ch.playable) throw new Error(`chapitre ${chapterIndex} injouable`);
  const castleBonus = profile.unlocks.includes("castle_hp_1") ? 10 : 0;
  const heroStart = ch.map.paths[0]!.waypoints[0]!;
  return {
    time: 0, timeAcc: 0, speed: 1, phase: "building", chapterIndex,
    gold: content.economy.startingGold,
    castleHp: ch.map.castleHp + castleBonus,
    castleHpMax: ch.map.castleHp + castleBonus,
    waveIndex: -1,
    pendingSpawns: [], enemies: [], towers: [],
    hero: {
      pos: { x: heroStart.x + 60, y: heroStart.y },
      target: { x: heroStart.x + 60, y: heroStart.y },
      hp: content.hero.hp, maxHp: content.hero.hp,
      alive: true, respawnAt: 0, whirlwindReady: 0, rallyReady: 0,
    },
    accountSpellReady: 0,
    hasAccountSpell: profile.unlocks.includes("spell_arrow_rain"),
    nextUid: 1, kills: 0, heroKills: 0, heroDeaths: 0,
    skillLevels: { whirlwind: profile.skills?.whirlwind ?? 1, rally: profile.skills?.rally ?? 1 },
    forgeLevels: { ...profile.forge },
    seenEnemies: [],
  };
}

// ---------- commandes joueur ----------

export function buildTower(s: RunState, c: ContentPack, slotIndex: number, defId: string, unlocks: string[]): boolean {
  const def = c.towers[defId];
  if (!def) return false;
  if (def.requiresUnlock && !unlocks.includes(def.requiresUnlock)) return false;
  if (s.towers.some(t => t.slotIndex === slotIndex)) return false;
  const cost = def.costs[0]!;
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
  const t = s.towers.find(t => t.slotIndex === slotIndex);
  if (!t || t.specId) return false;
  const def = c.towers[t.defId]!;
  if (t.level < def.levels.length) return false;
  const spec = def.specs?.find(sp => sp.id === specId);
  if (!spec || s.gold < spec.cost) return false;
  s.gold -= spec.cost;
  t.specId = specId;
  return true;
}

export function upgradeTower(s: RunState, c: ContentPack, slotIndex: number): boolean {
  const t = s.towers.find(t => t.slotIndex === slotIndex);
  if (!t) return false;
  const def = c.towers[t.defId]!;
  if (t.level >= def.levels.length) return false;
  const cost = def.costs[t.level]!;
  if (s.gold < cost) return false;
  s.gold -= cost;
  t.level += 1;
  return true;
}

/** Remboursement à la vente : % de l'investissement total (construction + upgrades + spécialisation). */
export function sellRefundFor(c: ContentPack, defId: string, level: number, specId: string | null = null): number {
  const def = c.towers[defId]!;
  let invested = def.costs.slice(0, level).reduce((a, b) => a + b, 0);
  if (specId) invested += def.specs?.find(sp => sp.id === specId)?.cost ?? 0;
  return Math.round(invested * c.economy.sellRefundRate);
}

export function sellTower(s: RunState, c: ContentPack, slotIndex: number): boolean {
  const idx = s.towers.findIndex(t => t.slotIndex === slotIndex);
  if (idx < 0) return false;
  const t = s.towers[idx]!;
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
  const h = s.hero, sk = c.hero.skills.whirlwind.levels[s.skillLevels.whirlwind - 1]!;
  if (!h.alive || s.time < h.whirlwindReady) return false;
  h.whirlwindReady = s.time + sk.cooldownS;
  events.push({ type: "explosion", pos: { ...h.pos }, radius: sk.radius });
  for (const e of s.enemies) {
    if (e.alive && dist(e.pos, h.pos) <= sk.radius) damageEnemy(s, c, e, sk.damage, events, true);
  }
  return true;
}

export function castRally(s: RunState, c: ContentPack): boolean {
  const h = s.hero, sk = c.hero.skills.rally.levels[s.skillLevels.rally - 1]!;
  if (!h.alive || s.time < h.rallyReady) return false;
  h.rallyReady = s.time + sk.cooldownS;
  for (const t of s.towers) {
    const slot = chapterOf(s, c).map.slots[t.slotIndex]!;
    if (dist(slot, h.pos) <= sk.radius) t.rallyUntil = s.time + sk.durationS;
  }
  return true;
}

export function castAccountSpell(s: RunState, c: ContentPack, at: Vec2, events: SimEvent[]): boolean {
  if (!s.hasAccountSpell || s.time < s.accountSpellReady) return false;
  // Cible bornée : un tap dans le hors-champ (ADR-010) gaspillait le sort — le
  // cooldown était posé alors que la zone d'effet ne pouvait toucher personne.
  const target = clampToBattlefield(at);
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
  const next = s.waveIndex + 1;
  const wave = chapterOf(s, c).waves[next];
  if (!wave) return false;
  s.waveIndex = next;
  s.phase = "wave";
  const hpMult = Math.pow(c.scaling.hpExponent, next); // GDD : base * 1.15^n
  for (const spawn of wave.spawns) {
    for (let i = 0; i < spawn.count; i++) {
      s.pendingSpawns.push({
        at: s.time + spawn.delayS + i * spawn.intervalS,
        enemyId: spawn.enemyId, hpMult, pathIndex: spawn.pathIndex ?? 0,
      });
    }
  }
  if (wave.miniBoss) {
    const lastAt = Math.max(...s.pendingSpawns.map(p => p.at), s.time);
    s.pendingSpawns.push({ at: lastAt + 2, enemyId: wave.miniBoss.enemyId, hpMult: hpMult * wave.miniBoss.hpMult, pathIndex: 0 });
  }
  return true;
}

// ---------- tick ----------

function damageEnemy(s: RunState, c: ContentPack, e: EnemyState, dmg: number, events: SimEvent[], byHero = false): void {
  if (!e.alive) return;
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.alive = false;
    const def = c.enemies[e.defId]!;
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
  const ch = chapterOf(s, c);
  const lengthsByPath = ch.map.paths.map(p => pathLengths(p.waypoints));

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
  for (let i = s.pendingSpawns.length - 1; i >= 0; i--) {
    const p = s.pendingSpawns[i]!;
    if (s.time >= p.at) {
      const def = c.enemies[p.enemyId]!;
      const hp = Math.round(def.hp * p.hpMult);
      s.enemies.push({
        uid: s.nextUid++, defId: p.enemyId, hp, maxHp: hp, pathIndex: p.pathIndex, dist: 0,
        pos: { ...ch.map.paths[p.pathIndex]!.waypoints[0]! }, slowUntil: 0, slowFactor: 1,
        burnUntil: 0, burnPctPerS: 0, blocked: false, alive: true,
      });
      if (!s.seenEnemies.includes(p.enemyId)) s.seenEnemies.push(p.enemyId); // → Bestiaire
      s.pendingSpawns.splice(i, 1);
    }
  }

  // 2. Héros : respawn, déplacement
  const h = s.hero;
  if (!h.alive && s.time >= h.respawnAt) {
    h.alive = true; h.hp = h.maxHp;
  }
  if (h.alive) {
    const d = dist(h.pos, h.target);
    if (d > 2) {
      const step = Math.min(d, c.hero.speed * dt);
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
      damageEnemy(s, c, best, c.hero.meleeDps * dt, events, true);
      if (best.alive) {
        h.hp -= c.enemies[best.defId]!.meleeDps * dt;
        if (h.hp <= 0) {
          h.alive = false; h.respawnAt = s.time + c.hero.respawnS;
          s.heroDeaths += 1; // → étoiles
          events.push({ type: "heroDied" });
        }
      }
    }
  }

  // 4. Déplacement ennemis — chacun sur son chemin (+ brûlure des spécialisations feu)
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (s.time < e.burnUntil) damageEnemy(s, c, e, e.maxHp * e.burnPctPerS * dt, events);
    if (!e.alive) continue;
    e.blocked = e.uid === blockedUid;
    if (e.blocked) continue;
    const def = c.enemies[e.defId]!;
    const slow = s.time < e.slowUntil ? e.slowFactor : 1;
    const lengths = lengthsByPath[e.pathIndex]!;
    const totalLen = lengths[lengths.length - 1]!;
    e.dist += def.speed * slow * dt;
    e.pos = posOnPath(ch.map.paths[e.pathIndex]!.waypoints, lengths, e.dist);
    if (e.dist >= totalLen) {
      // L'ennemi "explose" sur le château : plus il est renforcé (vagues, mini-boss), plus ça fait mal
      e.alive = false;
      const strength = Math.pow(e.maxHp / def.hp, c.scaling.castleDamageExponent);
      const dmg = Math.max(def.damageToCastle, Math.round(def.damageToCastle * strength));
      s.castleHp -= dmg;
      events.push({ type: "castleHit", damage: dmg });
    }
  }

  // 5. Tirs des tours — cibles les plus avancées à portée (multishot via spécialisation)
  for (const t of s.towers) {
    const def = c.towers[t.defId]!;
    const spec = specOf(c, t);

    // Aura de givre (spécialisation) : pas de tir, ralentissement continu dans le rayon
    if (spec?.aura) {
      const slot = ch.map.slots[t.slotIndex]!;
      for (const e of s.enemies) {
        if (!e.alive || (def.groundOnly && c.enemies[e.defId]!.flying)) continue;
        if (dist(e.pos, slot) <= spec.aura.radius) {
          e.slowUntil = s.time + 0.15;
          e.slowFactor = spec.aura.slowFactor;
        }
      }
      continue;
    }

    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const stats = spec ? spec.stats : def.levels[t.level - 1]!;
    const splashRadius = spec?.splashRadius ?? def.splashRadius;
    const slowFx = spec && spec.slow !== undefined ? spec.slow ?? undefined : def.slow;
    const slot = ch.map.slots[t.slotIndex]!;

    const inRange: EnemyState[] = [];
    for (const e of s.enemies) {
      if (!e.alive) continue;
      if (def.groundOnly && c.enemies[e.defId]!.flying) continue;
      if (dist(e.pos, slot) <= stats.range) inRange.push(e);
    }
    if (inRange.length === 0) continue;
    inRange.sort((a, b) => b.dist - a.dist);
    const targets = inRange.slice(0, spec?.multishot ?? 1);

    const rallyMult = c.hero.skills.rally.levels[s.skillLevels.rally - 1]!.fireRateMult;
    const rate = s.time < t.rallyUntil ? stats.fireRate * rallyMult : stats.fireRate;
    t.cooldown = 1 / rate;
    // Forge (méta) : bonus de dégâts permanent par niveau acheté en Éclats
    const damage = stats.damage * (1 + c.forge.damageMultPerLevel * (s.forgeLevels[t.defId] ?? 0));

    const applyHit = (e: EnemyState) => {
      damageEnemy(s, c, e, damage, events);
      if (!e.alive) return;
      if (slowFx) { e.slowUntil = s.time + slowFx.duration; e.slowFactor = slowFx.factor; }
      if (spec?.burn) { e.burnUntil = s.time + spec.burn.durationS; e.burnPctPerS = spec.burn.pctMaxHpPerS; }
    };

    for (const target of targets) {
      events.push({ type: "shot", from: { ...slot }, to: { ...target.pos }, towerDefId: def.id });
      if (splashRadius > 0) {
        events.push({ type: "explosion", pos: { ...target.pos }, radius: splashRadius });
        const center = { ...target.pos };
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
  const ch = chapterOf(s, c);
  const victory = s.phase === "victory";
  const wavesCleared = victory ? ch.waves.length : Math.max(0, s.waveIndex);
  const r = c.rewards;
  const base = wavesCleared * r.shardsPerWave;
  const hpBonus = victory ? Math.round((s.castleHp / ch.map.castleHp) * r.shardsCastleBonus) : 0;
  const victoryBonus = victory ? r.shardsVictoryBonus : 0;
  // Un chapitre tardif doit payer plus qu'un rejeu du premier, sinon la méta se
  // remplit en farmant la carte la plus facile (GDD §Économie).
  const chapterMult = r.shardsChapterMult?.[s.chapterIndex] ?? 1;
  const shards = Math.max(
    s.waveIndex >= 0 ? r.shardsFloor : 0,
    Math.round((base + hpBonus + victoryBonus) * chapterMult),
  );
  // Sceaux (monnaie héros) : récompense l'usage actif du héros (GDD §Économie)
  const sceaux = Math.floor(s.heroKills / r.heroKillsPerSceau) + (victory ? r.sceauxVictoryBonus : 0);
  // Étoiles (GDD §Étoiles) : 3 = sans-faute, 1 = héros mort ET château très entamé, 2 = entre les deux
  let stars = 0;
  if (victory) {
    const dmgPct = 1 - s.castleHp / s.castleHpMax;
    if (dmgPct <= 0 && s.heroDeaths === 0) stars = 3;
    else if (s.heroDeaths > 0 && dmgPct >= c.rating.heavyDamagePct) stars = 1;
    else stars = 2;
  }
  return {
    victory, wavesCleared, castleHpLeft: s.castleHp, shards,
    kills: s.kills, heroKills: s.heroKills, sceaux, seenEnemies: [...s.seenEnemies], stars,
  };
}
