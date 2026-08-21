import { describe, expect, it } from "vitest";
import { BACKGROUND_MIN, type Rgba } from "./image";
import {
  type Band, detectGroundLine, eraseGroundLine, type FrameBox,
  frameAnchor, packFrames, type PackedStrip, sliceFrames,
} from "./strip";

/** Image opaque entièrement blanche — le fond que livre le générateur. */
function white(w: number, h: number): Rgba {
  const data: Uint8Array = new Uint8Array(w * h * 4).fill(255);
  return { width: w, height: h, data };
}

function ink(img: Rgba, x: number, y: number, v: number = 20): void {
  const i: number = (y * img.width + x) * 4;
  img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
}

function fill(img: Rgba, x0: number, y0: number, x1: number, y1: number, v: number = 20): void {
  for (let y: number = y0; y <= y1; y++) for (let x: number = x0; x <= x1; x++) ink(img, x, y, v);
}

function alphaAt(img: Rgba, x: number, y: number): number {
  return img.data[(y * img.width + x) * 4 + 3]!;
}

/** Planche minimale : trois blocs posés sur une ligne de sol continue.
 *  Les écarts entre poses dépassent le seuil de recollement (30 px), comme sur
 *  une planche réelle — plus serrés, les poses seraient prises pour une seule. */
function strip(): Rgba {
  const img: Rgba = white(200, 40);
  fill(img, 10, 10, 29, 30);
  fill(img, 80, 12, 99, 30);
  fill(img, 150, 10, 169, 30);
  for (let x: number = 4; x < 196; x++) ink(img, x, 31, 90);
  return img;
}

describe("detectGroundLine", () => {
  it("trouve la ligne continue qui traverse la planche", () => {
    const band: Band | null = detectGroundLine(strip(), BACKGROUND_MIN);
    expect(band).not.toBeNull();
    expect(band!.top).toBe(31);
    expect(band!.bottom).toBe(31);
  });

  it("NE PREND PAS une rangée de silhouettes pour une ligne de sol", () => {
    // Le piège qui a coûté une passe : à hauteur des torses, quatre personnages
    // côte à côte couvrent eux aussi 85 % de la largeur. Ce qui les distingue,
    // c'est la CONTINUITÉ — mesuré sur la planche réelle : 75 % de remplissage
    // pour la bande des torses, 100 % pour la ligne.
    const img: Rgba = white(100, 20);
    for (const x0 of [2, 30, 58, 86]) fill(img, x0, 8, x0 + 11, 12);
    expect(detectGroundLine(img, BACKGROUND_MIN)).toBeNull();
  });

  it("rend null sur une planche sans ligne", () => {
    const img: Rgba = white(60, 30);
    fill(img, 10, 10, 20, 25);
    expect(detectGroundLine(img, BACKGROUND_MIN)).toBeNull();
  });

  it("regroupe une ligne épaisse de plusieurs pixels", () => {
    const img: Rgba = white(80, 30);
    for (let y: number = 20; y <= 22; y++) for (let x: number = 2; x < 78; x++) ink(img, x, y, 80);
    const band: Band | null = detectGroundLine(img, BACKGROUND_MIN);
    expect(band).toEqual({ top: 20, bottom: 22 });
  });
});

describe("eraseGroundLine", () => {
  it("efface la ligne là où elle est libre", () => {
    const img: Rgba = strip();
    const band: Band = detectGroundLine(img, BACKGROUND_MIN)!;
    eraseGroundLine(img, band, BACKGROUND_MIN);
    expect(alphaAt(img, 50, 31)).toBe(0);   // entre deux blocs
  });

  it("ÉPARGNE la ligne sous une silhouette", () => {
    // Elle passe derrière les pieds : l'effacer en bloc percerait une fente dans
    // chaque botte. Le test de non-régression du défaut.
    const img: Rgba = strip();
    const band: Band = detectGroundLine(img, BACKGROUND_MIN)!;
    eraseGroundLine(img, band, BACKGROUND_MIN);
    expect(alphaAt(img, 15, 31)).toBe(255); // sous le premier bloc
    expect(alphaAt(img, 85, 31)).toBe(255); // sous le deuxième
  });

  it("ne touche à rien si la sonde sort de l'image", () => {
    const img: Rgba = white(40, 6);
    for (let x: number = 1; x < 39; x++) ink(img, x, 2, 90);
    const band: Band = { top: 2, bottom: 2 };
    expect(eraseGroundLine(img, band, BACKGROUND_MIN, 10)).toBe(0);
  });
});

describe("sliceFrames", () => {
  /** Planche déjà détourée : fond transparent, ligne retirée. */
  function cut(): Rgba {
    const img: Rgba = strip();
    const band: Band = detectGroundLine(img, BACKGROUND_MIN)!;
    eraseGroundLine(img, band, BACKGROUND_MIN);
    for (let y: number = 0; y < img.height; y++) {
      for (let x: number = 0; x < img.width; x++) {
        const i: number = (y * img.width + x) * 4;
        if (img.data[i]! >= BACKGROUND_MIN) img.data[i + 3] = 0;
      }
    }
    return img;
  }

  it("isole chaque pose", () => {
    const boxes: FrameBox[] = sliceFrames(cut());
    expect(boxes.length).toBe(3);
    expect(boxes[0]!.x0).toBe(10);
    expect(boxes[1]!.x0).toBe(80);
    expect(boxes[2]!.x0).toBe(150);
  });

  it("RECOLLE un morceau détaché à sa pose", () => {
    // Une pose a souvent des morceaux séparés — fer de hache, pied levé. Les
    // compter comme des poses à part entière casserait tout le découpage.
    const img: Rgba = cut();
    // Éclat à 5 px du premier bloc — bien en deçà du seuil de recollement.
    for (let y: number = 14; y <= 18; y++) for (let x: number = 34; x <= 38; x++) img.data[(y * img.width + x) * 4 + 3] = 255;
    expect(sliceFrames(img).length).toBe(3);
  });

  it("ignore les poussières d'anticrénelage", () => {
    const img: Rgba = cut();
    img.data[(5 * img.width + 60) * 4 + 3] = 255;  // un pixel isolé
    expect(sliceFrames(img).length).toBe(3);
  });
});

describe("frameAnchor", () => {
  it("suit le HAUT du corps, pas la boîte", () => {
    // Aligner sur le centre de la boîte ferait glisser la pose quand la jambe
    // s'avance ou que l'arme balance : la boîte s'élargit d'un seul côté.
    const img: Rgba = { width: 60, height: 40, data: new Uint8Array(60 * 40 * 4) };
    const paint = (x0: number, y0: number, x1: number, y1: number): void => {
      for (let y: number = y0; y <= y1; y++) for (let x: number = x0; x <= x1; x++) img.data[(y * 60 + x) * 4 + 3] = 255;
    };
    paint(20, 4, 29, 14);        // buste, centré sur 24,5
    paint(20, 15, 45, 30);       // jambe très avancée vers la droite
    const box: FrameBox = { x0: 20, y0: 4, x1: 45, y1: 30, anchorX: 0 };
    const anchor: number = frameAnchor(img, box);
    expect(anchor).toBeGreaterThan(23);
    expect(anchor).toBeLessThan(26);
    // Le centre de la boîte, lui, est tiré loin par la jambe.
    expect((box.x0 + box.x1) / 2).toBeGreaterThan(30);
  });
});

describe("packFrames", () => {
  function packed(): PackedStrip {
    const img: Rgba = strip();
    const band: Band = detectGroundLine(img, BACKGROUND_MIN)!;
    eraseGroundLine(img, band, BACKGROUND_MIN);
    for (let y: number = 0; y < img.height; y++) {
      for (let x: number = 0; x < img.width; x++) {
        const i: number = (y * img.width + x) * 4;
        if (img.data[i]! >= BACKGROUND_MIN) img.data[i + 3] = 0;
      }
    }
    return packFrames(img, sliceFrames(img), band.bottom);
  }

  it("produit des cases de taille identique", () => {
    const p: PackedStrip = packed();
    expect(p.count).toBe(3);
    expect(p.sheet.width).toBe(p.cellW * p.count);
    expect(p.sheet.height).toBe(p.cellH);
  });

  it("CALE toutes les poses sur la ligne de sol", () => {
    // C'est le cœur du procédé : chaque pose garde son élévation voulue au-dessus
    // de la ligne, et toute dérive involontaire disparaît. Sans ce calage, une
    // pose 3 px plus basse ferait tressauter la créature à chaque cycle.
    const p: PackedStrip = packed();
    const bottoms: number[] = [];
    for (let i: number = 0; i < p.count; i++) {
      let bottom: number = -1;
      for (let y: number = 0; y < p.cellH; y++) {
        for (let x: number = i * p.cellW; x < (i + 1) * p.cellW; x++) {
          if (p.sheet.data[(y * p.sheet.width + x) * 4 + 3] !== 0) { bottom = y; break; }
        }
      }
      bottoms.push(bottom);
    }
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(1);
  });

  it("rapporte les dispersions plutôt que de les taire", () => {
    // Le rapport est ce qui permet de distinguer un rebond voulu d'une dérive
    // d'échelle — l'outil ne peut pas trancher, l'œil oui.
    const p: PackedStrip = packed();
    expect(p.heightSpread).toBeGreaterThanOrEqual(0);
    expect(p.baselineSpread).toBeGreaterThanOrEqual(0);
    expect(p.heightSpread).toBe(2); // le bloc du milieu est 2 px plus court
  });

  it("garde chaque pose dans SA case, sans déborder sur la voisine", () => {
    const p: PackedStrip = packed();
    for (let i: number = 1; i < p.count; i++) {
      const seam: number = i * p.cellW;
      let n: number = 0;
      for (let y: number = 0; y < p.cellH; y++) {
        if (p.sheet.data[(y * p.sheet.width + seam - 1) * 4 + 3] !== 0
          && p.sheet.data[(y * p.sheet.width + seam) * 4 + 3] !== 0) n++;
      }
      expect(n, `chevauchement à la case ${i}`).toBe(0);
    }
  });
});
