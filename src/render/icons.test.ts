import { describe, expect, it } from "vitest";
import { ICON } from "./icons";

describe("registre d'icônes UI", () => {
  it("associe une texture distincte à chaque rôle", () => {
    const keys = Object.values(ICON);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^ui_[a-z]+$/);
  });

  it("couvre les rôles attendus par les écrans", () => {
    // Garde-fou : un rôle retiré du registre casse ici plutôt qu'à l'écran, où
    // l'icône manquante rendrait juste une texture verte de remplacement.
    for (const role of ["story", "rift", "armory", "bestiary", "chronicles", "locked", "castle"]) {
      expect(ICON).toHaveProperty(role);
    }
  });
});
