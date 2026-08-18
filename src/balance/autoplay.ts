// ============================================================
// balance/autoplay.ts — JOUEUR ARTIFICIEL headless (ADR-018).
//
// Rejoue un chapitre entier sans rendu ni interaction : la sim étant pure et
// déterministe (ADR-001, aucun RNG), un run se rejoue à l'identique et se
// mesure. C'est ce qui permet d'équilibrer 10 chapitres en une seconde plutôt
// qu'en dix parties manuelles.
//
// CE QUE CE MODULE N'EST PAS : un bon joueur. Les politiques ci-dessous sont
// des ÉTALONS reproductibles, pas des stratégies optimales. Un chapitre que
// `focus` gagne et que `spread` perd révèle une stratégie dominante — c'est
// justement le signal qu'on cherche.
//
// Les constantes ici règlent l'ÉTALON, pas le jeu : elles ne sont donc pas des
// valeurs d'équilibrage au sens d'ADR-003 et n'ont rien à faire dans
// `src/content/`. Aucune ne rentre dans la sim.
// ============================================================

import {
  buildTower, castRally, castWhirlwind, createRun, computeResult,
  specializeTower, startNextWave, tick, upgradeTower,
} from "../core/sim";
import type { ContentPack, PlayableChapter, Profile, RunResult, RunState, SimEvent, TowerDef, TowerState, Vec2 } from "../core/types";
import { playableChapter } from "./datasheet";

const DT: number = 1 / 60;
/** Coupe-circuit : une vague qui ne se termine pas (ennemi bloqué, DPS nul) ne doit pas figer le banc. */
const MAX_WAVE_SECONDS: number = 300;

/**
 * `spread` occupe tous les emplacements avant d'améliorer ; `focus` monte peu de
 * tours au maximum ; `mixed` alterne. Comparer les trois sur un même chapitre dit
 * si le jeu récompense l'étalement, la concentration, ou les deux également.
 */
export type Policy = "spread" | "focus" | "mixed";

export interface AutoplayOptions {
  policy?: Policy;
  /**
   * Piloter le héros (déplacement + sorts). Désactivé, le héros n'est PAS retiré du
   * jeu : il reste à son point d'apparition et continue de bloquer et frapper en
   * mêlée ce qui passe à sa portée — exactement comme chez un joueur qui n'y touche
   * pas. L'option mesure donc l'apport du pilotage, pas celui du héros.
   */
  useHero?: boolean;
  /** Profil méta simulé (unlocks, forge, niveaux de sorts). Défaut : profil vierge. */
  profile?: Partial<Profile>;
  /**
   * Force la composition de la défense (cycle d'ids de tours). Défaut : `BUILD_CYCLE`.
   *
   * C'est le levier qui mesure s'il existe une DÉCISION tactique : si une défense
   * mono-tour obtient le même résultat qu'une composition variée, alors choisir sa
   * tour ne sert à rien et ajouter des types d'ennemis n'y changera rien.
   */
  towers?: string[];
}

/** Ce qui s'est passé sur une vague — le grain utile pour lire une défaite. */
export interface WaveOutcome {
  wave: number;
  /** PV du château avant / après la vague : la différence est ce qui a fuité. */
  castleHpBefore: number;
  castleHpAfter: number;
  goldBefore: number;
  goldAfter: number;
  /** Tours posées et somme de leurs niveaux — la « puissance installée ». */
  towers: number;
  towerLevels: number;
  /** Durée simulée de la vague (s). */
  seconds: number;
  /** La vague a-t-elle atteint le coupe-circuit sans se conclure ? */
  stalled: boolean;
}

export interface AutoplayReport {
  chapterIndex: number;
  policy: Policy;
  useHero: boolean;
  result: RunResult;
  /** Vagues que compte le chapitre — `waves` s'arrête à la défaite, pas lui. */
  waveCount: number;
  waves: WaveOutcome[];
  /** Première vague ayant laissé passer un ennemi (null si sans-faute). */
  firstLeakWave: number | null;
  /** Or jamais dépensé à la fin — un reliquat élevé signale des coûts trop bas. */
  goldLeftover: number;
}

function emptyProfile(over: Partial<Profile> = {}): Profile {
  return {
    shards: 0, sceaux: 0, introSeen: true, chaptersWon: [], chapterStars: {},
    bestiary: [], unlocks: [], forge: {}, skills: { whirlwind: 1, rally: 1 },
    bestRuns: [], muted: false, ...over,
  };
}

/**
 * Ordre de construction. Cyclique et déterministe, avec l'archerie en tête :
 * c'est la seule tour anti-aérienne toujours disponible, une composition sans
 * elle perd mécaniquement sur les vagues volantes et ne mesurerait rien.
 */
const BUILD_CYCLE: string[] = ["tower_archer", "tower_catapult", "tower_archer", "tower_frost", "tower_catapult"];

function nextTowerId(c: ContentPack, s: RunState, unlocks: string[], cycle: string[]): string | null {
  for (let i: number = 0; i < cycle.length; i++) {
    const id: string = cycle[(s.towers.length + i) % cycle.length]!;
    const def: TowerDef | undefined = c.towers[id];
    if (!def) continue;
    if (def.requiresUnlock && !unlocks.includes(def.requiresUnlock)) continue;
    if (s.gold >= def.costs[0]!) return id;
  }
  return null;
}

/** Emplacement libre le plus proche du château (dernier waypoint) : le plus rentable à couvrir. */
function freeSlot(c: ContentPack, s: RunState): number | null {
  const ch: PlayableChapter = playableChapter(c, s.chapterIndex);
  const path: Vec2[] = ch.map.paths[0]!.waypoints;
  const end: Vec2 = path[path.length - 1]!;
  let best: number | null = null, bestD: number = Infinity;
  for (let i: number = 0; i < ch.map.slots.length; i++) {
    if (s.towers.some(t => t.slotIndex === i)) continue;
    const slot: Vec2 = ch.map.slots[i]!;
    const d: number = Math.hypot(slot.x - end.x, slot.y - end.y);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Améliore la tour la moins avancée que l'or permet ; spécialise celles au niveau max. */
function spendOnUpgrades(c: ContentPack, s: RunState): boolean {
  const sorted: TowerState[] = [...s.towers].sort((a, b) => a.level - b.level);
  for (const t of sorted) {
    const def: TowerDef = c.towers[t.defId]!;
    if (t.level < def.levels.length) {
      if (upgradeTower(s, c, t.slotIndex)) return true;
    } else if (!t.specId && def.specs?.length) {
      // Choix figé sur la première spécialisation : l'étalon doit rester reproductible.
      if (specializeTower(s, c, t.slotIndex, def.specs[0]!.id)) return true;
    }
  }
  return false;
}

/** Dépense tout l'or possible avant de lancer la vague, selon la politique. */
function spend(c: ContentPack, s: RunState, policy: Policy, unlocks: string[], cycle: string[]): void {
  const slots: number = playableChapter(c, s.chapterIndex).map.slots.length;
  // `focus` s'arrête à un tiers des emplacements et met tout dans les niveaux.
  const buildCap: number = policy === "focus" ? Math.max(1, Math.ceil(slots / 3)) : slots;

  for (let guard: number = 0; guard < 50; guard++) {
    // `mixed` alterne : construire quand il reste des emplacements ET que les
    // tours posées ont déjà un niveau d'avance, sinon améliorer.
    const wantBuild: boolean =
      policy === "spread" ? s.towers.length < buildCap
      : policy === "focus" ? s.towers.length < buildCap
      : s.towers.length < buildCap && s.towers.length <= s.waveIndex + 1;

    if (wantBuild) {
      const id: string | null = nextTowerId(c, s, unlocks, cycle);
      const slot: number | null = freeSlot(c, s);
      if (id !== null && slot !== null && buildTower(s, c, slot, id, unlocks)) continue;
    }
    if (spendOnUpgrades(c, s)) continue;
    // Plus rien à améliorer : si le frein de `mixed` bloquait la construction, la
    // tenter quand même. Borné par `buildCap` et NON par `slots` — sinon `focus`
    // finirait par occuper toute la carte et cesserait d'être une politique distincte.
    if (!wantBuild && s.towers.length < buildCap) {
      const id: string | null = nextTowerId(c, s, unlocks, cycle);
      const slot: number | null = freeSlot(c, s);
      if (id !== null && slot !== null && buildTower(s, c, slot, id, unlocks)) continue;
    }
    return;
  }
}

/**
 * Pilotage du héros : il se poste au dernier virage avant le château — le point
 * où un ennemi qui a survécu à toutes les tours passe forcément — et lâche ses
 * sorts dès qu'ils sont prêts.
 */
function driveHero(c: ContentPack, s: RunState, events: SimEvent[]): void {
  const ch: PlayableChapter = playableChapter(c, s.chapterIndex);
  const path: Vec2[] = ch.map.paths[0]!.waypoints;
  const hold: Vec2 = path[Math.max(0, path.length - 2)]!;
  s.hero.target = { x: hold.x, y: hold.y };
  if (s.enemies.some(e => e.alive)) {
    castWhirlwind(s, c, events);
    castRally(s, c);
  }
}

export function autoplayChapter(c: ContentPack, chapterIndex: number, opts: AutoplayOptions = {}): AutoplayReport {
  const policy: Policy = opts.policy ?? "mixed";
  const useHero: boolean = opts.useHero ?? true;
  const profile: Profile = emptyProfile(opts.profile);
  const s: RunState = createRun(c, profile, chapterIndex);
  const ch: PlayableChapter = playableChapter(c, chapterIndex);

  const waves: WaveOutcome[] = [];
  let firstLeakWave: number | null = null;

  for (let w: number = 0; w < ch.waves.length; w++) {
    spend(c, s, policy, profile.unlocks, opts.towers ?? BUILD_CYCLE);

    const castleHpBefore: number = s.castleHp;
    const goldBefore: number = s.gold;
    const towers: number = s.towers.length;
    const towerLevels: number = s.towers.reduce((a, t) => a + t.level, 0);

    if (!startNextWave(s, c)) break;

    const events: SimEvent[] = [];
    let seconds: number = 0, stalled: boolean = false;
    while (s.phase === "wave") {
      if (useHero) driveHero(c, s, events);
      tick(s, c, DT);
      events.length = 0; // les fx ne servent pas ici : on évite de faire grossir le tableau
      seconds += DT;
      if (seconds > MAX_WAVE_SECONDS) { stalled = true; break; }
    }

    waves.push({
      wave: w, castleHpBefore, castleHpAfter: s.castleHp, goldBefore, goldAfter: s.gold,
      towers, towerLevels, seconds: Math.round(seconds * 10) / 10, stalled,
    });
    if (firstLeakWave === null && s.castleHp < castleHpBefore) firstLeakWave = w;
    if (stalled || s.phase === "defeat" || s.phase === "victory") break;
  }

  return {
    chapterIndex, policy, useHero,
    result: computeResult(s, c),
    waveCount: ch.waves.length,
    waves, firstLeakWave, goldLeftover: s.gold,
  };
}

/** Rejoue tous les chapitres jouables avec la même politique. */
export function autoplayAll(c: ContentPack, opts: AutoplayOptions = {}): AutoplayReport[] {
  return c.chapters.flatMap((ch, i) => (ch.playable ? [autoplayChapter(c, i, opts)] : []));
}
