import { describe, expect, it } from "vitest";
import { gridLayout, levelCellLayout, levelCellMinH, NAME_LINES } from "./levelGrid";
import type { GridLayout, LevelCellBox } from "./levelGrid";

describe("gridLayout", () => {
  it("remplit la largeur disponible, gouttières comprises", () => {
    const g: GridLayout = gridLayout(10, 640, 5, 10, 74);
    expect(g.cols).toBe(5);
    expect(g.rows).toBe(2);
    // 5 colonnes + 4 gouttières de 10 doivent redonner exactement 640.
    expect(g.cols * g.cellW + 10 * (g.cols - 1)).toBeCloseTo(640, 6);
    expect(g.totalW).toBeCloseTo(640, 6);
  });

  it("ne crée jamais plus de colonnes que de tuiles", () => {
    // 3 chapitres sur 5 colonnes laisseraient deux trous à droite.
    const g: GridLayout = gridLayout(3, 640, 5, 10, 74);
    expect(g.cols).toBe(3);
    expect(g.rows).toBe(1);
    expect(g.cellW).toBeGreaterThan(gridLayout(10, 640, 5, 10, 74).cellW);
  });

  it("ajoute des lignes au-delà du nombre de colonnes", () => {
    expect(gridLayout(11, 640, 5, 10, 74).rows).toBe(3);
    expect(gridLayout(5, 640, 5, 10, 74).rows).toBe(1);
    expect(gridLayout(6, 640, 5, 10, 74).rows).toBe(2);
  });

  it("étale les cellules dans la hauteur offerte", () => {
    // Défaut d'origine, mesuré sur l'écran Histoire : 10 vignettes de 74 posées
    // dans ~380 unités libres, donc 40 % de l'écran vide sous la grille.
    const sans: GridLayout = gridLayout(10, 880, 5, 10, 74);
    const avec: GridLayout = gridLayout(10, 880, 5, 10, 74, 380);
    expect(sans.cellH).toBe(74);
    expect(avec.cellH).toBeGreaterThan(sans.cellH);
    expect(avec.totalH).toBeLessThanOrEqual(380);
  });

  it("ne rend jamais une cellule plus haute que large", () => {
    // Une hauteur généreuse ne doit pas transformer une vignette de chapitre en
    // portrait : la cellule cesse alors de se lire comme une carte de niveau.
    for (const h of [200, 380, 600, 2000]) {
      const g: GridLayout = gridLayout(10, 880, 5, 10, 74, h);
      expect(g.cellH, `hauteur offerte ${h}`).toBeLessThanOrEqual(g.cellW);
    }
  });

  it("garde le plancher tactile quand la place manque", () => {
    // La hauteur offerte est une PLACE, pas une contrainte : si elle est plus
    // petite que le plancher tapable (ADR-011), c'est la grille qui déborde et
    // défile, pas la cellule qui devient introuvable au doigt.
    expect(gridLayout(10, 880, 5, 10, 74, 60).cellH).toBe(74);
  });

  it("reste valide sur les cas dégénérés", () => {
    const empty: GridLayout = gridLayout(0, 640, 5, 10, 74);
    expect(empty.cols).toBe(1);
    expect(empty.rows).toBe(0);
    expect(Number.isFinite(empty.cellW)).toBe(true);

    const one: GridLayout = gridLayout(1, 640, 5, 10, 74);
    expect(one.cols).toBe(1);
    expect(one.cellW).toBeCloseTo(640, 6);
  });
});

describe("contenu d'une vignette de chapitre", () => {
  /** Mesures relevées à l'écran sur mobile paysage (844×390). */
  const MESURE: { pad: number; numH: number; lineH: number; starSize: number; gap: number } = { pad: 22, numH: 34, lineH: 20, starSize: 16, gap: 4 };

  it("laisse au nom la place de ses deux lignes, au-dessus des étoiles", () => {
    // LE défaut. Chapitre 2, « Les Faubourgs en cendres » : le nom passait à deux
    // lignes et finissait 9,2 unités PAR-DESSUS les étoiles, parce que le texte
    // s'empilait depuis le haut pendant que les étoiles étaient épinglées en bas,
    // sans que rien ne réserve la bande entre les deux.
    //
    // La propriété vaut pour TOUTE hauteur admissible, pas pour la seule mesurée.
    const min: number = levelCellMinH(MESURE);
    for (const h of [min, min + 1, min + 20, min + 90, 400]) {
      const b: LevelCellBox = levelCellLayout({ ...MESURE, h });
      expect(b.nameMaxH, `hauteur ${h}`).toBeGreaterThanOrEqual(NAME_LINES * MESURE.lineH);
      // Formulé aussi en positions absolues : le bas du nom reste au-dessus du
      // haut de l'étoile, c'est ce que l'œil constate.
      const basDuNom: number = b.nameTop + NAME_LINES * MESURE.lineH;
      expect(basDuNom, `hauteur ${h}`).toBeLessThanOrEqual(b.starCy - MESURE.starSize / 2);
    }
  });

  it("garde tout le contenu dans les marges de la vignette", () => {
    // L'ornement d'angle du panneau du pack court sur 22 unités (ADR-030) : rien
    // ne doit s'y poser, ni en haut ni en bas.
    const h: number = levelCellMinH(MESURE);
    const b: LevelCellBox = levelCellLayout({ ...MESURE, h });
    expect(b.numTop).toBeGreaterThanOrEqual(-h / 2 + MESURE.pad);
    expect(b.starCy + MESURE.starSize / 2).toBeLessThanOrEqual(h / 2 - MESURE.pad);
  });

  it("réserve la bande d'étoiles même sans étoile à afficher", () => {
    // Sinon le nom sauterait d'une vignette à l'autre selon qu'elle est conquise
    // ou non — la grille se lit alors comme un alignement raté.
    const sansEtoile: number = levelCellMinH({ ...MESURE, starSize: 0 });
    expect(levelCellMinH(MESURE)).toBeGreaterThan(sansEtoile);
  });
});
