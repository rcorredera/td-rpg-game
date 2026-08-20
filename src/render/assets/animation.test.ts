import { describe, expect, it } from "vitest";
import { flyPose, idlePose, walkPose } from "./animation";
import type { UnitPose } from "./animation";

describe("animation procédurale des unités", () => {
  it("garde des poses bornées, quel que soit le temps", () => {
    // Une transform qui dérive ferait grossir ou enfoncer l'unité indéfiniment.
    for (const ms of [0, 137, 5_000, 1_000_000]) {
      for (const pose of [walkPose(ms, 0.3, 1, 0.5), flyPose(ms, 0.7), idlePose(ms, 0.1)]) {
        expect(Math.abs(pose.dy)).toBeLessThan(12);
        expect(Math.abs(pose.tilt)).toBeLessThan(0.3);
        expect(pose.scaleX).toBeGreaterThan(0.7);
        expect(pose.scaleX).toBeLessThan(1.4);
        expect(pose.scaleY).toBeGreaterThan(0.7);
        expect(pose.scaleY).toBeLessThan(1.4);
      }
    }
  });

  it("désynchronise les unités entre elles", () => {
    // Sans déphasage, une horde entière marcherait au pas — très artificiel.
    const a: UnitPose = walkPose(1000, 0.0, 1, 0.5);
    const b: UnitPose = walkPose(1000, 0.5, 1, 0.5);
    expect(a.dy).not.toBeCloseTo(b.dy, 3);
  });

  it("fait rebondir une unité légère plus qu'une lourde", () => {
    // `weight` porte la lecture : la brute pèse, le gobelin sautille.
    let maxLight: number = 0, maxHeavy: number = 0;
    for (let ms: number = 0; ms < 1200; ms += 10) {
      maxLight = Math.max(maxLight, Math.abs(walkPose(ms, 0, 1, 0).dy));
      maxHeavy = Math.max(maxHeavy, Math.abs(walkPose(ms, 0, 1, 1).dy));
    }
    expect(maxLight).toBeGreaterThan(maxHeavy);
  });

  it("bat des ailes plus vite qu'il ne flotte", () => {
    // Le décalage de rythme distingue un volant d'un marcheur. On compte les
    // CHANGEMENTS DE DIRECTION (extrema), pas les changements de signe : le
    // battement est bâti sur une valeur absolue, son signe ne change jamais.
    const turns = (read: (ms: number) => number) => {
      let n: number = 0, prev: number = read(10) - read(0);
      for (let ms: number = 20; ms < 2000; ms += 10) {
        const d: number = read(ms) - read(ms - 10);
        if (d !== 0 && prev !== 0 && Math.sign(d) !== Math.sign(prev)) n++;
        if (d !== 0) prev = d;
      }
      return n;
    };
    const flap: number = turns(ms => flyPose(ms, 0).scaleX);
    const float: number = turns(ms => flyPose(ms, 0).dy);
    expect(flap).toBeGreaterThan(float);
  });

  it("anime même à l'arrêt (respiration)", () => {
    // Une unité parfaitement figée casse l'illusion de vie.
    const a: UnitPose = idlePose(0, 0), b: UnitPose = idlePose(350, 0);
    expect(a.dy).not.toBeCloseTo(b.dy, 4);
  });
});
