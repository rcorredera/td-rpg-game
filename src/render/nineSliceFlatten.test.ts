import { describe, expect, it } from "vitest";
import { dominantRgba, flattenStretched, type PixelBuffer, type Rgba } from "./nineSliceFlatten";
import { planNineSlice, type SheetFrame } from "./nineSlicePlan";

// ============================================================
// Le défaut que ce fichier rend impossible : une pièce de nine-slice qui VARIE le
// long de son axe d'étirement. Mesuré sur le parchemin du pack — bande gauche à
// huit profils de ligne pour huit lignes, centre à deux couleurs — et vu à
// l'écran comme une traînée claire sur le bord de chaque tuile.
//
// La garantie est écrite pour toute la FAMILLE (les cinq pièces étirées de
// n'importe quelle planche), pas pour le cas particulier qui l'a révélée.
// ============================================================

/** Parchemin, mesuré sur la planche (mêmes valeurs que `nineSlicePlan.test.ts`). */
const PAPER: SheetFrame = {
  left: [12, 128, 256], right: [64, 192, 308],
  top: [20, 128, 256], bottom: [64, 192, 301],
};

function buffer(w: number, h: number, at: (x: number, y: number) => Rgba): PixelBuffer {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = at(x, y);
      const i = (y * w + x) * 4;
      data[i] = c.r; data[i + 1] = c.g; data[i + 2] = c.b; data[i + 3] = c.a;
    }
  }
  return { w, h, data };
}

function pixel(img: PixelBuffer, x: number, y: number): string {
  const i = (y * img.w + x) * 4;
  return `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]},${img.data[i + 3]}`;
}

/** Bruit reproductible : le grain moucheté du parchemin, sans dépendre du hasard. */
function grain(x: number, y: number): Rgba {
  const n = (x * 7 + y * 13) % 11;
  return n < 3
    ? { r: 226, g: 208, b: 194, a: 255 }   // moucheture
    : { r: 238, g: 225, b: 198, a: 255 };  // remplissage
}

describe("aplatissement des pièces étirées", () => {
  const plan = planNineSlice(PAPER, 3, 16);

  it("rend chaque pièce constante le long de son axe d'étirement", () => {
    const img = buffer(plan.fullW, plan.fullH, grain);
    flattenStretched(img, plan.rects);

    for (const [i, r] of plan.rects.entries()) {
      if (r.stretch === "none") continue;
      const enX = r.stretch === "x" || r.stretch === "both";
      const enY = r.stretch === "y" || r.stretch === "both";
      for (let y = 0; y < r.sh; y++) {
        for (let x = 0; x < r.sw; x++) {
          if (enX) {
            expect(pixel(img, r.dx + x, r.dy + y), `pièce ${i} (${r.stretch}) : varie en X en (${x},${y})`)
              .toBe(pixel(img, r.dx, r.dy + y));
          }
          if (enY) {
            expect(pixel(img, r.dx + x, r.dy + y), `pièce ${i} (${r.stretch}) : varie en Y en (${x},${y})`)
              .toBe(pixel(img, r.dx + x, r.dy));
          }
        }
      }
    }
  });

  it("ne touche à aucun des quatre coins", () => {
    const avant = buffer(plan.fullW, plan.fullH, grain);
    const apres = buffer(plan.fullW, plan.fullH, grain);
    flattenStretched(apres, plan.rects);

    // Les coins portent TOUT le dessin du pack : contour, arrondi, ornement.
    // Les aplatir reviendrait à jeter l'habillage qu'on cherche à poser.
    for (const r of plan.rects.filter(p => p.stretch === "none")) {
      for (let y = 0; y < r.sh; y++) {
        for (let x = 0; x < r.sw; x++) {
          expect(pixel(apres, r.dx + x, r.dy + y), `coin modifié en (${x},${y})`)
            .toBe(pixel(avant, r.dx + x, r.dy + y));
        }
      }
    }
  });

  it("garde le remplissage même quand la moucheture ouvre l'échantillon", () => {
    // La tache est placée EXPRÈS sur les premiers pixels de chaque prélèvement :
    // une implémentation qui retiendrait « le premier vu » plutôt que le plus
    // fréquent passerait un test où la tache tombe ailleurs.
    const fond: Rgba = { r: 238, g: 225, b: 198, a: 255 };
    const tache: Rgba = { r: 22, g: 28, b: 46, a: 255 };
    const img = buffer(plan.fullW, plan.fullH, () => fond);
    for (const r of plan.rects) {
      if (r.stretch === "none") continue;
      const enX = r.stretch === "x" || r.stretch === "both";
      for (let y = 0; y < r.sh; y++) {
        for (let x = 0; x < r.sw; x++) {
          // Deux pixels sur les huit du prélèvement : minoritaire, mais en tête.
          if (enX ? x < 2 : y < 2) {
            const i = ((r.dy + y) * img.w + r.dx + x) * 4;
            img.data[i] = tache.r; img.data[i + 1] = tache.g;
            img.data[i + 2] = tache.b; img.data[i + 3] = tache.a;
          }
        }
      }
    }
    flattenStretched(img, plan.rects);

    for (const r of plan.rects) {
      if (r.stretch === "none") continue;
      expect(pixel(img, r.dx, r.dy), `pièce ${r.stretch} : la tache a gagné`).toBe("238,225,198,255");
    }
  });

  it("préserve le profil transversal d'une bordure", () => {
    // Une bande horizontale s'aplatit en X, donc son dégradé VERTICAL (liseré,
    // reflet, remplissage) doit survivre intact — sinon on remplacerait une
    // traînée par un aplat, et le contour du pack disparaîtrait.
    const teintes: Rgba[] = [
      { r: 22, g: 28, b: 46, a: 255 },
      { r: 242, g: 234, b: 219, a: 255 },
      { r: 238, g: 225, b: 198, a: 255 },
    ];
    const haut = plan.rects.find(r => r.stretch === "x")!;
    const img = buffer(plan.fullW, plan.fullH, (x, y) => {
      const base = teintes[Math.min(y, teintes.length - 1)]!;
      // Parasite minoritaire, posé sur les deux premières colonnes de la bande.
      return x - haut.dx >= 0 && x - haut.dx < 2 ? { r: 1, g: 2, b: 3, a: 255 } : base;
    });
    flattenStretched(img, plan.rects);

    expect([0, 1, 2].map(y => pixel(img, haut.dx, haut.dy + y)))
      .toEqual(["22,28,46,255", "242,234,219,255", "238,225,198,255"]);
  });

  it("ne rend jamais une couleur absente de l'échantillon", () => {
    // Échantillon choisi pour que la médiane par canal — (50,177,50) — n'existe
    // dans aucun des quatre pixels : une moyenne ou une médiane inventerait une
    // teinte que l'artiste n'a jamais posée.
    const echantillon: Rgba[] = [
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 0, g: 255, b: 0, a: 255 },
      { r: 255, g: 0, b: 255, a: 255 },
      { r: 100, g: 100, b: 100, a: 255 },
    ];
    const d = dominantRgba(echantillon);
    expect(echantillon.some(c => c.r === d.r && c.g === d.g && c.b === d.b && c.a === d.a)).toBe(true);
    expect(d).toEqual({ r: 0, g: 255, b: 0, a: 255 });
  });
});
