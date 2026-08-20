import { describe, expect, it } from "vitest";
import { flyPose, idlePose, walkPose, WALK_LIFT_MAX } from "./animation";
import type { UnitPose } from "./animation";

/** Balaie un cycle de marche complet et rend les poses. */
function cycle(weight: number, phase: number = 0, speed: number = 1): UnitPose[] {
  const out: UnitPose[] = [];
  for (let ms: number = 0; ms < 1400; ms += 5) out.push(walkPose(ms, phase, speed, weight));
  return out;
}

const span = (xs: number[]): number => Math.max(...xs) - Math.min(...xs);

describe("animation procédurale des unités", () => {
  it("garde des poses bornées, quel que soit le temps", () => {
    // Une transform qui dérive ferait grossir ou enfoncer l'unité indéfiniment.
    for (const ms of [0, 137, 5_000, 1_000_000]) {
      for (const pose of [walkPose(ms, 0.3, 1, 0.5), flyPose(ms, 0.7), idlePose(ms, 0.1)]) {
        expect(Math.abs(pose.dx)).toBeLessThan(6);
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

  it("désynchronise MÊME à un demi-cycle d'écart", () => {
    // Piège : l'écrasement a deux appuis par cycle, donc une période de 0,5.
    // Deux unités déphasées d'exactement 0,5 auraient une pose identique si rien
    // dans le modèle n'était 1-périodique — le déphasage ne servirait alors à
    // rien précisément pour l'écart le plus probable.
    // Mesuré SUR TOUT LE CYCLE, pas à un instant : les deux poses coïncident
    // forcément quand elles croisent zéro en même temps, ce qui est un point
    // isolé et non une synchronisation.
    let apart: number = 0;
    for (let ms: number = 0; ms < 1400; ms += 5) {
      const a: UnitPose = walkPose(ms, 0.0, 1, 0.5);
      const b: UnitPose = walkPose(ms, 0.5, 1, 0.5);
      apart += Math.abs(a.dx - b.dx) + Math.abs(a.dy - b.dy);
    }
    expect(apart).toBeGreaterThan(100);
  });

  it("NE DÉCOLLE PAS les pieds du sol", () => {
    // Le défaut d'origine (ADR-064) : le sprite entier montait de ~4,6 px, ce qui
    // se lit comme un saut sur place et non comme une marche. Le mouvement
    // vertical doit venir de l'écrasement, pas d'une translation.
    for (const weight of [0, 0.25, 0.5, 0.75, 1]) {
      for (const pose of cycle(weight)) {
        expect(Math.abs(pose.dy), `poids ${weight}`).toBeLessThanOrEqual(WALK_LIFT_MAX);
      }
    }
  });

  it("fait porter le mouvement vertical par l'ÉCRASEMENT", () => {
    // Sans cela on retombe sur une unité rigide qui se translate : l'amplitude
    // d'écrasement doit dominer, pas être un détail sous le rebond.
    const poses: UnitPose[] = cycle(1);
    const verticalFromSquash: number = span(poses.map(p => p.scaleY)) * 60; // sur un sprite de ~60
    expect(verticalFromSquash).toBeGreaterThan(span(poses.map(p => p.dy)));
  });

  it("balance le poids d'un appui sur l'autre", () => {
    // C'est le balancement qui fait lire une démarche. Un corps qui monte et
    // descend sans jamais se déporter saute, il ne marche pas.
    const poses: UnitPose[] = cycle(0.5);
    expect(span(poses.map(p => p.dx))).toBeGreaterThan(1);
    // Et il repasse par zéro : un décalage constant serait un sprite décentré.
    expect(Math.min(...poses.map(p => Math.abs(p.dx)))).toBeLessThan(0.2);
  });

  it("écrase une unité lourde plus qu'une légère", () => {
    // `weight` porte la lecture : la brute pèse, le gobelin reste vif.
    expect(span(cycle(1).map(p => p.scaleY)))
      .toBeGreaterThan(span(cycle(0).map(p => p.scaleY)));
  });

  it("fait rouler des épaules à une unité lourde plus qu'à une légère", () => {
    expect(span(cycle(1).map(p => p.dx))).toBeGreaterThan(span(cycle(0).map(p => p.dx)));
  });

  it("laisse un reste de rebond aux LÉGÈRES seulement", () => {
    // Une brute ne sautille pas ; un diablotin, un peu.
    expect(span(cycle(0).map(p => p.dy))).toBeGreaterThan(span(cycle(1).map(p => p.dy)));
  });

  it("incline davantage une unité légère — la masse tient droit", () => {
    expect(span(cycle(0).map(p => p.tilt))).toBeGreaterThan(span(cycle(1).map(p => p.tilt)));
  });

  it("accélère le cycle quand l'unité va plus vite", () => {
    const slow: number[] = cycle(0.5, 0, 0.5).map(p => p.dx);
    const fast: number[] = cycle(0.5, 0, 2).map(p => p.dx);
    const crossings = (xs: number[]): number => {
      let n: number = 0;
      for (let i: number = 1; i < xs.length; i++) if (Math.sign(xs[i]!) !== Math.sign(xs[i - 1]!)) n++;
      return n;
    };
    expect(crossings(fast)).toBeGreaterThan(crossings(slow));
  });

  it("borne le poids hors de [0,1] au lieu de produire une pose absurde", () => {
    // Le poids vient d'un ratio de PV : une créature très au-dessus du barème
    // ne doit pas s'écraser jusqu'à disparaître.
    for (const w of [-3, 0, 1, 12]) {
      const p: UnitPose = walkPose(300, 0, 1, w);
      expect(p.scaleY).toBeGreaterThan(0.8);
      expect(p.scaleY).toBeLessThanOrEqual(1);
    }
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

  it("laisse le volant s'élever librement, lui", () => {
    // La contrainte des pieds au sol ne vaut que pour les marcheurs : un volant
    // n'a aucun appui à trahir, et un vol sans amplitude ne serait pas un vol.
    let amp: number = 0;
    for (let ms: number = 0; ms < 3000; ms += 10) amp = Math.max(amp, Math.abs(flyPose(ms, 0).dy));
    expect(amp).toBeGreaterThan(WALK_LIFT_MAX);
  });

  it("anime même à l'arrêt (respiration), sans faire flotter l'unité", () => {
    // Une unité parfaitement figée casse l'illusion de vie — mais une unité qui
    // monte et descend sur place flotte, exactement comme le marcheur d'avant.
    const a: UnitPose = idlePose(0, 0), b: UnitPose = idlePose(350, 0);
    expect(a.scaleY).not.toBeCloseTo(b.scaleY, 4);
    expect(a.dy).toBe(0);
    expect(b.dy).toBe(0);
  });
});
