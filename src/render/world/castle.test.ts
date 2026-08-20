import { describe, expect, it } from "vitest";
import { BATTLEFIELD } from "../../core/types";
import { castleAnchor, castleBarBox, CASTLE_HALF } from "./castle";
import type { CastleBarBox, Point } from "./castle";

// ============================================================
// Défaut d'origine : la jauge de PV du Bastion était calée sur `end.x - 62`
// pendant que le sprite l'était sur `min(end.x, W - 62)`. Les deux formules
// coïncident quand le chemin finit contre le bord droit — le seul cas qu'on
// regardait — et divergent de 26 unités partout ailleurs. La jauge est donc
// restée visiblement décentrée sur la plupart des chapitres.
//
// La règle testée ici est celle qui rend le défaut impossible : la jauge dérive
// du MÊME ancrage que le sprite. Rien ne recalcule cet ancrage ailleurs.
// ============================================================

/** Fins de chemin réelles : contre le bord droit, et bien à l'intérieur. */
const FINS: Point[] = [
  { x: 980, y: 560 },
  { x: 960, y: 270 },
  { x: 820, y: 300 },
  { x: 640, y: 180 },
  { x: 900, y: 500 },
];

describe("ancrage du Bastion", () => {
  it("centre la jauge sur le sprite, quelle que soit la fin du chemin", () => {
    for (const end of FINS) {
      const a: Point = castleAnchor(end);
      const b: CastleBarBox = castleBarBox(end);
      expect(b.x + b.w / 2, `fin (${end.x},${end.y})`).toBeCloseTo(a.x, 6);
    }
  });

  it("pose la jauge AU-DESSUS du sprite, sans le chevaucher", () => {
    for (const end of FINS) {
      const a: Point = castleAnchor(end);
      const b: CastleBarBox = castleBarBox(end);
      expect(b.y + b.h, `fin (${end.x},${end.y})`).toBeLessThanOrEqual(a.y - CASTLE_HALF);
    }
  });

  it("ramène le sprite entier dans le champ de bataille", () => {
    // Les chemins finissent au bord droit : un Bastion centré sur le waypoint
    // final déborderait du cadre.
    for (const end of FINS) {
      const a: Point = castleAnchor(end);
      expect(a.x + CASTLE_HALF, `fin (${end.x},${end.y})`).toBeLessThanOrEqual(BATTLEFIELD.w);
      expect(a.y + CASTLE_HALF).toBeLessThanOrEqual(BATTLEFIELD.h);
    }
  });

  it("suit la fin du chemin tant qu'elle laisse la place", () => {
    // Sans quoi le Bastion se planterait au même endroit sur toutes les cartes.
    expect(castleAnchor({ x: 640, y: 180 }).x).toBe(640);
    expect(castleAnchor({ x: 820, y: 300 }).x).toBe(820);
  });
});
