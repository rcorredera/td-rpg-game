// Garantit que le registre SFX couvre tout le contenu : ajouter une tour sans
// son tir casse ce test (même discipline que sprites.test.ts, ADR-005/037).
import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { SFX, shotSfx, type SfxKey } from "./audio";

describe("registre SFX (audio.ts)", () => {
  it("mappe chaque tour de CONTENT vers un tir SFX valide", () => {
    for (const defId of Object.keys(CONTENT.towers)) {
      const key: SfxKey = shotSfx(defId);
      expect(SFX).toHaveProperty(key);
    }
  });

  it("lève sur une tour inconnue (détecte un tir oublié)", () => {
    expect(() => shotSfx("inconnu")).toThrow();
  });

  it("associe une clé de son distincte à chaque rôle", () => {
    const keys: string[] = Object.values(SFX);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^sfx_[a-z]+(?:_[a-z]+)*$/);
  });
});
