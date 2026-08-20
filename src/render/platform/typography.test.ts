import { describe, expect, it } from "vitest";
import { computeViewport, scaleFont, TEXT_MIN_CSS } from "./viewport";
import type { Viewport } from "./viewport";

/** `scaleFont` lit le viewport courant (module-global). Ces tests vérifient la
 *  forme de la courbe indépendamment de l'écran, plus les invariants métier. */
describe("échelle typographique", () => {
  it("ne rétrécit jamais un texte", () => {
    for (const size of [10, 11, 12, 15, 19, 26, 42]) {
      expect(scaleFont(size)).toBeGreaterThanOrEqual(size);
    }
  });

  it("préserve la hiérarchie : un titre reste plus grand que son sous-titre", () => {
    // Le piège corrigé : un simple plancher ramenait 19 et 12 à la même valeur,
    // aplatissant toute la hiérarchie sur mobile.
    expect(scaleFont(19)).toBeGreaterThan(scaleFont(12));
    expect(scaleFont(42)).toBeGreaterThan(scaleFont(19));
    expect(scaleFont(26)).toBeGreaterThan(scaleFont(17));
  });

  it("compresse les grandes tailles au lieu de les multiplier à l'identique", () => {
    // Un titre ne doit pas gonfler proportionnellement au corps de texte, sinon
    // il devient démesuré sur petit écran.
    const bodyGain: number = scaleFont(12) / 12;
    const titleGain: number = scaleFont(42) / 42;
    expect(titleGain).toBeLessThanOrEqual(bodyGain);
  });

  it("reste défini sur des entrées absurdes", () => {
    expect(Number.isFinite(scaleFont(0))).toBe(true);
    expect(scaleFont(0)).toBeGreaterThan(0);
    expect(Number.isFinite(scaleFont(-5))).toBe(true);
  });

  it("le plancher visé correspond bien à TEXT_MIN_CSS pixels réels", () => {
    // Vérifie la conversion elle-même : sur un mobile paysage, le corps de texte
    // doit atteindre le plancher de lisibilité une fois converti en pixels écran.
    const v: Viewport = computeViewport(780, 360, 2);
    const minLogical: number = TEXT_MIN_CSS / v.cssPerLogical;
    expect(minLogical * v.cssPerLogical).toBeCloseTo(TEXT_MIN_CSS, 6);
    // Et sur un grand écran, ce plancher est sous les tailles courantes.
    const d: Viewport = computeViewport(2004, 1030, 1);
    expect(TEXT_MIN_CSS / d.cssPerLogical).toBeLessThan(12);
  });
});
