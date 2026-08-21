// ============================================================
// core/sim.ts — Simulation déterministe du run (ADR-001).
// Pas d'aléatoire, pas de Phaser, pas de DOM. Testable en Vitest.
// Toutes les valeurs d'équilibrage viennent de ContentPack (ADR-003).
// ============================================================

import { BATTLEFIELD } from "./types";
import type { ChapterDef, ContentPack, EnemyDef, EnemyState, HeroState, PendingSpawn, PlayableChapter, Profile, RallyLevel, RewardRules, RunResult, RunState, SimEvent, SkillTrack, SlowEffect, TowerDef, TowerLevelStats, TowerSpecDef, TowerState, UnlockDef, Vec2, WaveDef, WhirlwindLevel } from "./types";

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

/**
 * Or que les créatures d'une vague rapporteraient au tarif plein — la CLÉ DE
 * RÉPARTITION du budget, pas un montant versé. Une vague deux fois plus fournie
 * reçoit deux fois plus du budget du chapitre, mais le budget, lui, ne bouge pas :
 * c'est exactement ce que le per-kill ne savait pas faire (ADR-052).
 */
function waveGoldWeight(c: ContentPack, wave: WaveDef): number {
  let total: number = 0;
  for (const spawn of wave.spawns) {
    const def: EnemyDef | undefined = c.enemies[spawn.enemyId];
    if (def) total += def.goldReward * spawn.count;
  }
  const boss: EnemyDef | undefined = wave.miniBoss ? c.enemies[wave.miniBoss.enemyId] : undefined;
  if (boss) total += boss.goldReward;
  return total;
}

/** Répartition du budget d'un chapitre : facteur sur les kills + revenu par vague. */
interface GoldBudget {
  killGoldScale: number;
  waveIncome: number[];
}

/**
 * Résout le budget d'un chapitre une fois pour toutes. `killGoldShare` du budget part
 * en récompenses de kill (mise à l'échelle pour tenir la cible), le reste tombe à la
 * fin de chaque vague, au prorata du poids de la vague : les dernières vagues restent
 * les plus lucratives, sans que leur effectif puisse gonfler le total.
 */
function resolveBudget(c: ContentPack, chapterIndex: number, waves: readonly WaveDef[]): GoldBudget {
  const budget: number = c.economy.chapterBudget[chapterIndex] ?? c.economy.defaultChapterBudget;
  const weights: number[] = waves.map(w => waveGoldWeight(c, w));
  const totalWeight: number = weights.reduce((a, w) => a + w, 0);
  // Un chapitre sans aucune créature payante ne doit pas produire une division par zéro.
  if (totalWeight <= 0) return { killGoldScale: 0, waveIncome: waves.map(() => 0) };
  const killPart: number = budget * c.economy.killGoldShare;
  return {
    killGoldScale: killPart / totalWeight,
    waveIncome: weights.map(w => Math.round((budget - killPart) * (w / totalWeight))),
  };
}

/**
 * Un niveau venu du PROFIL sert à indexer une table du CONTENT — et le profil
 * n'est pas une donnée de confiance : il vient de `localStorage`, donc d'une
 * version antérieure du jeu, d'une sauvegarde bricolée, ou d'un stockage abîmé.
 * `normalize` (meta/save.ts) vérifie que c'est un NOMBRE, pas qu'il désigne un
 * palier existant : un profil portant `rally: 99` traversait tout et faisait
 * planter la partie au premier tir de tour, sur
 * `c.hero.skills.rally.levels[98]!.fireRateMult`.
 *
 * On borne ICI, à l'unique endroit où le profil entre dans la simulation — pas
 * à chacun des sites d'usage, qui sont trois et qui augmenteront.
 */
function clampSkillLevel(level: number | undefined, track: SkillTrack<unknown>): number {
  const n: number = Math.floor(level ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, n), track.levels.length);
}
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
  const budget: GoldBudget = resolveBudget(content, chapterIndex, ch.waves);
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
    killGoldScale: budget.killGoldScale,
    waveIncome: budget.waveIncome,
    nextUid: 1, kills: 0, heroKills: 0, heroDeaths: 0, heroBlockSeconds: 0,
    skillLevels: {
      whirlwind: clampSkillLevel(profile.skills?.whirlwind, content.hero.skills.whirlwind),
      rally: clampSkillLevel(profile.skills?.rally, content.hero.skills.rally),
    },
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

/**
 * Fait apparaître UNE créature immédiatement, sur la voie demandée.
 *
 * Commande d'ATELIER : elle sert au bac à sable (ADR-066), où l'on veut voir une
 * créature précise sans jouer les chapitres qui y mènent. Elle vit ici et non
 * dans le rendu parce que celui-ci ne mute jamais `RunState` directement
 * (ADR-001) — une exception « juste pour déboguer » serait le premier pas vers
 * un rendu qui décide de l'état du jeu.
 *
 * Renvoie `false` sur une créature ou une voie inconnue, plutôt que de pousser
 * une apparition que `spawnDueEnemies` déréférencerait dans le vide.
 */
export function spawnOneEnemy(s: RunState, c: ContentPack, enemyId: string, pathIndex: number): boolean {
  const ch: ChapterDef | undefined = c.chapters[s.chapterIndex];
  if (!ch?.playable) return false;
  if (!c.enemies[enemyId]) return false;
  if (!Number.isInteger(pathIndex) || pathIndex < 0 || pathIndex >= ch.map.paths.length) return false;
  s.pendingSpawns.push({ enemyId, at: s.time, pathIndex, hpMult: 1 });
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
    // Plancher à 1 quand la créature vaut quelque chose : à l'échelle d'un chapitre
    // tardif le facteur descend sous 0,3, et un gobelin arrondi à 0 supprimerait le
    // retour « j'ai tué, j'ai été payé » sur la piétaille — soit la moitié des morts.
    const gold: number = def.goldReward > 0
      ? Math.max(1, Math.round(def.goldReward * s.killGoldScale))
      : 0;
    s.gold += gold;
    s.kills += 1;
    if (byHero) s.heroKills += 1;
    events.push({ type: "enemyDied", pos: { ...e.pos }, gold });
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

/**
 * Un pas de simulation, décomposé en six phases dans un ORDRE qui est une
 * décision de gameplay et non un détail (ADR-058) : on fait naître, puis on
 * déplace, puis on frappe, puis on conclut. Déplacer une phase change le jeu —
 * une tour qui tirerait avant que les ennemis n'avancent viserait la position
 * du tick précédent.
 *
 * Chaque phase est une fonction nommée. Le couplage entre elles passe par des
 * valeurs de retour explicites, jamais par des variables partagées :
 * `resolveMelee` rend l'ennemi bloqué que `advanceEnemies` doit laisser sur
 * place, et `advanceEnemies` rend `false` quand un boss a atteint le château —
 * le run est fini, les tours n'ont plus à tirer.
 */
function stepOnce(s: RunState, c: ContentPack, ch: PlayableChapter, dt: number, lengthsByPath: number[][], events: SimEvent[]): void {
  spawnDueEnemies(s, c, ch);
  stepHero(s, c, dt);
  const blockedUid: number | null = resolveMelee(s, c, dt, events);
  if (!advanceEnemies(s, c, ch, dt, lengthsByPath, blockedUid, events)) return;
  fireTowers(s, c, ch, dt, events);
  resolveEndOfWave(s, ch, events);
}

/** 1. Naissances dues : chaque spawn arrive sur SON chemin (ADR-004). */
function spawnDueEnemies(s: RunState, c: ContentPack, ch: PlayableChapter): void {
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
}

/** 2. Héros : réapparition puis déplacement vers la cible désignée au doigt. */
function stepHero(s: RunState, c: ContentPack, dt: number): void {
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
}

/**
 * 3. Blocage au corps à corps : le héros retient l'ennemi terrestre le PLUS
 * AVANCÉ à portée — celui qui menace le château, pas le plus proche.
 * Rend son `uid` pour que la phase de déplacement le laisse sur place.
 */
function resolveMelee(s: RunState, c: ContentPack, dt: number, events: SimEvent[]): number | null {
  const h: HeroState = s.hero;
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
  return blockedUid;
}

/**
 * 4. Déplacement des ennemis (+ brûlure des spécialisations feu).
 * Rend `false` si un BOSS a atteint le château : le run est perdu sur-le-champ
 * et le pas de simulation s'arrête là (ADR-024).
 */
function advanceEnemies(
  s: RunState, c: ContentPack, ch: PlayableChapter, dt: number,
  lengthsByPath: number[][], blockedUid: number | null, events: SimEvent[],
): boolean {
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
      if (e.boss) { s.castleHp = Math.max(0, s.castleHp); s.phase = "defeat"; return false; }
    }
  }
  return true;
}

/**
 * Aura de givre (spécialisation) : la tour ne TIRE pas, elle ralentit en continu
 * tout ce qui entre dans son rayon. Séparée du tir parce que c'est une mécanique
 * distincte et non une variante — elle n'a ni cadence, ni cible, ni projectile.
 */
function applyFrostAura(
  s: RunState, c: ContentPack, aura: NonNullable<TowerSpecDef["aura"]>,
  def: TowerDef, slot: Vec2, dt: number, events: SimEvent[],
): void {
  for (const e of s.enemies) {
    const eDef: EnemyDef = c.enemies[e.defId]!;
    if (!e.alive || (def.groundOnly && eDef.flying) || eDef.slowImmune) continue;
    if (dist(e.pos, slot) <= aura.radius) {
      e.slowUntil = s.time + 0.15;
      e.slowFactor = aura.slowFactor;
      // L'armure s'applique au TAUX par seconde, pas par tick (1/60 s) : lui
      // faire traverser `damageEnemy` telle quelle appliquerait le plancher
      // d'armure à un dégât minuscule à CHAQUE tick, écrasant l'aura à 25 %
      // de sa valeur nominale dès la moindre armure. On réduit donc le taux
      // ICI puis on passe `ignoreArmor` pour ne pas la compter deux fois.
      if (aura.dps) {
        const armor: number = eDef.armor ?? 0;
        const netDps: number = armor > 0 ? Math.max(aura.dps * ARMOR_FLOOR, aura.dps - armor) : aura.dps;
        damageEnemy(s, c, e, netDps * dt, events, false, true);
      }
    }
  }
}

/** 5. Tirs des tours : cibles les plus avancées à portée, multishot compris. */
function fireTowers(s: RunState, c: ContentPack, ch: PlayableChapter, dt: number, events: SimEvent[]): void {
  for (const t of s.towers) {
    const def: TowerDef = c.towers[t.defId]!;
    const spec: TowerSpecDef | undefined = specOf(c, t);

    // Aura de givre : pas de tir du tout, la tour agit en continu.
    if (spec?.aura) {
      applyFrostAura(s, c, spec.aura, def, ch.map.slots[t.slotIndex]!, dt, events);
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
      events.push({ type: "shot", from: { ...slot }, to: { ...target.pos }, towerDefId: def.id, specId: spec?.id ?? null });
      if (splashRadius > 0) {
        events.push({ type: "explosion", pos: { ...target.pos }, radius: splashRadius, towerDefId: def.id, specId: spec?.id ?? null });
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
}

/** 6. Fin de vague / de run : défaite si le château tombe, sinon revenu de vague
 *  nettoyée puis passage à la vague suivante ou victoire. */
function resolveEndOfWave(s: RunState, ch: PlayableChapter, events: SimEvent[]): void {
  if (s.castleHp <= 0) { s.castleHp = 0; s.phase = "defeat"; return; }
  if (s.phase === "wave" && s.pendingSpawns.length === 0 && s.enemies.every(e => !e.alive)) {
    s.enemies = [];
    // Revenu de fin de vague (ADR-052) : versé sur une vague NETTOYÉE, pas sur une
    // défaite — le château tombé, la phase est déjà "defeat" et on n'arrive pas ici.
    const income: number = s.waveIncome[s.waveIndex] ?? 0;
    if (income > 0) {
      s.gold += income;
      events.push({ type: "waveIncome", gold: income });
    }
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

  // Étoiles (GDD §Étoiles) : 3 = quasi sans-faute, 1 = héros mort ET château très
  // entamé, 2 = entre les deux. Le seuil des 3 étoiles est une PART de PV conservés
  // et non plus l'absence totale de dégât : à l'exigence stricte, un unique PV perdu
  // sur dix vagues suffisait à l'interdire, ce qui la rendait inatteignable sur
  // plusieurs chapitres quel que soit l'investissement méta (ADR-052).
  // Calculé AVANT les Éclats : les étoiles en font désormais partie.
  let stars: number = 0;
  if (victory) {
    const hpPct: number = s.castleHpMax > 0 ? s.castleHp / s.castleHpMax : 0;
    const dmgPct: number = 1 - hpPct;
    if (hpPct >= c.rating.perfectHpPct && s.heroDeaths === 0) stars = 3;
    else if (s.heroDeaths > 0 && dmgPct >= c.rating.heavyDamagePct) stars = 1;
    else stars = 2;
  }
  // Les étoiles paient (ADR-052) : c'est ce qui relie la maîtrise d'un chapitre à la
  // puissance des tours, au lieu de laisser l'or de la partie s'en charger seul.
  const starBonus: number = stars * r.shardsPerStar;

  // Un chapitre tardif doit payer plus qu'un rejeu du premier, sinon la méta se
  // remplit en farmant la carte la plus facile (GDD §Économie).
  const chapterMult: number = r.shardsChapterMult?.[s.chapterIndex] ?? 1;
  const shards: number = Math.max(
    s.waveIndex >= 0 ? r.shardsFloor : 0,
    Math.round((base + hpBonus + victoryBonus + starBonus) * chapterMult),
  );
  // Sceaux (monnaie héros) : récompense le TEMPS passé à retenir la horde, pas les
  // kills. Mesuré : un héros posté en dernier rempart tue moins mais fait gagner ;
  // indexer sur les kills payait donc le placement le moins efficace (ADR-021).
  const sceaux: number = Math.max(0,
    Math.floor(s.heroBlockSeconds / r.heroBlockSecondsPerSceau)
    + (victory ? r.sceauxVictoryBonus : 0)
    - s.heroDeaths * r.sceauxPerHeroDeath,
  );
  return {
    victory, wavesCleared, castleHpLeft: s.castleHp, shards,
    kills: s.kills, heroKills: s.heroKills, heroBlockSeconds: s.heroBlockSeconds,
    heroDeaths: s.heroDeaths, sceaux, seenEnemies: [...s.seenEnemies], stars,
  };
}
