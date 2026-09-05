import { describe, expect, it } from "vitest";
import { type Rgba } from "./image";
import { type Bone, capsule, CELL_H, CELL_W, mannequinSheet, paintBones, piecesSheet } from "./mannequin";
import { POSES, VIEWS } from "./pose";

/** Pixels opaques d'une case de la grille. */
function inkIn(img: Rgba, col: number, row: number): number {
  let n: number = 0;
  for (let y: number = row * CELL_H; y < (row + 1) * CELL_H && y < img.height; y++) {
    for (let x: number = col * CELL_W; x < (col + 1) * CELL_W && x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] !== 0) n++;
    }
  }
  return n;
}

/** Pixels d'ENCRE sombre : contour et repères, à l'exclusion du gris des pièces. */
function darkIn(img: Rgba, col: number, row: number): number {
  let n: number = 0;
  for (let y: number = row * CELL_H; y < (row + 1) * CELL_H && y < img.height; y++) {
    for (let x: number = col * CELL_W; x < (col + 1) * CELL_W && x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4]! < 60) n++;
    }
  }
  return n;
}

/** Pixels non blancs — le fond est opaque, l'alpha ne suffit pas à le distinguer. */
function drawnIn(img: Rgba, col: number, row: number): number {
  let n: number = 0;
  for (let y: number = row * CELL_H; y < (row + 1) * CELL_H && y < img.height; y++) {
    for (let x: number = col * CELL_W; x < (col + 1) * CELL_W && x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4]! < 240) n++;
    }
  }
  return n;
}

describe("mannequinSheet", () => {
  it("rend les trois vues par défaut", () => {
    const img: Rgba = mannequinSheet();
    expect(img.width).toBe(CELL_W * POSES);
    expect(img.height).toBe(CELL_H * VIEWS.length);
  });

  it("rend UNE rangée quand une vue est demandée", () => {
    // Le générateur tient quatre cases et décroche sur douze (ADR-074).
    const img: Rgba = mannequinSheet("side");
    expect(img.height).toBe(CELL_H);
  });

  it("dessine quelque chose dans chaque case", () => {
    const img: Rgba = mannequinSheet("front");
    for (let c: number = 0; c < POSES; c++) expect(drawnIn(img, c, 0)).toBeGreaterThan(500);
  });

  it("part d'un fond OPAQUE", () => {
    // Un fond transparent ferait croire au détourage que l'image est déjà
    // découpée, et il laisserait une frange claire tout autour.
    const img: Rgba = mannequinSheet("front");
    expect(inkIn(img, 0, 0)).toBe(CELL_W * CELL_H);
  });
});

describe("piecesSheet", () => {
  const sheet: Rgba = piecesSheet();

  it("range douze pièces dans une grille de seize cases", () => {
    expect(sheet.width).toBe(CELL_W * 4);
    expect(sheet.height).toBe(CELL_H * 4);
    // Les deux dernières cases des deux premières rangées restent vides : il n'y
    // a que trois vues, et une grille régulière se découpe plus sûrement qu'une
    // disposition compacte.
    expect(drawnIn(sheet, 3, 0)).toBe(0);
    expect(drawnIn(sheet, 3, 1)).toBe(0);
    for (const [c, r] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [0, 3], [1, 3]] as [number, number][]) {
      expect(drawnIn(sheet, c, r)).toBeGreaterThan(200);
    }
  });

  it("distingue les trois têtes par le NEZ", () => {
    // Sans lui, la tête de face et celle de dos sont le même disque, et rien ne
    // dirait au générateur laquelle est laquelle.
    // Mesuré sur l'ENCRE et non sur la surface : de face le nez est un point
    // sombre DANS le crâne, il n'agrandit donc pas la pièce.
    const front: number = darkIn(sheet, 0, 0);
    const side: number = darkIn(sheet, 1, 0);
    const back: number = darkIn(sheet, 2, 0);
    expect(side).toBeGreaterThan(front);   // de profil, le nez dépasse du crâne
    expect(front).toBeGreaterThan(back);   // de face, il s'ajoute sans dépasser
  });

  it("garde les proportions RELATIVES des membres", () => {
    // Mettre chaque pièce à la taille de sa case donnerait un personnage aux
    // membres dépareillés une fois assemblé.
    const arm: number = drawnIn(sheet, 0, 2);
    const thigh: number = drawnIn(sheet, 3, 2);
    expect(thigh).toBeGreaterThan(arm);
  });

  it("dessine les pièces à PLAT, jamais dans une pose", () => {
    // Une pièce inclinée obligerait le moteur à défaire l'inclinaison avant de
    // la replacer, et l'angle exact serait à deviner.
    const col: number = 2;
    let minX: number = CELL_W;
    let maxX: number = 0;
    for (let y: number = 2 * CELL_H; y < 3 * CELL_H; y++) {
      for (let x: number = col * CELL_W; x < (col + 1) * CELL_W; x++) {
        if (sheet.data[(y * sheet.width + x) * 4]! < 240) {
          minX = Math.min(minX, x - col * CELL_W);
          maxX = Math.max(maxX, x - col * CELL_W);
        }
      }
    }
    const mid: number = CELL_W / 2;
    expect(Math.abs((minX + maxX) / 2 - mid)).toBeLessThan(3);
  });
});

describe("paintBones — le contour survit au voisin", () => {
  function blank(w: number, h: number): Rgba {
    return { width: w, height: h, data: new Uint8Array(w * h * 4).fill(255) };
  }

  /** Deux os PARALLÈLES qui se chevauchent, l'un derrière l'autre. C'est la
   *  configuration du bras devant le torse, réduite au strict nécessaire. */
  function overlapping(): Bone[] {
    return [
      { a: { x: 40, y: 10, depth: -1 }, b: { x: 40, y: 90, depth: -1 }, r: 20, depth: -1 },
      { a: { x: 55, y: 10, depth: 1 }, b: { x: 55, y: 90, depth: 1 }, r: 12, depth: 1 },
    ];
  }

  /** Encre dans une bande CHOISIE, loin des bords extérieurs de la silhouette.
   *  La séparation entre les deux os tombe en x = 39..43 : le contour de l'os
   *  proche, peint par-dessus le remplissage du lointain. */
  function inkBetween(img: Rgba, y: number, x0: number, x1: number): number {
    let ink: number = 0;
    for (let x: number = x0; x <= x1; x++) {
      if (img.data[(y * img.width + x) * 4]! < 60) ink++;
    }
    return ink;
  }

  it("laisse une SÉPARATION entre deux os superposés", () => {
    // Le défaut d'origine : contours d'abord, remplissages ensuite. Le
    // remplissage de l'os proche effaçait alors le contour qui le détachait de
    // celui de derrière, et les deux se fondaient en une seule forme.
    const img: Rgba = blank(120, 100);
    paintBones(img, overlapping());
    expect(inkBetween(img, 50, 35, 45)).toBeGreaterThan(0);
  });

  it("le prouve : en DEUX passes, la séparation disparaît", () => {
    // Reproduit à la main l'ancien ordre, pour que le test précédent ne puisse
    // pas passer par accident. Si cette assertion venait à échouer, c'est que
    // l'invariant ne se mesure plus là où on croit.
    const img: Rgba = blank(120, 100);
    const bones: Bone[] = overlapping();
    for (const b of bones) capsule(img, b.a, b.b, b.r + 4, [24, 24, 28]);
    for (const b of bones) capsule(img, b.a, b.b, b.r, [214, 214, 220]);
    expect(inkBetween(img, 50, 35, 45)).toBe(0);
  });

});
