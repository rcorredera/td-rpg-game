import { describe, expect, it } from "vitest";
import { composeTile, type TileContentInput } from "./tileContent";

// ============================================================
// Défaut d'origine, mesuré en jeu sur la tuile « Histoire » du Campement :
// 150 unités de contenu dans une tuile de 350, soit 57 % de vide, et une jauge
// d'avancement ancrée 82 unités sous le texte. Cause : le contenu avait une
// taille FIXE (icône plafonnée à 96) alors que la boîte suit l'écran.
//
// Les propriétés ci-dessous valent pour toute la famille des tuiles — Campement,
// grille de chapitres, et toute tuile future — pas pour le seul cas observé.
// ============================================================

/** Gabarits réels du jeu, mesurés à l'écran en 960×540. */
const PRINCIPALE: TileContentInput = { w: 363, h: 350, titleH: 29, subH: 16, maxGlyph: 128, footerH: 6 };
const SECONDAIRE: TileContentInput = { w: 242, h: 167, titleH: 19, subH: 15, maxGlyph: 128, footerH: 0 };
const GABARITS = [PRINCIPALE, SECONDAIRE] as const;

/** Bas du dernier élément posé (sous-titre, ou titre s'il n'y en a pas). */
function basDuBloc(o: TileContentInput): number {
  const b = composeTile(o);
  return o.subH > 0 ? b.subTop + o.subH : b.titleTop + o.titleH;
}

describe("composition du contenu d'une tuile", () => {
  it("ne laisse jamais rien dépasser de la tuile", () => {
    for (const g of GABARITS) {
      for (const h of [120, 167, 220, 280, 350, 480]) {
        const o = { ...g, h };
        const b = composeTile(o);
        expect(b.iconCy - b.glyph / 2, `haut de l'icône, h=${h}`).toBeGreaterThanOrEqual(-h / 2);
        const bas = g.footerH > 0 ? b.footerTop + g.footerH : basDuBloc(o);
        expect(bas, `bas du contenu, h=${h}`).toBeLessThanOrEqual(h / 2);
      }
    }
  });

  it("agrandit l'icône avec la tuile, jusqu'à la résolution native", () => {
    // LE défaut d'origine : un plafond de 96 en dur, donc une tuile deux fois
    // plus haute n'affichait pas une icône plus grande — elle affichait du vide.
    const petite = composeTile({ ...SECONDAIRE, h: 120 }).glyph;
    const moyenne = composeTile({ ...SECONDAIRE, h: 167 }).glyph;
    const grande = composeTile({ ...SECONDAIRE, h: 240 }).glyph;
    expect(moyenne).toBeGreaterThan(petite);
    expect(grande).toBeGreaterThan(moyenne);
    // Dès qu'il y a la place, l'icône va JUSQU'À sa résolution native — c'est ce
    // qu'un plafond en dur (96) interdisait, et un simple « ça grandit » ne l'aurait
    // pas attrapé : 96 grandit aussi, il s'arrête juste trop tôt.
    expect(composeTile({ ...SECONDAIRE, h: 300 }).glyph).toBe(128);
    expect(composeTile(PRINCIPALE).glyph).toBe(128);
    // …et jamais au-delà, sous peine de flou.
    expect(composeTile({ ...SECONDAIRE, h: 600, w: 600 }).glyph).toBeLessThanOrEqual(128);
  });

  it("garde la jauge de pied au contact du bloc", () => {
    // Elle était ancrée en bas de la tuile pendant que le bloc restait centré :
    // plus la tuile grandissait, plus la jauge s'en éloignait (82 unités mesurées).
    for (const h of [160, 240, 350, 480]) {
      const o = { ...PRINCIPALE, h };
      const b = composeTile(o);
      const ecart = b.footerTop - basDuBloc(o);
      expect(ecart, `écart texte→jauge, h=${h}`).toBeGreaterThanOrEqual(0);
      expect(ecart, `écart texte→jauge, h=${h}`).toBeLessThanOrEqual(2 * b.gap);
    }
  });

  it("centre le bloc dans sa zone utile", () => {
    for (const g of GABARITS) {
      const b = composeTile(g);
      const bas = g.footerH > 0 ? b.footerTop + g.footerH : basDuBloc(g);
      const videHaut = (b.iconCy - b.glyph / 2) - (-g.h / 2 + b.pad);
      const videBas = (g.h / 2 - b.pad) - bas;
      expect(Math.abs(videHaut - videBas), "vide haut ≠ vide bas").toBeLessThanOrEqual(0.5);
    }
  });

  it("remplit la tuile dès que la résolution de l'icône le permet", () => {
    // La garantie chiffrée qui remplace le contrôle à l'œil : sur une tuile où
    // l'icône n'est pas bridée par sa rastérisation, le contenu occupe toute sa
    // zone utile. Mesuré avant correction sur la tuile secondaire : 57 % occupés.
    const b = composeTile(SECONDAIRE);
    const zoneH = (SECONDAIRE.h / 2 - b.pad) - (-SECONDAIRE.h / 2 + b.pad);
    const bloc = basDuBloc(SECONDAIRE) - (b.iconCy - b.glyph / 2);
    expect(bloc / zoneH, "part de la zone utile réellement occupée").toBeGreaterThan(0.95);
  });
});
