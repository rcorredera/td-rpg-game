import { describe, expect, it } from "vitest";
import {
  FOOT_R, type Joints, POSES, project, type Projected, type Vec3, VIEWS, walkPose,
} from "./pose";

/** Toutes les poses du cycle, dans l'ordre. */
const CYCLE: Joints[] = Array.from({ length: POSES }, (_, i) => walkPose(i));

describe("walkPose — l'alternance des appuis", () => {
  it("INVERSE les jambes entre les deux poses de contact", () => {
    // Le défaut qui a coulé cinq planches générées : la même jambe devant d'un
    // bout à l'autre. Ici il est structurellement impossible — le côté droit est
    // le côté gauche décalé d'un demi-cycle.
    const a: Joints = CYCLE[0]!;
    const b: Joints = CYCLE[2]!;
    expect(a.knee[0]!.z).toBeCloseTo(b.knee[1]!.z, 5);
    expect(a.knee[1]!.z).toBeCloseTo(b.knee[0]!.z, 5);
  });

  it("porte une jambe DEVANT et l'autre DERRIÈRE au contact", () => {
    const c: Joints = CYCLE[0]!;
    expect(c.knee[0]!.z).toBeGreaterThan(10);
    expect(c.knee[1]!.z).toBeLessThan(-5);
  });

  it("rapproche les jambes au passage", () => {
    const contact: number = Math.abs(CYCLE[0]!.knee[0]!.z - CYCLE[0]!.knee[1]!.z);
    const passage: number = Math.abs(CYCLE[3]!.knee[0]!.z - CYCLE[3]!.knee[1]!.z);
    expect(passage).toBeLessThan(contact / 2);
  });
});

describe("walkPose — le balancier des bras", () => {
  it("porte en avant le bras OPPOSÉ à la jambe avancée", () => {
    // Sans exception dans tout le cycle : c'est la règle que le prompt n'arrivait
    // pas à faire tenir au générateur.
    for (const p of CYCLE) {
      const legLeadsLeft: boolean = p.knee[0]!.z > p.knee[1]!.z;
      const armLeadsRight: boolean = p.hand[1]!.z > p.hand[0]!.z;
      expect(armLeadsRight).toBe(legLeadsLeft);
    }
  });

  it("ne laisse AUCUN bras immobile sur le cycle", () => {
    for (const side of [0, 1] as const) {
      const zs: number[] = CYCLE.map(p => p.hand[side]!.z);
      expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(20);
    }
  });

  it("écarte CHAQUE main du centre, à CHAQUE pose — jamais les deux ensemble à la verticale", () => {
    // Le défaut réel, repéré par le PO sur le gabarit rendu : cette même mesure,
    // avant correction, valait 21,7 aux poses de « passage » mais seulement 3 à
    // 6 aux poses 1 et 3 — l'avant-bras (angle − coude) s'y annulait presque, et
    // les deux bras retombaient à la verticale, confondus avec le torse. Un test
    // sur l'ÉTENDUE du cycle (ci-dessus) ne le voyait pas : elle reste large
    // grâce aux seules poses de contact.
    for (const p of CYCLE) {
      for (const side of [0, 1] as const) {
        expect(Math.abs(p.hand[side]!.z)).toBeGreaterThan(15);
      }
    }
  });
});

describe("walkPose — l'appui au sol", () => {
  it("pose le dessous du pied le plus bas SUR le sol, à chaque pose", () => {
    // Ancrage par les pieds (ADR-064) : un pied qui flotte ou qui s'enfonce se
    // verrait comme un tressautement, et la ligne de sol serait fausse.
    for (const p of CYCLE) {
      const lowest: number = Math.min(p.foot[0]!.y, p.foot[1]!.y);
      expect(lowest).toBeCloseTo(FOOT_R, 5);
    }
  });

  it("DÉCOLLE un pied au passage, jamais aux contacts", () => {
    const gap = (p: Joints): number => Math.abs(p.foot[0]!.y - p.foot[1]!.y);
    expect(gap(CYCLE[1]!)).toBeGreaterThan(gap(CYCLE[0]!));
    expect(gap(CYCLE[3]!)).toBeGreaterThan(gap(CYCLE[2]!));
  });

  it("garde la tête à peu près à la même hauteur", () => {
    // Le bassin descend mécaniquement au contact, jambes écartées. L'écart doit
    // rester assez faible pour ne pas se lire comme un sautillement.
    const ys: number[] = CYCLE.map(p => p.head.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(Math.max(...ys) * 0.08);
  });
});

describe("project — les trois vues montrent le même mouvement", () => {
  it("montre la marche en LARGEUR de profil, en PROFONDEUR de face", () => {
    const p: Joints = CYCLE[0]!;
    const side: Projected = project(p.knee[0]!, "side");
    const front: Projected = project(p.knee[0]!, "front");
    expect(Math.abs(side.x)).toBeGreaterThan(10);   // la jambe avance à l'écran
    expect(Math.abs(front.x)).toBeLessThan(35);     // de face, elle reste sous la hanche
    expect(front.depth).toBeGreaterThan(10);        // mais elle vient vers nous
  });

  it("INVERSE la profondeur entre face et dos", () => {
    // De face la créature vient vers le spectateur, de dos elle s'en éloigne :
    // le membre avancé est proche dans un cas, lointain dans l'autre. C'est ce
    // qui fait que la même pose s'occulte correctement dans les deux rangées.
    const knee: Vec3 = CYCLE[0]!.knee[0]!;
    expect(project(knee, "front").depth).toBeCloseTo(-project(knee, "back").depth, 5);
  });

  it("garde la même hauteur dans les trois vues", () => {
    const knee: Vec3 = CYCLE[1]!.knee[1]!;
    const ys: number[] = VIEWS.map(v => project(knee, v).y);
    expect(new Set(ys).size).toBe(1);
  });
});
