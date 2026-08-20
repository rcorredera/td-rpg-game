// ============================================================
// Intégrité RÉFÉRENTIELLE du content.
//
// Ce test existe parce que rien ne vérifiait qu'un identifiant cité par le
// content désigne quelque chose qui existe. Mesuré avant écriture : remplacer
// « brute » par « brute_INEXISTANT » dans le roster des vagues laissait passer
// les 259 tests du projet.
//
// La sanction n'est pas une valeur fausse, c'est un CRASH en cours de partie :
// `sim.ts` résout ces identifiants par indexation directe suivie d'une assertion
// non-null — `c.enemies[p.enemyId]!`, `ch.map.paths[p.pathIndex]!` — parce que
// l'invariant « le content est cohérent » y est supposé acquis. Il n'était
// garanti nulle part. Ces tests SONT cette garantie.
//
// Ils portent sur des FAMILLES entières, jamais sur un cas trouvé : on balaie
// tous les chapitres, toutes les vagues, toutes les tours. Un content de 970
// lignes dont les chapitres 2 à 20 sont GÉNÉRÉS (`makeWaves`/`makeChapter`) ne
// se relit pas à l'œil — une faute de frappe dans un roster ne se voit qu'en
// jouant le chapitre concerné, donc potentiellement jamais avant un joueur.
// ============================================================

import { describe, expect, it } from "vitest";
import { CONTENT } from "./index";
import type { ChapterDef, PlayableChapter, TowerDef, WaveDef } from "../core/types";

const PLAYABLE: PlayableChapter[] = CONTENT.chapters.filter(
  (c: ChapterDef): c is PlayableChapter => c.playable,
);

/** Repère lisible dans le message d'échec : « ch.7 vague 3 ». */
function where(chapterIndex: number, waveIndex?: number): string {
  return waveIndex === undefined
    ? `ch.${chapterIndex + 1}`
    : `ch.${chapterIndex + 1} vague ${waveIndex + 1}`;
}

describe("content — les identifiants cités désignent quelque chose", () => {
  it("chaque enemyId de vague existe dans le catalogue d'ennemis", () => {
    const inconnus: string[] = [];
    PLAYABLE.forEach((ch: PlayableChapter, ci: number) => {
      ch.waves.forEach((w: WaveDef, wi: number) => {
        for (const sp of w.spawns) {
          if (!CONTENT.enemies[sp.enemyId]) inconnus.push(`${where(ci, wi)} → « ${sp.enemyId} »`);
        }
      });
    });
    expect(inconnus, "ennemis cités mais absents du catalogue").toEqual([]);
  });

  it("chaque enemyId de mini-boss existe dans le catalogue d'ennemis", () => {
    const inconnus: string[] = [];
    PLAYABLE.forEach((ch: PlayableChapter, ci: number) => {
      ch.waves.forEach((w: WaveDef, wi: number) => {
        const id: string | undefined = w.miniBoss?.enemyId;
        if (id !== undefined && !CONTENT.enemies[id]) inconnus.push(`${where(ci, wi)} → « ${id} »`);
      });
    });
    expect(inconnus, "mini-boss cités mais absents du catalogue").toEqual([]);
  });

  it("chaque pathIndex de spawn désigne un chemin existant de SA carte", () => {
    // `sim.ts` fait `ch.map.paths[p.pathIndex]!.waypoints[0]!` au moment du spawn :
    // un index hors table ne rend pas un mauvais chemin, il fait planter la vague.
    const hors: string[] = [];
    PLAYABLE.forEach((ch: PlayableChapter, ci: number) => {
      const n: number = ch.map.paths.length;
      ch.waves.forEach((w: WaveDef, wi: number) => {
        for (const sp of w.spawns) {
          const idx: number = sp.pathIndex ?? 0;
          if (!Number.isInteger(idx) || idx < 0 || idx >= n) {
            hors.push(`${where(ci, wi)} → chemin ${idx} sur ${n}`);
          }
        }
      });
    });
    expect(hors, "spawns dont le chemin n'existe pas").toEqual([]);
  });

  it("chaque requiresUnlock de tour désigne un déblocage existant", () => {
    const ids: Set<string> = new Set(CONTENT.unlocks.map((u) => u.id));
    const inconnus: string[] = [];
    for (const [key, def] of Object.entries(CONTENT.towers)) {
      const req: string | null = def.requiresUnlock;
      if (req !== null && !ids.has(req)) inconnus.push(`tour « ${key} » → « ${req} »`);
    }
    expect(inconnus, "déblocages requis mais inexistants").toEqual([]);
  });
});

describe("content — les identifiants sont uniques et cohérents avec leur clé", () => {
  it("la clé d'une tour est son id, et celle d'un ennemi le sien", () => {
    // Le code indexe tantôt par la clé (`c.enemies[e.defId]`), tantôt lit `.id`
    // (registres de sprites, bestiaire) : les deux doivent désigner la même chose.
    const ecarts: string[] = [];
    for (const [key, def] of Object.entries(CONTENT.towers)) {
      if (def.id !== key) ecarts.push(`tour clé « ${key} » ≠ id « ${def.id} »`);
    }
    for (const [key, def] of Object.entries(CONTENT.enemies)) {
      if (def.id !== key) ecarts.push(`ennemi clé « ${key} » ≠ id « ${def.id} »`);
    }
    expect(ecarts, "clé de catalogue et id divergents").toEqual([]);
  });

  it("aucun déblocage en double", () => {
    const ids: string[] = CONTENT.unlocks.map((u) => u.id);
    expect(ids, "ids de déblocage dupliqués").toHaveLength(new Set(ids).size);
  });

  it("aucune spécialisation en double, toutes tours confondues", () => {
    // `towerView` résout la teinte par `skin.specSprite?.[specId]`, un registre
    // PLAT : deux tours qui nommeraient pareil leur spécialisation partageraient
    // son sprite sans qu'aucun type ne s'y oppose.
    const specs: string[] = Object.values(CONTENT.towers).flatMap((t: TowerDef) =>
      (t.specs ?? []).map((s) => s.id),
    );
    expect(specs, "ids de spécialisation dupliqués").toHaveLength(new Set(specs).size);
  });

  it("aucun chapitre en double", () => {
    const ids: string[] = CONTENT.chapters.map((c) => c.id);
    expect(ids, "ids de chapitre dupliqués").toHaveLength(new Set(ids).size);
  });
});

describe("content — les tables indexées par chapitre couvrent tous les chapitres", () => {
  // Ces deux tables ont un repli silencieux (`defaultChapterBudget`, « absent = 1 »).
  // Le repli protège du crash, pas du déséquilibre : un chapitre ajouté sans sa
  // ligne serait jouable, paierait ×1 là où le ch.20 paie ×5,60, et rien ne le
  // signalerait. C'est exactement ce qui a été mesuré à l'ADR-021 avant correction.
  it("chaque chapitre a son budget d'or explicite", () => {
    const trous: number[] = CONTENT.chapters
      .map((_, i: number) => i)
      .filter((i: number) => !Number.isFinite(CONTENT.economy.chapterBudget[i]));
    expect(trous, "chapitres sans budget d'or").toEqual([]);
  });

  it("chaque chapitre a son multiplicateur d'Éclats explicite", () => {
    const mult: number[] | undefined = CONTENT.rewards.shardsChapterMult;
    expect(mult, "table de multiplicateurs absente").toBeDefined();
    const trous: number[] = CONTENT.chapters
      .map((_, i: number) => i)
      .filter((i: number) => !Number.isFinite(mult?.[i]));
    expect(trous, "chapitres sans multiplicateur d'Éclats").toEqual([]);
  });
});

describe("content — aucune créature ne disparaît du jeu en silence", () => {
  it("chaque ennemi du catalogue est invoqué par au moins un chapitre", () => {
    // C'est le défaut que la génération de vagues rend possible : les rosters
    // NOMMENT les créatures (`rosterFor`, `NEWCOMER`) et chaque spawn est gardé
    // par `has("<id>")`. Une faute de frappe d'un côté ne produit donc pas un
    // identifiant invalide — elle éteint la garde, et la créature n'apparaît
    // simplement plus JAMAIS. Rien ne plante, rien ne diverge : le bestiaire la
    // décrit toujours, elle a son sprite et son son, et elle n'existe plus.
    const invoques: Set<string> = new Set<string>();
    for (const ch of PLAYABLE) {
      for (const w of ch.waves) {
        for (const sp of w.spawns) invoques.add(sp.enemyId);
        if (w.miniBoss) invoques.add(w.miniBoss.enemyId);
      }
    }
    const orphelins: string[] = Object.keys(CONTENT.enemies).filter((id: string) => !invoques.has(id));
    expect(orphelins, "ennemis du catalogue qu'aucune vague n'invoque").toEqual([]);
  });

  it("chaque tour du catalogue est constructible", () => {
    // Même famille : une tour dont le déblocage n'est acheté par aucun chemin de
    // progression serait payée en Éclats sans jamais servir.
    const inconnues: string[] = Object.values(CONTENT.towers)
      .filter((t: TowerDef) => t.costs.length === 0 || t.levels.length === 0)
      .map((t: TowerDef) => t.id);
    expect(inconnues, "tours sans coût ou sans palier").toEqual([]);
  });
});

describe("content — aucune vague vide", () => {
  it("chaque chapitre jouable a des vagues, et chaque vague a des ennemis", () => {
    // Une vague sans spawn ne se termine jamais : la condition de fin attend que
    // tous les ennemis soient morts ou arrivés, et il n'y en a aucun.
    const vides: string[] = [];
    PLAYABLE.forEach((ch: PlayableChapter, ci: number) => {
      if (ch.waves.length === 0) vides.push(`${where(ci)} sans vague`);
      ch.waves.forEach((w: WaveDef, wi: number) => {
        const total: number = w.spawns.reduce((n: number, sp) => n + sp.count, 0);
        if (total === 0 && !w.miniBoss) vides.push(`${where(ci, wi)} sans aucun ennemi`);
      });
    });
    expect(vides, "vagues qui ne peuvent pas se terminer").toEqual([]);
  });
});
