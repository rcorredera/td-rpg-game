import { describe, expect, it } from "vitest";
import { type Rgba } from "./image";
import {
  cycleReport, cycleWarnings, DUPLICATE_POSE_MAX, FLAT_CYCLE_MAX,
  FLAT_FRONTAL_MAX, legDissimilarity, profileRow, type RowCycle,
} from "./cycle";

const CELL: number = 20;
const H: number = 20;
const LEG_W: number = 4;

/** Planche d'une rangée : une case par entrée, chaque entrée décrivant les
 *  colonnes où les jambes posent. Le haut du corps est identique partout —
 *  c'est exactement ce qui donnait le change sur la planche fautive. */
function sheet(legs: readonly [number, number][]): Rgba {
  const w: number = CELL * legs.length;
  const img: Rgba = { width: w, height: H, data: new Uint8Array(w * H * 4) };
  const paint = (x: number, y: number): void => { img.data[(y * w + x) * 4 + 3] = 255; };
  legs.forEach(([a, b], c) => {
    for (let y: number = 2; y < 12; y++) for (let x: number = 6; x <= 13; x++) paint(c * CELL + x, y); // buste
    // Jambes ÉPAISSES : d'un pixel de large, un décalage d'un pixel donnerait
    // 100 % d'écart, et la mesure ne dirait plus rien de l'amplitude réelle.
    for (let y: number = 12; y < H; y++) {
      for (let d: number = 0; d < LEG_W; d++) { paint(c * CELL + a + d, y); paint(c * CELL + b + d, y); }
    }
  });
  return img;
}

describe("legDissimilarity", () => {
  it("ignore le haut du corps", () => {
    // Deux cases aux jambes identiques valent 0 même si les bras diffèrent :
    // c'est tout l'enjeu, les bras bougeaient là où les jambes ne bougeaient pas.
    const img: Rgba = sheet([[4, 15], [4, 15]]);
    for (let y: number = 2; y < 6; y++) img.data[(y * img.width + CELL + 18) * 4 + 3] = 255; // bras en plus
    expect(legDissimilarity(img, CELL, 0, 1)).toBe(0);
  });

  it("croît avec l'écart des appuis", () => {
    const img: Rgba = sheet([[4, 15], [4, 15], [9, 10]]);
    expect(legDissimilarity(img, CELL, 0, 1)).toBe(0);
    expect(legDissimilarity(img, CELL, 0, 2)).toBeGreaterThan(0.5);
  });

  it("rend 0 sur une zone vide plutôt que de diviser par zéro", () => {
    const img: Rgba = { width: CELL * 2, height: H, data: new Uint8Array(CELL * 2 * H * 4) };
    expect(legDissimilarity(img, CELL, 0, 1)).toBe(0);
  });
});

describe("cycleWarnings", () => {
  /** Cycle sain : appui large, passage serré, appui large inversé. */
  const WALKING: Rgba = sheet([[3, 16], [9, 11], [4, 17]]);
  /** Le défaut réel : des poses aux jambes au même endroit, à un cheveu près.
   *  Réglé pour tomber vers 20 % d'écart — la valeur mesurée sur la rangée de
   *  profil qui a fait dire au PO « les jambes ont la même position ». */
  const SLIDING: Rgba = sheet([[4, 15], [4, 15], [4, 16]]);

  it("ne dit rien d'un cycle qui marche", () => {
    expect(cycleWarnings(cycleReport(WALKING, CELL, 1, 3))).toEqual([]);
  });

  it("DÉNONCE deux poses identiques", () => {
    const w: string[] = cycleWarnings(cycleReport(SLIDING, CELL, 1, 3));
    expect(w.some(s => s.includes("MÊME image"))).toBe(true);
  });

  it("DÉNONCE une rangée sans alternance d'appui", () => {
    // Le défaut signalé par le PO : « les jambes ont la même position ».
    const w: string[] = cycleWarnings(cycleReport(SLIDING, CELL, 1, 3));
    expect(w.some(s => s.includes("alternance"))).toBe(true);
  });

  it("traite chaque rangée séparément", () => {
    // Une planche à trois directions peut marcher de profil et glisser de face :
    // moyenner les rangées masquerait la fautive.
    const both: Rgba = { width: CELL * 6, height: H, data: new Uint8Array(CELL * 6 * H * 4) };
    for (let y: number = 0; y < H; y++) {
      const w: number = y * WALKING.width * 4;
      both.data.set(WALKING.data.subarray(w, w + WALKING.width * 4), (y * both.width) * 4);
      const s: number = y * SLIDING.width * 4;
      both.data.set(SLIDING.data.subarray(s, s + SLIDING.width * 4), (y * both.width + 3 * CELL) * 4);
    }
    const report: RowCycle[] = cycleReport(both, CELL, 2, 3);
    expect(cycleWarnings([report[0]!])).toEqual([]);
    expect(cycleWarnings([report[1]!]).length).toBeGreaterThan(0);
  });

  it("se tait sur une rangée d'une seule pose", () => {
    // Pas de paire à comparer : l'absence de cycle n'y est pas un défaut.
    expect(cycleWarnings(cycleReport(sheet([[4, 15]]), CELL, 1, 1))).toEqual([]);
  });

  it("garde les deux seuils séparés", () => {
    // Un doublon dans un cycle par ailleurs ample doit être dénoncé SEUL.
    const w: string[] = cycleWarnings(cycleReport(sheet([[3, 16], [3, 16], [9, 11]]), CELL, 1, 3));
    expect(w.some(s => s.includes("MÊME image"))).toBe(true);
    expect(w.some(s => s.includes("alternance"))).toBe(false);
  });

  it("place les seuils dans le bon ordre", () => {
    expect(DUPLICATE_POSE_MAX).toBeLessThan(FLAT_CYCLE_MAX);
  });
});

describe("cycleReport — les paires voisines", () => {
  /** Cycle vu de PROFIL : les deux contacts ont la MÊME silhouette, seules
   *  l'occlusion et l'ombre disent quelle jambe est devant. C'est le cas normal
   *  d'une marche, et le gabarit de référence l'a mis en évidence (ADR-073). */
  const PROFILE: Rgba = sheet([[3, 16], [9, 11], [3, 16], [9, 11]]);

  it("NE COMPARE PAS deux poses opposées du cycle", () => {
    // Poses 0 et 2 identiques : sans la restriction aux voisines, toute marche
    // de profil serait déclarée « doublon » et l'outil refuserait sa référence.
    const w: string[] = cycleWarnings(cycleReport(PROFILE, CELL, 1, 4));
    expect(w.some(s => s.includes("MÊME image"))).toBe(false);
  });

  it("dénonce toujours deux poses VOISINES identiques", () => {
    const w: string[] = cycleWarnings(cycleReport(sheet([[3, 16], [3, 16], [9, 11], [4, 15]]), CELL, 1, 4));
    expect(w.some(s => s.includes("MÊME image"))).toBe(true);
  });

  it("boucle : la dernière pose est voisine de la première", () => {
    // Un cycle se referme. Sans le bouclage, un doublon entre la première et la
    // dernière case passerait, et c'est exactement celui du gobelin.
    const w: string[] = cycleWarnings(cycleReport(sheet([[3, 16], [9, 11], [4, 15], [3, 16]]), CELL, 1, 4));
    expect(w.some(s => s.includes("MÊME image"))).toBe(true);
  });
});

describe("cycleWarnings — seuil par vue", () => {
  it("est plus EXIGEANT sur la rangée de profil que sur les frontales", () => {
    // De face, les jambes bougent en profondeur : la silhouette varie peu, et le
    // seuil du profil y exigerait l'impossible.
    expect(FLAT_FRONTAL_MAX).toBeLessThan(FLAT_CYCLE_MAX);
  });

  it("applique le seuil du profil à la DEUXIÈME rangée", () => {
    expect(profileRow(3)).toBe(1);
    expect(profileRow(1)).toBe(0);
  });

  it("dénonce la rangée de PROFIL là où il laisse passer les frontales", () => {
    // Amplitude modérée, la même dans les trois rangées : suffisante de face et
    // de dos, où les jambes bougent en profondeur, insuffisante de profil, où
    // rien ne masque le mouvement. Une seule des trois doit être dénoncée.
    const modest: RowCycle[] = [0, 1, 2].map(row => ({
      row,
      closest: { a: 0, b: 1, diff: 0.2 },
      widest: { a: 0, b: 2, diff: 0.25 },
    }));
    const w: string[] = cycleWarnings(modest);
    expect(w.length).toBe(1);
    expect(w[0]).toContain("rangée 1");
  });
});
