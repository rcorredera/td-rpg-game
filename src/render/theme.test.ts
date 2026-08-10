// Garde-fou de format pour les tokens partagés : un token mal formé casse
// silencieusement le rendu (couleur CSS invalide, nombre hors 0xRRGGBB).
import { describe, expect, it } from "vitest";
import { ACCENT, TEXT } from "./theme";

describe("tokens de thème (theme.ts)", () => {
  it("TEXT ne contient que des couleurs CSS hexadécimales valides", () => {
    for (const [key, value] of Object.entries(TEXT)) {
      expect(value, key).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("ACCENT ne contient que des entiers 0xRRGGBB valides", () => {
    for (const [key, value] of Object.entries(ACCENT)) {
      expect(Number.isInteger(value), key).toBe(true);
      expect(value, key).toBeGreaterThanOrEqual(0);
      expect(value, key).toBeLessThanOrEqual(0xffffff);
    }
  });

  it("aucune valeur en double au sein d'un même groupe (tokens redondants)", () => {
    for (const group of [TEXT, ACCENT]) {
      const values = Object.values(group);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});
