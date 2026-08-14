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
    // L'icône est PROPORTIONNELLE : doubler la hauteur double l'emblème tant
    // qu'aucun plafond ne mord. Un simple « ça grandit » ne suffit pas à attraper
    // le défaut d'origine — un plafond en dur à 96 grandit aussi, il s'arrête
    // juste trop tôt.
    const bas = composeTile({ ...SECONDAIRE, w: 900, h: 150 }).glyph;
    const haut = composeTile({ ...SECONDAIRE, w: 900, h: 300 }).glyph;
    expect(haut / bas).toBeGreaterThan(1.8);
    // Dès qu'il y a la place, l'icône va JUSQU'À sa résolution native…
    expect(composeTile({ ...SECONDAIRE, w: 600, h: 500 }).glyph).toBe(128);
    // …et jamais au-delà, sous peine de flou.
    expect(composeTile({ ...SECONDAIRE, h: 900, w: 900 }).glyph).toBeLessThanOrEqual(128);
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

  it("respecte la marge imposée par l'habillage", () => {
    // La marge proportionnelle vaut 15 sur une tuile de 167, alors que la volute
    // d'angle du panneau ouvragé en occupe 22 : le contenu se posait dessus, et
    // le ruban de titre mordait sur le cadre. La marge de l'habillage est un
    // PLANCHER, pas une suggestion.
    for (const g of GABARITS) {
      for (const minPad of [0, 10, 22, 30]) {
        const b = composeTile({ ...g, minPad });
        expect(b.pad, `${g.w}×${g.h}, plancher ${minPad}`).toBeGreaterThanOrEqual(minPad);
        // …et le contenu reste dedans.
        expect(b.iconCy - b.glyph / 2).toBeGreaterThanOrEqual(-g.h / 2 + minPad - 0.001);
      }
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

  it("occupe sa zone utile sur toute la gamme de tuiles du jeu", () => {
    // La garantie chiffrée qui remplace le contrôle à l'œil. Avant correction :
    // 43 % sur la tuile principale et 57 % sur les secondaires, parce que le
    // contenu avait une taille fixe. Le seuil est calé bien au-dessus de ces
    // deux cas réels — un seuil qui les laisserait passer ne garantirait rien.
    //
    // Il ne porte que sur les gabarits que le jeu produit réellement (≤ 360 de
    // haut) : au-delà, l'emblème plafonne par proportion, et le reste est de
    // l'air voulu autour d'un cadre ouvragé, pas du vide subi.
    // Couples (largeur, hauteur) RÉELLEMENT produits par `hubLayout`, relevés en
    // jeu à 960×540 et à 844×390 — et non un produit cartésien : une tuile
    // secondaire de 242 de large ne fait jamais 350 de haut, la juger sur ce
    // gabarit reviendrait à tester une mise en page qui n'existe pas.
    const REELS = [
      { ...SECONDAIRE, w: 242, h: 167 },
      { ...SECONDAIRE, w: 303, h: 167 },
      { ...PRINCIPALE, w: 363, h: 350 },
      { ...PRINCIPALE, w: 450, h: 350 },
    ];
    for (const o of REELS) {
      const b = composeTile(o);
      const bas = o.footerH > 0 ? b.footerTop + o.footerH : basDuBloc(o);
      const part = (bas - (b.iconCy - b.glyph / 2)) / (o.h - 2 * b.pad);
      expect(part, `part occupée, ${o.w}×${o.h}`).toBeGreaterThan(0.63);
    }
  });
});
