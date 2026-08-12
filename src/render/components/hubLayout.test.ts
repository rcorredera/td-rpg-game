import { describe, expect, it } from "vitest";
import { computeViewport, WORLD_W } from "../viewport";
import { hubLayout, levelGridZone, menuZone, SIDE_BY_SIDE_MIN_WIDTH, type TileBox } from "./hubLayout";

/** Deux boîtes se chevauchent-elles ? (marge de 0,5 pour les arrondis) */
function overlaps(a: TileBox, b: TileBox): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w - 1
      && Math.abs(a.y - b.y) * 2 < a.h + b.h - 1;
}

const boxes = (l: ReturnType<typeof hubLayout>) => [l.primary, ...l.secondary];

describe("hubLayout — le Campement doit occuper l'écran", () => {
  // Défaut d'origine : cinq cartes de 540 unités empilées au centre, quand la
  // largeur logique en paysage mobile avoisine 1 300. Les deux tiers latéraux
  // restaient noirs, et l'écran lisait comme un menu de réglages (ADR-025).
  it("passe en deux colonnes dès que la largeur le permet", () => {
    const wide = hubLayout(600, 300, 1200, 400, 4);
    expect(wide.sideBySide).toBe(true);
    // La principale et la première secondaire sont côte à côte, pas l'une sous l'autre.
    expect(wide.secondary[0]!.x).toBeGreaterThan(wide.primary.x);
  });

  it("retombe en colonne unique sur écran étroit", () => {
    // Deux colonnes sur 500 unités donneraient des tuiles illisibles.
    const narrow = hubLayout(400, 300, 500, 400, 4);
    expect(narrow.sideBySide).toBe(false);
    expect(narrow.secondary[0]!.y).toBeGreaterThan(narrow.primary.y);
  });

  it("occupe vraiment la largeur disponible", () => {
    // LE test de cette famille : c'est le gâchis de largeur qui faisait « appli »
    // plutôt que « jeu ». On exige au moins 90 % de la zone utile couverte.
    const w = 1200;
    const l = hubLayout(600, 300, w, 400, 4);
    const left = Math.min(...boxes(l).map(b => b.x - b.w / 2));
    const right = Math.max(...boxes(l).map(b => b.x + b.w / 2));
    expect(right - left).toBeGreaterThanOrEqual(w * 0.9);
  });

  it("donne à la tuile principale plus de surface qu'à une secondaire", () => {
    // Sans hiérarchie, le joueur ne sait pas où aller — c'était le cas avec cinq
    // cartes identiques.
    for (const w of [500, 1200]) {
      const l = hubLayout(600, 300, w, 400, 4);
      const primaryArea = l.primary.w * l.primary.h;
      const secondArea = l.secondary[0]!.w * l.secondary[0]!.h;
      expect(primaryArea, `largeur ${w}`).toBeGreaterThan(secondArea);
    }
  });

  it("ne fait jamais se chevaucher deux tuiles", () => {
    for (const w of [400, 700, 900, 1400]) {
      for (const count of [2, 3, 4, 5]) {
        const all = boxes(hubLayout(600, 300, w, 400, count));
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            expect(overlaps(all[i]!, all[j]!), `w=${w} n=${count} : tuiles ${i} et ${j}`).toBe(false);
          }
        }
      }
    }
  });

  it("garde toutes les tuiles dans la zone donnée", () => {
    const l = hubLayout(600, 300, 1200, 400, 4);
    for (const b of boxes(l)) {
      expect(b.x - b.w / 2).toBeGreaterThanOrEqual(600 - 1200 / 2 - 1);
      expect(b.x + b.w / 2).toBeLessThanOrEqual(600 + 1200 / 2 + 1);
      expect(b.y - b.h / 2).toBeGreaterThanOrEqual(300 - 400 / 2 - 1);
      expect(b.y + b.h / 2).toBeLessThanOrEqual(300 + 400 / 2 + 1);
    }
  });

  it("bascule exactement au seuil annoncé", () => {
    expect(hubLayout(0, 0, SIDE_BY_SIDE_MIN_WIDTH, 400, 4).sideBySide).toBe(true);
    expect(hubLayout(0, 0, SIDE_BY_SIDE_MIN_WIDTH - 1, 400, 4).sideBySide).toBe(false);
  });
});

// ============================================================
// ANCRAGE. Les tests ci-dessus passent un centre ARBITRAIRE (`600`, `0`…) et
// vérifient tout RELATIVEMENT à ce centre : ils prouvent que la répartition est
// juste pour n'importe quel centre, jamais que le centre employé est le bon.
// C'est par ce trou qu'un `400` en dur (l'ancien 800/2) a survécu au passage du
// monde en 960×540 et décalé tout l'écran de 80 unités vers la gauche, sans
// qu'aucun test ne bronche. Même famille qu'ADR-028 : on testait la fonction
// pure, pas son ancrage dans le monde.
// ============================================================
describe("ancrage des écrans de menu dans le monde", () => {
  /** Un panel d'écrans réels, du mobile étroit au grand bureau. */
  const SCREENS: [string, number, number, number][] = [
    ["bureau 16:10", 1280, 800, 1],
    ["bureau large", 1920, 1080, 1],
    ["mobile paysage", 780, 360, 2],
    ["mobile étroit", 667, 375, 2],
    ["tablette", 1024, 768, 2],
  ];

  it("centre les écrans sur le monde, jamais sur une constante écrite en dur", () => {
    for (const [name, w, h, dpr] of SCREENS) {
      const v = computeViewport(w, h, dpr);
      expect(menuZone(v).cx, `${name} : Campement`).toBeCloseTo(WORLD_W / 2, 6);
      expect(levelGridZone(v).cx, `${name} : grille des chapitres`).toBeCloseTo(WORLD_W / 2, 6);
    }
  });

  it("garde toutes les tuiles du Campement dans la zone visible", () => {
    for (const [name, w, h, dpr] of SCREENS) {
      const v = computeViewport(w, h, dpr);
      const z = menuZone(v);
      for (const [i, b] of boxes(hubLayout(z.cx, z.cy, z.w, z.h, 4)).entries()) {
        expect(b.x - b.w / 2, `${name} : tuile ${i} déborde à gauche`).toBeGreaterThanOrEqual(v.left - 0.5);
        expect(b.x + b.w / 2, `${name} : tuile ${i} déborde à droite`).toBeLessThanOrEqual(v.right + 0.5);
        expect(b.y - b.h / 2, `${name} : tuile ${i} déborde en haut`).toBeGreaterThanOrEqual(v.top - 0.5);
        expect(b.y + b.h / 2, `${name} : tuile ${i} déborde en bas`).toBeLessThanOrEqual(v.bottom + 0.5);
      }
    }
  });

  it("garde la grille des chapitres dans la zone visible", () => {
    for (const [name, w, h, dpr] of SCREENS) {
      const v = computeViewport(w, h, dpr);
      const g = levelGridZone(v);
      expect(g.cx - g.w / 2, `${name} : déborde à gauche`).toBeGreaterThanOrEqual(v.left - 0.5);
      expect(g.cx + g.w / 2, `${name} : déborde à droite`).toBeLessThanOrEqual(v.right + 0.5);
    }
  });
});
