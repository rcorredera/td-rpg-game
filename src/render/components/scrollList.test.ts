import { describe, expect, it } from "vitest";
import { clampScroll, scrollBar, scrollHints } from "./scrollList";

describe("clampScroll", () => {
  it("ne défile pas quand le contenu tient dans la fenêtre", () => {
    // Cas piégeux : sans borne haute à 0, une liste courte pourrait « flotter »
    // en dehors de sa fenêtre au premier glissement.
    expect(clampScroll(0, 200, 400)).toBe(0);
    expect(clampScroll(-50, 200, 400)).toBe(0);
    expect(clampScroll(80, 200, 400)).toBe(0);
  });

  it("borne le défilement au contenu réellement dépassant", () => {
    // 1000 de contenu dans 400 de fenêtre : 600 de course utile.
    expect(clampScroll(0, 1000, 400)).toBe(0);
    expect(clampScroll(-300, 1000, 400)).toBe(-300);
    expect(clampScroll(-600, 1000, 400)).toBe(-600);
    expect(clampScroll(-999, 1000, 400)).toBe(-600); // pas de vide sous la liste
    expect(clampScroll(120, 1000, 400)).toBe(0);     // pas de vide au-dessus
  });

  it("reste cohérent quand le contenu rétrécit sous la position courante", () => {
    // Bestiaire filtré, onglet changé : la position doit remonter d'elle-même
    // au lieu de laisser une fenêtre vide.
    expect(clampScroll(-500, 450, 400)).toBe(-50);
    expect(clampScroll(-500, 400, 400)).toBe(0);
  });
});

describe("indicateur de défilement", () => {
  /** Fenêtre du campement : elle occupe TOUTE la largeur visible (v.left/v.width). */
  const FENETRE = { x: -104, y: 120, w: 1168, h: 300 };

  it("dessine la gouttière DANS la fenêtre", () => {
    // LE défaut. La barre se posait à `x + w + 4` : sur une fenêtre qui occupe
    // déjà toute la largeur de l'écran, cela tombe 4 unités hors du viewport.
    // Résultat : aucun défilement n'était signalé nulle part dans le jeu, et la
    // liste du Bestiaire semblait simplement coupée.
    for (const contentH of [301, 400, 1200, 9000]) {
      for (const offset of [0, -50, -(contentH - FENETRE.h), -99999]) {
        const g = scrollBar(FENETRE, contentH, offset);
        expect(g, `contenu ${contentH}`).not.toBeNull();
        for (const [nom, r] of Object.entries(g!)) {
          expect(r.x, `${nom} : bord gauche`).toBeGreaterThanOrEqual(FENETRE.x);
          expect(r.x + r.w, `${nom} : bord droit`).toBeLessThanOrEqual(FENETRE.x + FENETRE.w);
          expect(r.y, `${nom} : bord haut`).toBeGreaterThanOrEqual(FENETRE.y);
          expect(r.y + r.h, `${nom} : bord bas`).toBeLessThanOrEqual(FENETRE.y + FENETRE.h);
        }
        expect(g!.thumb.h).toBeLessThanOrEqual(g!.track.h);
      }
    }
  });

  it("ne dessine rien quand tout tient", () => {
    expect(scrollBar(FENETRE, 300, 0)).toBeNull();
    expect(scrollBar(FENETRE, 120, 0)).toBeNull();
  });

  it("descend le curseur à mesure qu'on descend dans le contenu", () => {
    const haut = scrollBar(FENETRE, 1200, 0)!;
    const milieu = scrollBar(FENETRE, 1200, -450)!;
    const bas = scrollBar(FENETRE, 1200, -900)!;
    expect(milieu.thumb.y).toBeGreaterThan(haut.thumb.y);
    expect(bas.thumb.y).toBeGreaterThan(milieu.thumb.y);
    // En butée basse, le curseur touche exactement le bas de la gouttière.
    expect(bas.thumb.y + bas.thumb.h).toBeCloseTo(bas.track.y + bas.track.h, 6);
  });

  it("signale le sens dans lequel il reste à voir", () => {
    expect(scrollHints(0, 300, 300)).toEqual({ up: false, down: false });
    expect(scrollHints(0, 1200, 300)).toEqual({ up: false, down: true });
    expect(scrollHints(-450, 1200, 300)).toEqual({ up: true, down: true });
    expect(scrollHints(-900, 1200, 300)).toEqual({ up: true, down: false });
    // Débordement : la position est bornée avant d'être lue, sinon on annoncerait
    // du contenu sous une liste déjà en butée.
    expect(scrollHints(-99999, 1200, 300)).toEqual({ up: true, down: false });
    expect(scrollHints(9999, 1200, 300)).toEqual({ up: false, down: true });
  });
});
