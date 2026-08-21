import { describe, expect, it } from "vitest";
import { type Facing, type FacingCell, facingCell, facingFrom, FACING_EPSILON, frameIndex } from "./facing";

describe("facingFrom", () => {
  it("suit l'horizontale", () => {
    expect(facingFrom(5, 0, "down", true)).toBe("right");
    expect(facingFrom(-5, 0, "down", true)).toBe("left");
  });

  it("suit la VERTICALE quand la planche la porte", () => {
    // Le défaut corrigé (ADR-067) : le rendu ne regardait que l'horizontale, et
    // une créature de profil descendait vers le Bastion en marchant de côté.
    expect(facingFrom(0, 5, "right", true)).toBe("down");
    expect(facingFrom(0, -5, "right", true)).toBe("up");
  });

  it("garde l'orientation en verticale si la planche N'A PAS de rangée pour ça", () => {
    // Demander une rangée absente afficherait une case vide. Garder le profil
    // sous lequel la créature est arrivée est le moins faux des deux.
    expect(facingFrom(0, 5, "right", false)).toBe("right");
    expect(facingFrom(0, -5, "left", false)).toBe("left");
  });

  it("laisse l'axe DOMINANT trancher en diagonale", () => {
    // Comparer chaque axe à son propre seuil ferait osciller la direction à
    // chaque frame sur un trajet à 45°.
    expect(facingFrom(10, 3, "up", true)).toBe("right");
    expect(facingFrom(3, 10, "right", true)).toBe("down");
  });

  it("ne change RIEN sous le seuil : une unité bloquée ne pivote pas", () => {
    for (const prev of ["up", "down", "left", "right"] as Facing[]) {
      expect(facingFrom(0, 0, prev, true)).toBe(prev);
      expect(facingFrom(FACING_EPSILON * 0.5, 0, prev, true)).toBe(prev);
      expect(facingFrom(0, FACING_EPSILON * 0.5, prev, true)).toBe(prev);
    }
  });

  it("est stable : réappliquer le même déplacement ne fait pas osciller", () => {
    let f: Facing = "down";
    for (let i: number = 0; i < 10; i++) f = facingFrom(4, 4, f, true);
    expect(f).toBe("right");
  });
});

describe("facingCell — planche complète (face, profil, dos)", () => {
  const cell = (f: Facing): FacingCell => facingCell(f, 3);

  it("place chaque direction sur sa rangée", () => {
    expect(cell("down")).toEqual({ row: 0, flip: false });
    expect(cell("right")).toEqual({ row: 1, flip: false });
    expect(cell("up")).toEqual({ row: 2, flip: false });
  });

  it("obtient la gauche par MIROIR du profil, sans rangée dédiée", () => {
    // Gagner une direction gratuitement vaut mieux qu'une rangée de plus, qui
    // prendrait des pixels aux autres poses de la même image.
    expect(cell("left")).toEqual({ row: 1, flip: true });
  });
});

describe("facingCell — planche à une seule rangée", () => {
  it("se rabat sur ce qu'elle a", () => {
    // C'est ce qui laisse coexister les planches à un seul profil (l'orc de la
    // première livraison) et les planches complètes.
    for (const f of ["down", "up", "right"] as Facing[]) {
      expect(facingCell(f, 1).row).toBe(0);
    }
    expect(facingCell("left", 1)).toEqual({ row: 0, flip: true });
  });

  it("ne demande JAMAIS une rangée hors planche", () => {
    // Une case hors planche s'affiche vide, sans lever d'erreur.
    for (const dirs of [1, 2, 3, 4]) {
      for (const f of ["down", "up", "left", "right"] as Facing[]) {
        const c: FacingCell = facingCell(f, dirs);
        expect(c.row).toBeGreaterThanOrEqual(0);
        expect(c.row).toBeLessThan(dirs);
      }
    }
  });

  it("borne un compte de directions absurde plutôt que de calculer faux", () => {
    expect(facingCell("right", 0).row).toBe(0);
    expect(facingCell("right", -3).row).toBe(0);
  });
});

describe("frameIndex", () => {
  it("range direction-major : une multiplication suffit au rendu", () => {
    expect(frameIndex(0, 0, 2)).toBe(0);
    expect(frameIndex(0, 1, 2)).toBe(1);
    expect(frameIndex(1, 0, 2)).toBe(2);
    expect(frameIndex(2, 1, 2)).toBe(5);
  });

  it("couvre exactement la planche, sans trou ni doublon", () => {
    const seen: Set<number> = new Set<number>();
    for (let row: number = 0; row < 3; row++) {
      for (let pose: number = 0; pose < 2; pose++) seen.add(frameIndex(row, pose, 2));
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
