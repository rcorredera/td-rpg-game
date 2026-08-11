import { describe, expect, it } from "vitest";
import { clampScroll } from "./scrollList";

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
