import { describe, expect, it } from "vitest";
import { GORGE_PAD_RATIO, progressFillBox } from "./progressFill";
import type { ProgressFillBox } from "./progressFill";

// ============================================================
// Défaut d'origine, rapporté sur la tuile « Histoire » du Campement (jauge
// habillée `bar-big-base.png`) : le remplissage doré débordait de la gorge du
// cerclage en pied de jauge au lieu de l'épouser, avec un vide visible en
// haut. Cause : la marge verticale valait 22 % de la hauteur au jugé, quand la
// gorge RÉELLEMENT peinte sur la planche (mesurée au pixel, deux méthodes
// convergentes — bord du liseré sombre, divergence de couleur au corps —
// relevées sur onze colonnes de la pièce du milieu) en occupe 31,4 % de
// chaque côté. Sur la jauge en jeu (h = 51, mesuré), l'écart valait 5 unités.
// ============================================================

/** Hauteur RÉELLE de `bar-big-base.png` composé, relevée en jeu. */
const H_JAUGE: number = 51;
const SAFE: { left: number; right: number } = { left: 18, right: 18 };

describe("rectangle de remplissage de la jauge", () => {
  it("reprend la marge mesurée sur la planche — pas l'ancienne valeur au jugé", () => {
    // Épingle la régression : si `GORGE_PAD_RATIO` repasse à 0.22 (l'ancienne
    // valeur), ce test échoue. Preuve par mutation : 0.22 donne padY = 11 et
    // ih = 29 au lieu de 16 et 19.
    expect(GORGE_PAD_RATIO).toBeCloseTo(0.314, 3);
    const box: ProgressFillBox = progressFillBox(319, H_JAUGE, 1, SAFE);
    expect(box.iy).toBe(16);
    expect(box.ih).toBe(H_JAUGE - 2 * 16);
  });

  it("reste TOUJOURS dans la gorge, quelle que soit la hauteur de jauge", () => {
    for (const h of [19, 32, 40, 51, 64, 90]) {
      const box: ProgressFillBox = progressFillBox(300, h, 0.6, SAFE);
      expect(box.iy, `haut, h=${h}`).toBeGreaterThanOrEqual(0);
      expect(box.iy + box.ih, `bas, h=${h}`).toBeLessThanOrEqual(h);
    }
  });

  it("le remplissage suit le pourcentage, borné entre les marges sûres", () => {
    const w: number = 319;
    const zero: ProgressFillBox = progressFillBox(w, H_JAUGE, 0, SAFE);
    const moitie: ProgressFillBox = progressFillBox(w, H_JAUGE, 0.5, SAFE);
    const plein: ProgressFillBox = progressFillBox(w, H_JAUGE, 1, SAFE);
    expect(zero.iw).toBe(0);
    expect(plein.iw).toBeGreaterThan(moitie.iw);
    expect(moitie.iw).toBeGreaterThan(zero.iw);
    // Jamais au-delà de la largeur utile (hors marges sûres des embouts).
    expect(plein.iw).toBeLessThanOrEqual(w - SAFE.left - SAFE.right + 0.001);
  });

  it("borne un pourcentage hors [0, 1]", () => {
    const w: number = 319;
    expect(progressFillBox(w, H_JAUGE, -0.4, SAFE).iw).toBe(0);
    expect(progressFillBox(w, H_JAUGE, 1.4, SAFE).iw)
      .toBe(progressFillBox(w, H_JAUGE, 1, SAFE).iw);
  });

  it("part du bord gauche utile, en retrait des embouts", () => {
    const w: number = 319;
    const box: ProgressFillBox = progressFillBox(w, H_JAUGE, 0.5, SAFE);
    expect(box.ix).toBe(-w / 2 + SAFE.left);
  });
});
