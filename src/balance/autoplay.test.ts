import { describe, expect, it } from "vitest";
import { CONTENT, UNLOCKS } from "../content/index";
import { autoplayAll, autoplayChapter, type Policy } from "./autoplay";
import { table } from "./report";

const POLICIES: Policy[] = ["spread", "mixed", "focus"];

describe("autoplay — étalon reproductible", () => {
  it("rejoue un chapitre à l'identique", () => {
    // Sans déterminisme, comparer deux réglages d'équilibrage ne veut rien dire :
    // l'écart mesuré pourrait venir du bruit. La sim n'a aucun RNG — le banc non plus.
    for (const policy of POLICIES) {
      const a = autoplayChapter(CONTENT, 0, { policy });
      const b = autoplayChapter(CONTENT, 0, { policy });
      expect(b.result).toEqual(a.result);
      expect(b.waves).toEqual(a.waves);
    }
  });

  it("termine chaque chapitre sans rester bloqué", () => {
    // Une vague qui n'arrive jamais à sa fin (ennemi immobile, DPS nul) figerait
    // le banc ; le coupe-circuit la marque `stalled` au lieu de boucler.
    for (const r of autoplayAll(CONTENT, { policy: "mixed" })) {
      expect(r.waves.some(w => w.stalled), `chapitre ${r.chapterIndex + 1} bloqué`).toBe(false);
      expect(r.waves.length).toBeGreaterThan(0);
    }
  });

  it("construit réellement une défense", () => {
    // Un bot qui ne dépense rien mesurerait la difficulté d'un château sans tours.
    const r = autoplayChapter(CONTENT, 0, { policy: "spread" });
    const last = r.waves[r.waves.length - 1]!;
    expect(last.towers).toBeGreaterThan(1);
    expect(last.towerLevels).toBeGreaterThanOrEqual(last.towers);
  });

  it("respecte le plafond d'emplacements de la carte", () => {
    // Dépasser les slots signifierait que le bot contourne `buildTower`.
    const slots = CONTENT.chapters[0]!.playable ? CONTENT.chapters[0]!.map.slots.length : 0;
    for (const policy of POLICIES) {
      const r = autoplayChapter(CONTENT, 0, { policy });
      for (const w of r.waves) expect(w.towers).toBeLessThanOrEqual(slots);
    }
  });

  it("concentre moins de tours en politique « focus »", () => {
    // Les politiques doivent produire des défenses DIFFÉRENTES, sinon les comparer
    // ne révèle aucune stratégie dominante.
    const spread = autoplayChapter(CONTENT, 0, { policy: "spread" });
    const focus = autoplayChapter(CONTENT, 0, { policy: "focus" });
    const towersOf = (r: typeof spread) => r.waves[r.waves.length - 1]!.towers;
    expect(towersOf(focus)).toBeLessThan(towersOf(spread));
  });

  it("fait peser le pilotage du héros sur la survie du château", () => {
    // Mesuré : piloter le héros lui fait TUER MOINS (posté en fin de chemin, il ne
    // croise que les survivants) mais GAGNER PLUS de chapitres. La valeur du héros
    // est dans le blocage en dernier rempart, pas dans son compteur de kills — et
    // c'est bien la survie du château, l'objectif du jeu, qu'on vérifie ici.
    const total = (useHero: boolean) =>
      autoplayAll(CONTENT, { policy: "mixed", useHero })
        .reduce((a, r) => a + r.result.castleHpLeft, 0);
    expect(total(true)).toBeGreaterThan(total(false));
  });

  it("tient compte du profil méta fourni", () => {
    // La forge doit se voir dans les résultats, sinon on ne peut pas mesurer si la
    // méta-progression rend les chapitres tardifs abordables.
    const base = autoplayChapter(CONTENT, 0, { policy: "focus" });
    const forged = autoplayChapter(CONTENT, 0, {
      policy: "focus",
      profile: { forge: { tower_archer: 4, tower_catapult: 4, tower_frost: 4 } },
    });
    expect(forged.result.castleHpLeft).toBeGreaterThanOrEqual(base.result.castleHpLeft);
  });
});

describe("autoplay — compositions de défense", () => {
  it("respecte la composition imposée", () => {
    // Sans ça, la mesure « une tour seule contre un mélange » ne mesurerait rien :
    // le bot retomberait sur son cycle par défaut et toutes les lignes seraient égales.
    const r = autoplayChapter(CONTENT, 0, { policy: "spread", towers: ["tower_archer"] });
    expect(r.waves[r.waves.length - 1]!.towers).toBeGreaterThan(1);
  });

  it("distingue une défense mono-tour d'un mélange", () => {
    // Deux compositions qui donnent le même résultat signaleraient que l'option est
    // ignorée — le rapport conclurait « pas de décision tactique » à tort.
    const solo = autoplayChapter(CONTENT, 0, { policy: "spread", towers: ["tower_archer"] });
    const mix = autoplayChapter(CONTENT, 0, {
      policy: "spread", towers: ["tower_archer", "tower_catapult"],
    });
    expect(mix.result.castleHpLeft).not.toBe(solo.result.castleHpLeft);
  });

  it("ignore une tour non débloquée sans planter", () => {
    // `tower_frost` exige un unlock : imposée sans lui, le bot doit se rabattre,
    // pas boucler à vide ni construire une tour interdite.
    const r = autoplayChapter(CONTENT, 0, { policy: "spread", towers: ["tower_frost"] });
    expect(r.waves.length).toBeGreaterThan(0);
    expect(r.waves[r.waves.length - 1]!.towers).toBe(0);
  });
});

describe("rôles des tours — diversifier doit payer", () => {
  // GARANTIE DE DESIGN, pas de code. Le GDD promet un « triangle de rôles » ; il
  // n'existait que dans l'intention : une défense d'archeries seules gagnait 9
  // chapitres sur 10 quand un mélange n'en gagnait que 5 (ADR-020). Choisir sa tour
  // n'était pas une décision, c'était un piège — et aucun ennemi « anti-X » n'aurait
  // rien changé tant que la tour censée le contrer ne valait pas d'être construite.
  const unlocked = { unlocks: ["tower_frost"] };
  const run = (towers: string[]) => {
    const rs = autoplayAll(CONTENT, { policy: "spread", towers, profile: unlocked });
    return {
      wins: rs.filter(r => r.result.victory).length,
      hp: rs.reduce((a, r) => a + r.result.castleHpLeft, 0),
    };
  };

  it("fait gagner le mélange plus souvent que n'importe quelle tour seule", () => {
    const ids = Object.keys(CONTENT.towers);
    const mix = run(ids);
    for (const id of ids) {
      const solo = run([id]);
      expect(mix.wins, `${CONTENT.towers[id]!.name} seule gagne autant que le mélange`)
        .toBeGreaterThan(solo.wins);
      expect(mix.hp, `${CONTENT.towers[id]!.name} seule protège autant que le mélange`)
        .toBeGreaterThan(solo.hp);
    }
  });

  it("laisse chaque tour seule insuffisante", () => {
    // Une tour qui suffit à elle seule à finir le jeu rend les deux autres décoratives.
    for (const id of Object.keys(CONTENT.towers)) {
      const solo = run([id]);
      expect(solo.wins, `${CONTENT.towers[id]!.name} seule finit tout le jeu`)
        .toBeLessThan(CONTENT.chapters.filter(c => c.playable).length);
    }
  });
});

describe("progression — la méta doit être la condition de la fin du jeu", () => {
  const LAST = CONTENT.chapters.filter(c => c.playable).length - 1;
  const veteran = {
    unlocks: UNLOCKS.map(u => u.id),
    forge: { tower_archer: 4, tower_catapult: 4, tower_frost: 4 },
    skills: { whirlwind: 4, rally: 4 },
  };

  it("rend le dernier chapitre infranchissable sans méta-progression", () => {
    // Si le jeu se finit avec un profil vierge, la boucle run → monnaies → run plus
    // fort n'est qu'un décor : rien n'oblige jamais à dépenser quoi que ce soit.
    const raw = autoplayChapter(CONTENT, LAST, { policy: "spread" });
    expect(raw.result.victory).toBe(false);
  });

  it("le rend franchissable avec l'armurerie et la forge", () => {
    // Le pendant du test précédent : une méta indispensable mais insuffisante
    // rendrait le dernier chapitre simplement impossible.
    const vet = autoplayChapter(CONTENT, LAST, { policy: "spread", profile: veteran });
    expect(vet.result.victory).toBe(true);
  });

  it("introduit une créature de plus à chaque chapitre du début de campagne", () => {
    // La progression du bestiaire est le fil du mode Histoire : sans elle, tous les
    // chapitres se ressemblent quelles que soient les cartes.
    const seen = CONTENT.chapters.map(ch =>
      ch.playable
        ? new Set(ch.waves.flatMap(w => [...w.spawns.map(s => s.enemyId), ...(w.miniBoss ? [w.miniBoss.enemyId] : [])])).size
        : 0);
    for (let i = 1; i < 5; i++) {
      expect(seen[i], `ch${i + 1} n'apporte aucune créature de plus que le ch${i}`)
        .toBeGreaterThan(seen[i - 1]!);
    }
  });
});

describe("report — mise en forme", () => {
  it("aligne les colonnes sur le contenu le plus large", () => {
    const out = table(["A", "B"], [["très-long", "1"]]).split("\n");
    expect(out[0]).toContain("A");
    expect(out).toHaveLength(3); // en-tête + séparateur + 1 ligne
    const widths = out.map(l => l.length);
    expect(new Set(widths).size).toBe(1); // toutes les lignes à la même largeur
  });

  it("supporte une table vide sans planter", () => {
    expect(() => table(["A"], [])).not.toThrow();
  });
});
