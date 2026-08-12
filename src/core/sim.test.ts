// Tests unitaires du core — la sim doit tourner sans navigateur (ADR-001).
import { describe, expect, it } from "vitest";
import type { ContentPack, Profile, SimEvent, Vec2 } from "./types";
import { BATTLEFIELD } from "./types";
import { CONTENT, UNLOCKS } from "../content/index";
import { buildTower, castAccountSpell, castWhirlwind, clampToBattlefield, computeResult, createRun, moveHero, sellRefundFor, sellTower, specializeTower, startNextWave, tick, upgradeTower } from "./sim";

const FRESH_PROFILE: Profile = {
  shards: 0, sceaux: 0, introSeen: false, chaptersWon: [], chapterStars: {}, bestiary: [],
  unlocks: [], forge: {}, skills: { whirlwind: 1, rally: 1 }, bestRuns: [],
};

/** Profil doté de tous les paliers d'armurerie : rang 3 et spécialisations ouverts.
 *  Les tests de rang 4 en ont besoin depuis qu'ils sont derrière un achat (ADR-024). */
const FULL_PROFILE: Profile = { ...FRESH_PROFILE, unlocks: UNLOCKS.map(u => u.id) };

/** Content minimal paramétrable pour tester un mécanisme isolé. */
function mkContent(over: {
  towers?: ContentPack["towers"];
  enemies?: ContentPack["enemies"];
  waves?: { enemyId: string; count: number }[];
  slots?: { x: number; y: number }[];
  miniBoss?: { enemyId: string; hpMult: number };
}): ContentPack {
  return {
    towers: over.towers ?? {},
    enemies: over.enemies ?? {},
    chapters: [{
      id: "t", name: "t", lore: "", playable: true,
      map: {
        castleHp: 100,
        paths: [{ waypoints: [{ x: 0, y: 0 }, { x: 600, y: 0 }] }],
        slots: over.slots ?? [],
      },
      waves: [{
        spawns: (over.waves ?? []).map(w => ({ ...w, intervalS: 0.5, delayS: 0 })),
        ...(over.miniBoss ? { miniBoss: over.miniBoss } : {}),
      }],
    }],
    hero: CONTENT.hero,
    scaling: { hpExponent: 1, castleDamageExponent: 0.5 },
    accountSpell: { damage: 0, radius: 1, cooldownS: 1 },
    forge: { damageMultPerLevel: 0.10, upgradeCosts: [20, 45] },
    economy: { sellRefundRate: 0.65, startingGold: 120 },
    rating: { heavyDamagePct: 0.5 },
    rewards: CONTENT.rewards,
    // Catalogue réel : c'est lui qui porte les effets des paliers, donc `FULL_PROFILE`
    // n'ouvre le rang 4 que si le content minimal connaît les mêmes déblocages.
    unlocks: CONTENT.unlocks,
  };
}

const WALKER = { id: "walker", name: "W", lore: "", hp: 50, speed: 60, flying: false, goldReward: 1, damageToCastle: 1, meleeDps: 0 };
const FLYER = { id: "flyer", name: "F", lore: "", hp: 50, speed: 60, flying: true, goldReward: 1, damageToCastle: 1, meleeDps: 0 };
const SNIPER = { range: 700, damage: 999, fireRate: 5 };

/** Éloigne le héros pour qu'il n'interfère pas. */
function parkHero(s: ReturnType<typeof createRun>) {
  s.hero.pos = { x: -999, y: -999 }; s.hero.target = { x: -999, y: -999 };
}

describe("sim core", () => {
  it("crée un run en phase building avec l'or de départ", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    expect(s.phase).toBe("building");
    expect(s.gold).toBeGreaterThan(0);
  });

  it("laisse les trois tours constructibles dès la première partie", () => {
    // La Tour de givre était verrouillée derrière un achat : le chapitre 1 devenait
    // très rude sans elle, et un joueur bloqué ne gagne pas de quoi se débloquer.
    // Le triangle de rôles n'a de sens que si ses trois côtés sont posables (ADR-024).
    for (const [i, id] of Object.keys(CONTENT.towers).entries()) {
      const s = createRun(CONTENT, FRESH_PROFILE);
      s.gold = 10000;
      expect(buildTower(s, CONTENT, i, id, []), `${id} non constructible`).toBe(true);
    }
  });

  it("refuse toujours une tour dont le content exige un déblocage", () => {
    // Le mécanisme reste en place pour de futures tours ; c'est son emploi sur la
    // Tour de givre qui était mauvais, pas le mécanisme.
    const locked = mkContent({
      towers: {
        secret: { id: "secret", name: "S", lore: "", costs: [10], levels: [{ range: 100, damage: 1, fireRate: 1 }], groundOnly: false, splashRadius: 0, requiresUnlock: "key" },
      },
      slots: [{ x: 10, y: 40 }],
    });
    const s = createRun(locked, FRESH_PROFILE);
    expect(buildTower(s, locked, 0, "secret", [])).toBe(false);
    expect(buildTower(s, locked, 0, "secret", ["key"])).toBe(true);
  });

  it("ouvre les trois rangs de tour d'emblée, mais pas les spécialisations", () => {
    // La méta vend des paliers de puissance plutôt que des tours entières. Les trois
    // rangs du content sont accessibles sans rien acheter — plafonner au rang 2
    // rendait le chapitre 1 lui-même infranchissable — et c'est le rang 4 que
    // « Doctrines de siège » débloque (ADR-024).
    const withSpecs: Profile = { ...FRESH_PROFILE, unlocks: ["tower_specs"] };
    const maxRank = (p: Profile) => {
      const s = createRun(CONTENT, p);
      s.gold = 10000;
      buildTower(s, CONTENT, 0, "tower_archer", p.unlocks);
      while (upgradeTower(s, CONTENT, 0)) { /* monte tant que c'est permis */ }
      return s.towers[0]!.level;
    };
    expect(maxRank(FRESH_PROFILE)).toBe(CONTENT.towers.tower_archer!.levels.length);

    const canSpec = (p: Profile) => {
      const s = createRun(CONTENT, p);
      s.gold = 10000;
      buildTower(s, CONTENT, 0, "tower_archer", p.unlocks);
      while (upgradeTower(s, CONTENT, 0)) { /* rang max */ }
      return specializeTower(s, CONTENT, 0, "spec_volley");
    };
    expect(canSpec(FRESH_PROFILE)).toBe(false);
    expect(canSpec(withSpecs)).toBe(true);
  });

  it("fait PERDRE si un boss atteint le château", () => {
    // Avant, un boss qui touchait le château en était simplement retiré : la vague
    // se terminait et la victoire tombait quand même. On pouvait donc gagner un
    // niveau en laissant passer son boss (ADR-024).
    const c = mkContent({
      enemies: { walker: WALKER },
      waves: [{ enemyId: "walker", count: 1 }],
      miniBoss: { enemyId: "walker", hpMult: 1 },
    });
    const s = createRun(c, FRESH_PROFILE);
    parkHero(s);
    startNextWave(s, c);
    for (let i = 0; i < 60 * 40 && s.phase === "wave"; i++) tick(s, c, 1 / 60);
    expect(s.phase).toBe("defeat");
    expect(s.castleHp).toBeGreaterThan(0); // ce n'est pas la perte de PV qui tue, c'est le boss
  });

  it("laisse gagner quand le boss est abattu", () => {
    // Le pendant : la règle ne doit pas rendre les niveaux infranchissables.
    const c = mkContent({
      towers: { bow: { id: "bow", name: "B", lore: "", costs: [10], levels: [SNIPER], groundOnly: false, splashRadius: 0, requiresUnlock: null } },
      enemies: { walker: WALKER },
      waves: [{ enemyId: "walker", count: 1 }],
      slots: [{ x: 300, y: 0 }],
      miniBoss: { enemyId: "walker", hpMult: 1 },
    });
    const s = createRun(c, FRESH_PROFILE);
    parkHero(s);
    buildTower(s, c, 0, "bow", []);
    startNextWave(s, c);
    for (let i = 0; i < 60 * 40 && s.phase === "wave"; i++) tick(s, c, 1 / 60);
    expect(s.phase).toBe("victory");
  });

  it("débite l'or à la construction et refuse si insuffisant", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    const before = s.gold;
    expect(buildTower(s, CONTENT, 0, "tower_archer", [])).toBe(true);
    expect(s.gold).toBe(before - CONTENT.towers["tower_archer"]!.costs[0]!);
    s.gold = 0;
    expect(buildTower(s, CONTENT, 1, "tower_archer", [])).toBe(false);
  });

  it("scale les PV des vagues avec l'exposant du content", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    startNextWave(s, CONTENT);
    tick(s, CONTENT, 2); // laisse spawner
    const e = s.enemies[0]!;
    expect(e.maxHp).toBe(Math.round(CONTENT.enemies[e.defId]!.hp * 1)); // vague 0 : mult = exp^0 = 1
  });

  it("une défaite après au moins une vague rapporte des Éclats (jamais punitif)", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    startNextWave(s, CONTENT);
    s.phase = "defeat";
    const r = computeResult(s, CONTENT);
    expect(r.shards).toBeGreaterThan(0);
  });

  it("vendre une tour rembourse le taux du content sur l'investissement total", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    s.gold = 1000;
    buildTower(s, CONTENT, 0, "tower_archer", []);
    const def = CONTENT.towers["tower_archer"]!;
    // niveau 1 : remboursement = coût de construction × taux
    expect(sellRefundFor(CONTENT, "tower_archer", 1)).toBe(Math.round(def.costs[0]! * CONTENT.economy.sellRefundRate));
    const before = s.gold;
    expect(sellTower(s, CONTENT, 0)).toBe(true);
    expect(s.gold).toBe(before + sellRefundFor(CONTENT, "tower_archer", 1));
    expect(s.towers).toHaveLength(0);
    expect(sellTower(s, CONTENT, 0)).toBe(false); // slot vide
  });

  it("contenu : les 10 chapitres sont jouables et cohérents (ennemis, chemins, slots)", () => {
    expect(CONTENT.chapters).toHaveLength(10);
    for (const ch of CONTENT.chapters) {
      expect(ch.playable).toBe(true);
      if (!ch.playable) continue;
      expect(ch.map.paths.length).toBeGreaterThanOrEqual(1);
      expect(ch.map.slots.length).toBeGreaterThanOrEqual(4);
      expect(ch.waves.length).toBeGreaterThanOrEqual(10);
      for (const w of ch.waves) {
        for (const sp of w.spawns) {
          expect(CONTENT.enemies[sp.enemyId], `${ch.id}: ennemi ${sp.enemyId}`).toBeDefined();
          expect(sp.pathIndex ?? 0, `${ch.id}: pathIndex`).toBeLessThan(ch.map.paths.length);
          expect(sp.count).toBeGreaterThan(0);
        }
        if (w.miniBoss) expect(CONTENT.enemies[w.miniBoss.enemyId]).toBeDefined();
      }
    }
  });

  it("les Sceaux récompensent le TEMPS passé à retenir la horde, pas les kills", () => {
    // Indexer sur les kills payait le mauvais placement : un héros posté à l'entrée
    // en tue beaucoup et laisse le château tomber, un héros en dernier rempart en
    // tue moins et fait gagner (mesuré au banc d'essai — ADR-021).
    const r = CONTENT.rewards;
    const s = createRun(CONTENT, FRESH_PROFILE);
    startNextWave(s, CONTENT);
    s.heroKills = 99;                      // ne doit RIEN rapporter à lui seul
    s.heroBlockSeconds = r.heroBlockSecondsPerSceau * 3;
    s.phase = "defeat";
    expect(computeResult(s, CONTENT).sceaux).toBe(3);
    s.phase = "victory";
    expect(computeResult(s, CONTENT).sceaux).toBe(3 + r.sceauxVictoryBonus);
  });

  it("retire des Sceaux à chaque mort du héros", () => {
    // Sans contrepartie, se jeter dans la horde pour mourir aussitôt serait rentable :
    // le blocage doit récompenser l'engagement, pas le sacrifice répété.
    const r = CONTENT.rewards;
    const s = createRun(CONTENT, FRESH_PROFILE);
    startNextWave(s, CONTENT);
    s.heroBlockSeconds = r.heroBlockSecondsPerSceau * 4;
    s.phase = "defeat";
    const intact = computeResult(s, CONTENT).sceaux;
    s.heroDeaths = 2;
    expect(computeResult(s, CONTENT).sceaux).toBe(intact - 2 * r.sceauxPerHeroDeath);
  });

  it("ne rend jamais de Sceaux négatifs", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    startNextWave(s, CONTENT);
    s.heroDeaths = 50;
    s.phase = "defeat";
    expect(computeResult(s, CONTENT).sceaux).toBe(0);
  });

  it("le niveau de sort du profil change les stats du Tournoiement", () => {
    const lv1 = CONTENT.hero.skills.whirlwind.levels[0]!;
    const lv3 = CONTENT.hero.skills.whirlwind.levels[2]!;
    const mkEnemy = (s: ReturnType<typeof createRun>) => {
      s.enemies.push({
        uid: s.nextUid++, defId: "orc", pathIndex: 0,
        hp: lv1.damage + 1, maxHp: lv1.damage + 1, // survit au niv.1, meurt au niv.3
        dist: 0, pos: { ...s.hero.pos }, slowUntil: 0, slowFactor: 1,
        burnUntil: 0, burnPctPerS: 0, blocked: false, alive: true, boss: false,
      });
      return s.enemies[s.enemies.length - 1]!;
    };
    const s1 = createRun(CONTENT, FRESH_PROFILE);
    const e1 = mkEnemy(s1);
    castWhirlwind(s1, CONTENT, []);
    expect(e1.alive).toBe(true);
    expect(s1.heroKills).toBe(0);

    const s3 = createRun(CONTENT, { ...FRESH_PROFILE, skills: { whirlwind: 3, rally: 1 } });
    expect(lv3.damage).toBeGreaterThan(lv1.damage + 1);
    const e3 = mkEnemy(s3);
    castWhirlwind(s3, CONTENT, []);
    expect(e3.alive).toBe(false);
    expect(s3.heroKills).toBe(1); // un kill du héros → compte pour les Sceaux
  });

  it("createRun copie les niveaux de forge du profil", () => {
    const s = createRun(CONTENT, { ...FRESH_PROFILE, forge: { tower_archer: 2 } });
    expect(s.forgeLevels["tower_archer"]).toBe(2);
  });

  it("spécialisation : réservée au niveau max, payée en or, définitive ; comptée à la revente", () => {
    const s = createRun(CONTENT, FULL_PROFILE);
    s.gold = 10000;
    buildTower(s, CONTENT, 0, "tower_archer", []);
    expect(specializeTower(s, CONTENT, 0, "spec_volley")).toBe(false); // niveau 1 : refusé
    upgradeTower(s, CONTENT, 0); upgradeTower(s, CONTENT, 0);          // → niveau 3 (max)
    const before = s.gold;
    const specCost = CONTENT.towers["tower_archer"]!.specs!.find(sp => sp.id === "spec_volley")!.cost;
    expect(specializeTower(s, CONTENT, 0, "spec_volley")).toBe(true);
    expect(s.gold).toBe(before - specCost);
    expect(specializeTower(s, CONTENT, 0, "spec_longbow")).toBe(false); // déjà spécialisée
    // Revente : la spécialisation fait partie de l'investissement remboursé
    const def = CONTENT.towers["tower_archer"]!;
    const invested = def.costs.reduce((a, b) => a + b, 0) + specCost;
    expect(sellRefundFor(CONTENT, "tower_archer", 3, "spec_volley")).toBe(Math.round(invested * CONTENT.economy.sellRefundRate));
  });

  it("Volée (multishot) touche plusieurs cibles dans le même tir", () => {
    const towers = {
      bow: {
        id: "bow", name: "B", lore: "", costs: [10, 10, 10],
        levels: [SNIPER, SNIPER, SNIPER], groundOnly: false, splashRadius: 0, requiresUnlock: null,
        specs: [{ id: "multi", name: "M", desc: "", cost: 10, stats: { range: 700, damage: 999, fireRate: 0.1 }, multishot: 3 }],
      },
    };
    // 3 entrées de spawn distinctes → les 3 ennemis sortent à t=0, avant le premier tir
    const c = mkContent({
      towers, enemies: { walker: WALKER },
      waves: [{ enemyId: "walker", count: 1 }, { enemyId: "walker", count: 1 }, { enemyId: "walker", count: 1 }],
      slots: [{ x: 300, y: 40 }],
    });
    const s = createRun(c, FRESH_PROFILE);
    s.gold = 1000;
    parkHero(s);
    buildTower(s, c, 0, "bow", []); upgradeTower(s, c, 0); upgradeTower(s, c, 0);
    specializeTower(s, c, 0, "multi");
    startNextWave(s, c);
    tick(s, c, 1.5); // un seul tir part (cadence 0.1/s)
    expect(s.kills).toBe(3); // un tir, trois morts
  });

  it("la brûlure (% PV max/s) achève une cible que l'impact ne tue pas", () => {
    const towers = {
      fire: {
        id: "fire", name: "F", lore: "", costs: [10],
        levels: [{ range: 700, damage: 1, fireRate: 0.05 }], // impact négligeable, un seul tir
        groundOnly: false, splashRadius: 0, requiresUnlock: null,
        specs: [{ id: "burn", name: "B", desc: "", cost: 10, stats: { range: 700, damage: 1, fireRate: 0.05 }, burn: { pctMaxHpPerS: 0.5, durationS: 3 } }],
      },
    };
    const c = mkContent({ towers, enemies: { walker: { ...WALKER, hp: 100, speed: 5 } }, waves: [{ enemyId: "walker", count: 1 }], slots: [{ x: 50, y: 40 }] });
    const s = createRun(c, FULL_PROFILE);
    s.gold = 1000;
    parkHero(s);
    buildTower(s, c, 0, "fire", []);
    specializeTower(s, c, 0, "burn");
    startNextWave(s, c);
    tick(s, c, 4); // 50% PV/s pendant 3s → mort par le feu
    expect(s.kills).toBe(1);
  });

  it("Cœur de blizzard : ne tire plus mais ralentit en continu dans son aura", () => {
    const towers = {
      frost: {
        id: "frost", name: "G", lore: "", costs: [10],
        levels: [SNIPER], groundOnly: false, splashRadius: 0, requiresUnlock: null,
        specs: [{ id: "aura", name: "A", desc: "", cost: 10, stats: { range: 0, damage: 0, fireRate: 0 }, aura: { radius: 700, slowFactor: 0.5 } }],
      },
    };
    const c = mkContent({ towers, enemies: { walker: { ...WALKER, hp: 100000 } }, waves: [{ enemyId: "walker", count: 1 }], slots: [{ x: 300, y: 40 }] });
    const s = createRun(c, FULL_PROFILE);
    s.gold = 1000;
    parkHero(s);
    buildTower(s, c, 0, "frost", []);
    specializeTower(s, c, 0, "aura");
    startNextWave(s, c);
    tick(s, c, 4);
    const e = s.enemies[0]!;
    expect(s.kills).toBe(0);              // l'aura ne tue pas
    expect(e.slowFactor).toBe(0.5);       // mais elle gèle
    expect(e.dist).toBeLessThan(4 * 60 * 0.7); // distance nettement réduite
  });

  it("étoiles : 3 = sans-faute, 2 = imparfait, 1 = héros mort + château très entamé, 0 = défaite", () => {
    const rate = (phase: "victory" | "defeat", castleHp: number, heroDeaths: number) => {
      const s = createRun(CONTENT, FRESH_PROFILE);
      s.phase = phase; s.castleHp = castleHp; s.heroDeaths = heroDeaths;
      return computeResult(s, CONTENT).stars;
    };
    const max = createRun(CONTENT, FRESH_PROFILE).castleHpMax;
    expect(rate("victory", max, 0)).toBe(3);      // château intact, héros jamais mort
    expect(rate("victory", max - 1, 0)).toBe(2);  // château touché
    expect(rate("victory", max, 2)).toBe(2);      // héros mort mais château intact
    expect(rate("victory", Math.floor(max * 0.4), 1)).toBe(1); // héros mort ET >50% PV perdus
    expect(rate("defeat", 0, 0)).toBe(0);
  });

  it("un monstre renforcé explose plus fort sur le château (dégâts × √mult)", () => {
    // walker : dtc 1. Mini-boss ×4 PV → dégâts = round(1 × 4^0.5) = 2.
    const c = mkContent({ enemies: { walker: WALKER }, waves: [] });
    if (c.chapters[0]!.playable) c.chapters[0]!.waves[0]!.miniBoss = { enemyId: "walker", hpMult: 4 };
    const s = createRun(c, FRESH_PROFILE);
    parkHero(s);
    startNextWave(s, c);
    tick(s, c, 15); // spawn (+2s) puis traversée des 600px à 60px/s
    expect(s.castleHp).toBe(100 - 2);
  });

  it("multi-chemins : un spawn avec pathIndex arrive par son propre chemin jusqu'au château", () => {
    // Mini content : 2 chemins (le 2e est un portail), 1 ennemi qui spawn sur le portail
    const MINI: ContentPack = {
      towers: {},
      enemies: { runner: { id: "runner", name: "Runner", lore: "", hp: 10, speed: 100, flying: false, goldReward: 1, damageToCastle: 5, meleeDps: 0 } },
      chapters: [{
        id: "t1", name: "test", lore: "", playable: true,
        map: {
          castleHp: 10,
          paths: [
            { waypoints: [{ x: 0, y: 0 }, { x: 400, y: 0 }] },
            { waypoints: [{ x: 0, y: 300 }, { x: 400, y: 0 }], portal: true },
          ],
          slots: [],
        },
        waves: [{ spawns: [{ enemyId: "runner", count: 1, intervalS: 1, delayS: 0, pathIndex: 1 }] }],
      }],
      hero: CONTENT.hero,
      scaling: { hpExponent: 1, castleDamageExponent: 0.5 },
      accountSpell: { damage: 0, radius: 1, cooldownS: 1 },
      forge: { damageMultPerLevel: 0, upgradeCosts: [] },
      economy: { sellRefundRate: 0.65, startingGold: 120 },
      rating: { heavyDamagePct: 0.5 },
      rewards: CONTENT.rewards,
      unlocks: [],
    };
    const s = createRun(MINI, FRESH_PROFILE);
    s.hero.pos = { x: -999, y: -999 }; s.hero.target = { x: -999, y: -999 }; // hors de portée
    startNextWave(s, MINI);
    tick(s, MINI, 0.5);
    const e = s.enemies[0]!;
    expect(e.pathIndex).toBe(1);
    expect(e.pos.y).toBeGreaterThan(200); // il vient bien de l'entrée du portail (0,300)
    tick(s, MINI, 10); // chemin ~500px à 100px/s
    expect(s.castleHp).toBe(5); // le château a bien été touché par le chemin du portail
    expect(s.phase).toBe("victory"); // dernière vague consommée, château debout
    // Bestiaire : la créature croisée est marquée et remonte dans le résultat
    expect(s.seenEnemies).toEqual(["runner"]);
    expect(computeResult(s, MINI).seenEnemies).toEqual(["runner"]);
  });

  it("groundOnly : une tour anti-sol ignore les volants, une tour polyvalente les abat (GDD)", () => {
    const towers = {
      cannon: { id: "cannon", name: "C", lore: "", costs: [10], levels: [SNIPER], groundOnly: true, splashRadius: 0, requiresUnlock: null },
      bow: { id: "bow", name: "B", lore: "", costs: [10], levels: [SNIPER], groundOnly: false, splashRadius: 0, requiresUnlock: null },
    };
    for (const [towerId, survives] of [["cannon", true], ["bow", false]] as const) {
      const c = mkContent({ towers, enemies: { flyer: FLYER }, waves: [{ enemyId: "flyer", count: 1 }], slots: [{ x: 300, y: 40 }] });
      const s = createRun(c, FRESH_PROFILE);
      parkHero(s);
      expect(buildTower(s, c, 0, towerId, [])).toBe(true);
      startNextWave(s, c);
      tick(s, c, 3); // le volant traverse la portée de la tour
      expect(s.kills === 0).toBe(survives); // cannon : jamais touché ; bow : abattu
    }
  });

  it("le héros bloque l'ennemi terrestre à portée de mêlée, jamais le volant", () => {
    for (const [enemy, blocked] of [[WALKER, true], [FLYER, false]] as const) {
      const c = mkContent({ enemies: { [enemy.id]: { ...enemy, hp: 100000 } }, waves: [{ enemyId: enemy.id, count: 1 }] });
      const s = createRun(c, FRESH_PROFILE);
      s.hero.pos = { x: 300, y: 0 }; s.hero.target = { x: 300, y: 0 }; // posté sur le chemin
      startNextWave(s, c);
      tick(s, c, 5); // l'ennemi atteint le héros (300px à 60px/s)
      expect(s.enemies[0]!.blocked).toBe(blocked);
    }
  });

  /** Points de tap hors carte : l'écran déborde du champ de bataille (ADR-010),
   *  chaque bord et chaque coin doit être couvert — un clamp partiel (2 bords sur 4)
   *  passerait un test moins complet. */
  const OUT_OF_BOUNDS: Vec2[] = [
    { x: -500, y: 300 }, { x: 9999, y: 300 }, { x: 400, y: -500 }, { x: 400, y: 9999 },
    { x: -500, y: -500 }, { x: 9999, y: 9999 }, { x: -0.5, y: BATTLEFIELD.h + 0.5 },
  ];

  const inBattlefield = (p: Vec2) =>
    p.x >= 0 && p.x <= BATTLEFIELD.w && p.y >= 0 && p.y <= BATTLEFIELD.h;

  it("clampToBattlefield ramène tout point dans la carte et laisse les autres intacts", () => {
    for (const p of OUT_OF_BOUNDS) expect(inBattlefield(clampToBattlefield(p))).toBe(true);
    // Les points légitimes, bords compris, passent inchangés.
    for (const p of [{ x: 0, y: 0 }, { x: 321, y: 123 }, { x: BATTLEFIELD.w, y: BATTLEFIELD.h }]) {
      expect(clampToBattlefield(p)).toEqual(p);
    }
  });

  // Filet anti-régression : TOUTE commande de sim ciblée par un tap doit borner son
  // point. Ajouter ici chaque nouvelle commande ciblée (pose d'entité, sort visé…) —
  // sans quoi le hors-champ tapable réintroduit le bug « le héros sort de la carte ».
  it("toute commande ciblée au tap agit dans le champ de bataille", () => {
    const c = mkContent({});

    for (const p of OUT_OF_BOUNDS) {
      // moveHero : la cible ET la position atteinte restent dans la carte.
      const s = createRun(c, FRESH_PROFILE);
      moveHero(s, p);
      expect(inBattlefield(s.hero.target)).toBe(true);
      tick(s, c, 30); // laisse largement le temps d'atteindre la cible
      expect(inBattlefield(s.hero.pos)).toBe(true);

      // castAccountSpell : la déflagration est recentrée dans la carte au lieu
      // de brûler le cooldown dans le vide.
      const s2 = createRun(c, FRESH_PROFILE);
      s2.hasAccountSpell = true;
      const events: SimEvent[] = [];
      expect(castAccountSpell(s2, c, p, events)).toBe(true);
      const boom = events.find(e => e.type === "explosion");
      expect(boom && boom.type === "explosion" && inBattlefield(boom.pos)).toBe(true);
    }
  });

  it("le givre ralentit : un ennemi gelé parcourt moins de distance", () => {
    const frost = {
      frost: {
        id: "frost", name: "G", lore: "", costs: [10],
        levels: [{ range: 700, damage: 0, fireRate: 5 }],
        groundOnly: false, splashRadius: 0, slow: { factor: 0.5, duration: 10 }, requiresUnlock: null,
      },
    };
    const run = (withTower: boolean) => {
      const c = mkContent({ towers: frost, enemies: { walker: WALKER }, waves: [{ enemyId: "walker", count: 1 }], slots: [{ x: 100, y: 40 }] });
      const s = createRun(c, FRESH_PROFILE);
      parkHero(s);
      if (withTower) buildTower(s, c, 0, "frost", []);
      startNextWave(s, c);
      tick(s, c, 4);
      return s.enemies[0]!;
    };
    const slowed = run(true), free = run(false);
    expect(slowed.slowFactor).toBe(0.5);
    expect(slowed.dist).toBeLessThan(free.dist * 0.7); // nettement ralenti
  });

  it("déterminisme (ADR-001) : mêmes commandes → état final identique, quel que soit le découpage du temps", () => {
    // Mêmes commandes, même temps réel total ; seul le découpage change. On compare
    // l'état de JEU (or, PV, kills, positions…) — l'horloge peut différer d'un pas
    // de bruit flottant dans l'accumulateur, sans effet gameplay.
    const play = (chunks: number[]) => {
      const s = createRun(CONTENT, FRESH_PROFILE);
      buildTower(s, CONTENT, 0, "tower_archer", []);
      buildTower(s, CONTENT, 4, "tower_catapult", []);
      startNextWave(s, CONTENT);
      for (const dt of chunks) tick(s, CONTENT, dt);
      const o = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
      delete o["time"]; delete o["timeAcc"];
      for (const t of o["towers"] as { cooldown?: number }[]) delete t.cooldown;
      return JSON.stringify(o);
    };
    const a = play(Array(30).fill(1));      // 30 ticks de 1s
    const b = play(Array(60).fill(0.5));    // 60 ticks de 0.5s
    expect(JSON.parse(a).kills).toBeGreaterThan(0); // le scénario a bien combattu
    expect(a).toBe(b);
  });

  it("la forge augmente les dégâts des tours (un niveau = un kill plus rapide)", () => {
    const towers = {
      bow: { id: "bow", name: "B", lore: "", costs: [10], levels: [{ range: 700, damage: 10, fireRate: 1 }], groundOnly: false, splashRadius: 0, requiresUnlock: null },
    };
    const run = (forge: Record<string, number>) => {
      const c = mkContent({ towers, enemies: { walker: { ...WALKER, hp: 11, speed: 1 } }, waves: [{ enemyId: "walker", count: 1 }], slots: [{ x: 10, y: 40 }] });
      const s = createRun(c, { ...FRESH_PROFILE, forge });
      parkHero(s);
      buildTower(s, c, 0, "bow", []);
      startNextWave(s, c);
      tick(s, c, 0.5); // un seul tir part (cadence 1/s)
      return s.kills === 0;
    };
    expect(run({})).toBe(true);          // 10 dégâts < 11 PV : survit
    expect(run({ bow: 1 })).toBe(false); // 11 dégâts (+10%) : tué d'un coup
  });

  it("sans tour, le château finit par tomber (simulation complète)", () => {
    const s = createRun(CONTENT, FRESH_PROFILE);
    s.hero.hp = 1; // neutralise quasi le héros
    startNextWave(s, CONTENT);
    for (let i = 0; i < 600 && s.phase !== "defeat"; i++) {
      tick(s, CONTENT, 0.5);
      if (s.phase === "building") startNextWave(s, CONTENT);
    }
    expect(s.phase).toBe("defeat");
  });
});
