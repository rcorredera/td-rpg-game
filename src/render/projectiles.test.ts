import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { projectileFor, projectilePoint } from "./projectiles";
import type { ProjectileKind, ProjectileStyle } from "./projectiles";
import type { Vec2 } from "../core/types";

describe("registre de projectiles", () => {
  it("donne un style à chaque tour de CONTENT", () => {
    for (const defId of Object.keys(CONTENT.towers)) {
      const s: ProjectileStyle = projectileFor(defId);
      expect(s.flightMs).toBeGreaterThan(0);
      expect(s.size).toBeGreaterThan(0);
    }
  });

  it("différencie visuellement les tours entre elles", () => {
    // L'intérêt du registre : sans styles distincts, toutes les tours tireraient
    // le même trait et le joueur ne saurait pas ce qui frappe.
    const kinds: ProjectileKind[] = Object.keys(CONTENT.towers).map(id => projectileFor(id).kind);
    expect(new Set(kinds).size).toBeGreaterThan(1);
    // La catapulte est la seule à tirer en cloche.
    expect(projectileFor("tower_catapult").arc).toBeGreaterThan(0);
    expect(projectileFor("tower_archer").arc).toBe(0);
  });

  it("retombe sur un style de repli pour une tour inconnue", () => {
    // Une tour ajoutée sans projectile doit rester visible, pas disparaître.
    expect(projectileFor("tour_inexistante").flightMs).toBeGreaterThan(0);
  });
});

describe("projectilePoint", () => {
  const A: Vec2 = { x: 0, y: 100 }, B: Vec2 = { x: 200, y: 100 };

  it("part de l'origine et atterrit exactement sur la cible", () => {
    // Vrai même avec une cloche : sinon un rocher tomberait à côté de sa victime.
    for (const arc of [0, 60]) {
      expect(projectilePoint(A, B, 0, arc)).toEqual(A);
      const end: Vec2 = projectilePoint(A, B, 1, arc);
      expect(end.x).toBeCloseTo(B.x, 6);
      expect(end.y).toBeCloseTo(B.y, 6);
    }
  });

  it("s'élève au milieu du vol quand il y a une cloche", () => {
    const mid: Vec2 = projectilePoint(A, B, 0.5, 60);
    expect(mid.y).toBeCloseTo(100 - 60, 6); // y décroît vers le haut
    expect(mid.x).toBeCloseTo(100, 6);
  });

  it("reste tendu sans cloche", () => {
    expect(projectilePoint(A, B, 0.5, 0).y).toBeCloseTo(100, 6);
  });

  it("borne t hors de [0,1] au lieu de dépasser la cible", () => {
    expect(projectilePoint(A, B, -3, 40)).toEqual(A);
    const over: Vec2 = projectilePoint(A, B, 9, 40);
    expect(over.x).toBeCloseTo(B.x, 6);
  });
});
