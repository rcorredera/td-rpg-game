import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
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
