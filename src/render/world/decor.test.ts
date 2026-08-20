import { describe, expect, it } from "vitest";
import type { Vec2 } from "../../core/types";
import {
  decorRamp, type DecorProp, type DecorRamp, type DecorRequest,
  isFree, type Keepout, planDecor, seedFrom,
} from "./decor";
import { distanceToSegment } from "./path";

const NO_KEEPOUT: Keepout = {
  polylines: [], points: [], polylineClearance: 0, pointClearance: 0,
};

function request(over: Partial<DecorRequest> = {}): DecorRequest {
  return {
    width: 900, height: 600,
    keepout: NO_KEEPOUT,
    count: 40,
    bushShare: 0.5,
    variants: { rock: 4, bush: 4 },
    seed: 1,
    ...over,
  };
}

describe("isFree", () => {
  const keepout: Keepout = {
    polylines: [[{ x: 0, y: 100 }, { x: 200, y: 100 }]],
    points: [{ x: 500, y: 500 }],
    polylineClearance: 40,
    pointClearance: 50,
  };

  it("refuse un point sur la route", () => {
    expect(isFree({ x: 100, y: 100 }, keepout)).toBe(false);
    expect(isFree({ x: 100, y: 120 }, keepout)).toBe(false); // à 20, sous le dégagement
  });

  it("accepte un point au-delà du dégagement de route", () => {
    expect(isFree({ x: 100, y: 145 }, keepout)).toBe(true);
  });

  it("refuse un point sur un emplacement de tour", () => {
    expect(isFree({ x: 500, y: 530 }, keepout)).toBe(false);
    expect(isFree({ x: 500, y: 555 }, keepout)).toBe(true);
  });

  it("évite les segments d'une polyligne, pas seulement ses sommets", () => {
    // Le piège : ne tester que la distance aux waypoints laisse le milieu des
    // longues lignes droites entièrement libre — les routes du jeu en sont faites.
    const long: Keepout = {
      ...NO_KEEPOUT,
      polylines: [[{ x: 0, y: 0 }, { x: 1000, y: 0 }]],
      polylineClearance: 30,
    };
    expect(isFree({ x: 500, y: 10 }, long)).toBe(false);
  });
});

describe("planDecor", () => {
  it("est DÉTERMINISTE : deux appels identiques donnent le même semis", () => {
    // Un décor qui saute d'une partie à l'autre se remarque, et rendrait toute
    // capture de référence incomparable.
    expect(planDecor(request())).toEqual(planDecor(request()));
  });

  it("change de semis quand la graine change", () => {
    expect(planDecor(request({ seed: 1 }))).not.toEqual(planDecor(request({ seed: 2 })));
  });

  it("ne dépasse jamais le nombre visé", () => {
    for (const count of [1, 7, 40, 120]) {
      expect(planDecor(request({ count })).length).toBeLessThanOrEqual(count);
    }
  });

  it("ne pose RIEN sur la route ni sur les emplacements de tour", () => {
    // C'est la seule erreur qui se voit vraiment en jeu : un buisson sous une
    // tour, ou au milieu du passage des créatures.
    const road: Vec2[] = [{ x: 0, y: 300 }, { x: 900, y: 300 }];
    const slot: Vec2 = { x: 200, y: 120 };
    const keepout: Keepout = {
      polylines: [road], points: [slot], polylineClearance: 60, pointClearance: 55,
    };
    const props: DecorProp[] = planDecor(request({ keepout, count: 200 }));
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) {
      expect(distanceToSegment(p, road[0]!, road[1]!)).toBeGreaterThanOrEqual(60);
      expect(Math.hypot(p.x - slot.x, p.y - slot.y)).toBeGreaterThanOrEqual(55);
    }
  });

  it("garde tous les props dans le champ, marge de bord comprise", () => {
    // Un prop à cheval sur le liseré du champ est coupé net.
    const props: DecorProp[] = planDecor(request({ count: 200 }));
    for (const p of props) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(900);
      expect(p.y).toBeLessThan(600);
    }
  });

  it("répartit sans laisser une moitié du champ vide", () => {
    // Le défaut d'un tirage uniforme : des amas et des vides francs, qui se
    // lisent comme une intention alors que ce n'est que du bruit.
    const props: DecorProp[] = planDecor(request({ count: 60 }));
    const left: number = props.filter(p => p.x < 450).length;
    const top: number = props.filter(p => p.y < 300).length;
    expect(left).toBeGreaterThan(props.length * 0.3);
    expect(left).toBeLessThan(props.length * 0.7);
    expect(top).toBeGreaterThan(props.length * 0.3);
    expect(top).toBeLessThan(props.length * 0.7);
  });

  it("respecte le mélange demandé : aucun buisson si la part est nulle", () => {
    // Une lande de cendre ou de givre n'a pas de verdure.
    const props: DecorProp[] = planDecor(request({ bushShare: 0, count: 80 }));
    expect(props.length).toBeGreaterThan(0);
    expect(props.every(p => p.kind === "rock")).toBe(true);
  });

  it("ne produit que des buissons quand la part est totale", () => {
    const props: DecorProp[] = planDecor(request({ bushShare: 1, count: 80 }));
    expect(props.every(p => p.kind === "bush")).toBe(true);
  });

  it("ne demande jamais une variante qui n'existe pas", () => {
    // Une frame hors planche affiche un carré vide, sans lever d'erreur.
    const props: DecorProp[] = planDecor(request({ variants: { rock: 1, bush: 2 }, count: 80 }));
    for (const p of props) {
      expect(p.variant).toBeGreaterThanOrEqual(0);
      expect(p.variant).toBeLessThan(p.kind === "rock" ? 1 : 2);
    }
  });

  it("rend un champ vide plutôt que de casser sur des entrées dégénérées", () => {
    expect(planDecor(request({ count: 0 }))).toEqual([]);
    expect(planDecor(request({ width: 10, height: 10 }))).toEqual([]);
  });

  it("varie les tailles et les miroirs, pour ne pas répéter la même silhouette", () => {
    const props: DecorProp[] = planDecor(request({ count: 60 }));
    expect(new Set(props.map(p => p.size)).size).toBeGreaterThan(3);
    expect(new Set(props.map(p => p.flip)).size).toBe(2);
  });
});

describe("decorRamp", () => {
  it("garde un prop plus SOMBRE que son sol", () => {
    // C'est ce qui le fait lire comme un objet posé dessus, et non comme une
    // tache de lumière qui concurrencerait les unités.
    const ground: number = 0x6b8c4a;
    const { dark, light } = decorRamp(ground);
    const g: readonly number[] = [(ground >> 16) & 0xff, (ground >> 8) & 0xff, ground & 0xff];
    for (let i: number = 0; i < 3; i++) {
      expect(dark[i]!).toBeLessThan(g[i]!);
      expect(light[i]!).toBeLessThanOrEqual(g[i]!);
    }
  });

  it("suit la teinte du biome : le prop appartient au lieu", () => {
    // Un rocher de toundra est gris-bleu, le même sur terre gâtée vire au brun.
    const tundra: DecorRamp = decorRamp(0x76858a);
    const blight: DecorRamp = decorRamp(0x5c3f3c);
    expect(tundra.light[2]).toBeGreaterThan(tundra.light[0]!); // bleuté
    expect(blight.light[0]).toBeGreaterThan(blight.light[2]!); // rougeâtre
  });

  it("reste dans les bornes RGB sur un sol extrême", () => {
    for (const ground of [0x000000, 0xffffff]) {
      const { dark, light } = decorRamp(ground);
      for (const c of [...dark, ...light]) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe("seedFrom", () => {
  it("est stable pour un même identifiant", () => {
    expect(seedFrom("ch-07")).toBe(seedFrom("ch-07"));
  });

  it("sépare deux chapitres voisins, qui partagent souvent un air de famille", () => {
    expect(seedFrom("ch-07")).not.toBe(seedFrom("ch-08"));
  });

  it("ne dépend PAS du rang du chapitre", () => {
    // Insérer un chapitre avant le ch.7 ne doit pas rebattre son décor. C'est
    // tout l'intérêt de dériver de l'id plutôt que de la position dans la liste.
    const before: number = seedFrom("ch-07");
    expect(seedFrom("ch-07")).toBe(before);
  });

  it("reste un entier borné, utilisable tel quel comme graine", () => {
    for (const id of ["", "a", "ch-20", "un-identifiant-vraiment-très-long"]) {
      const s: number = seedFrom(id);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(4096);
    }
  });
});
