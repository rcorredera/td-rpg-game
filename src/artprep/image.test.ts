import { describe, expect, it } from "vitest";
import {
  components, crop, downscale, dropFragments, feather, FRINGE_LUMA,
  type FragmentResult, type FringeResult,
  isBorder, lightBorderCount, luma, opaqueBox, type Rgba, stripFringe,
} from "./image";

/** Image vide de `w`×`h`, entièrement transparente. */
function blank(w: number, h: number): Rgba {
  return { width: w, height: h, data: new Uint8Array(w * h * 4) };
}

function put(img: Rgba, x: number, y: number, r: number, g: number, b: number, a: number): void {
  const i: number = (y * img.width + x) * 4;
  img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
}

function alphaAt(img: Rgba, x: number, y: number): number {
  return img.data[(y * img.width + x) * 4 + 3]!;
}

/** Carré noir plein bordé d'un liseré blanc : le cas réel après détourage d'un
 *  JPEG sur fond blanc. Le liseré occupe l'anneau extérieur. */
function blackSquareWithWhiteFringe(size: number): Rgba {
  const img: Rgba = blank(size, size);
  for (let y: number = 0; y < size; y++) {
    for (let x: number = 0; x < size; x++) {
      const onRing: boolean = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      if (onRing) put(img, x, y, 255, 255, 255, 255);
      else put(img, x, y, 20, 20, 20, 255);
    }
  }
  return img;
}

describe("luma", () => {
  it("classe le blanc au-dessus du seuil de frange et le noir en dessous", () => {
    const img: Rgba = blank(2, 1);
    put(img, 0, 0, 255, 255, 255, 255);
    put(img, 1, 0, 20, 20, 20, 255);
    expect(luma(img.data, 0)).toBeGreaterThan(FRINGE_LUMA);
    expect(luma(img.data, 4)).toBeLessThan(FRINGE_LUMA);
  });
});

describe("isBorder", () => {
  it("tient le bord de l'image pour une frontière", () => {
    // Sans cela, un sujet qui touche le cadre garderait sa frange sur cette arête.
    const img: Rgba = blank(3, 3);
    for (let y: number = 0; y < 3; y++) for (let x: number = 0; x < 3; x++) put(img, x, y, 0, 0, 0, 255);
    expect(isBorder(img, 0, 0)).toBe(true);  // coin, contre le cadre
    expect(isBorder(img, 1, 0)).toBe(true);  // arête haute, contre le cadre
    expect(isBorder(img, 1, 1)).toBe(false); // centre : quatre voisins opaques, cadre hors de portée
  });

  it("ne retient pas un pixel intérieur entouré d'opaque", () => {
    const img: Rgba = blank(5, 5);
    for (let y: number = 0; y < 5; y++) for (let x: number = 0; x < 5; x++) put(img, x, y, 0, 0, 0, 255);
    expect(isBorder(img, 2, 2)).toBe(false);
  });

  it("ignore un pixel transparent", () => {
    const img: Rgba = blank(3, 3);
    expect(isBorder(img, 1, 1)).toBe(false);
  });
});

describe("stripFringe", () => {
  it("supprime le liseré clair et laisse le contour noir intact", () => {
    const img: Rgba = blackSquareWithWhiteFringe(6);
    const res: FringeResult = stripFringe(img);

    expect(res.removed).toBe(6 * 6 - 4 * 4); // l'anneau extérieur, 20 px
    expect(res.saturated).toBe(false);
    expect(alphaAt(img, 0, 0)).toBe(0);      // liseré effacé
    expect(alphaAt(img, 1, 1)).toBe(255);    // contour noir conservé
    expect(lightBorderCount(img)).toBe(0);
  });

  it("épluche plusieurs couches successives, une passe en exposant une autre", () => {
    // Deux anneaux clairs concentriques : une seule passe n'en ôterait qu'un.
    const img: Rgba = blank(8, 8);
    for (let y: number = 0; y < 8; y++) {
      for (let x: number = 0; x < 8; x++) {
        const ring: number = Math.min(x, y, 7 - x, 7 - y);
        if (ring <= 1) put(img, x, y, 255, 255, 255, 255);
        else put(img, x, y, 10, 10, 10, 255);
      }
    }
    const res: FringeResult = stripFringe(img);
    expect(res.passes).toBe(2);
    expect(lightBorderCount(img)).toBe(0);
    expect(alphaAt(img, 3, 3)).toBe(255);
  });

  it("signale la saturation plutôt que de ronger un sprite entièrement clair", () => {
    // Un sujet sans contour noir se ferait dévorer : le drapeau existe pour ça.
    const img: Rgba = blank(6, 6);
    for (let y: number = 0; y < 6; y++) for (let x: number = 0; x < 6; x++) put(img, x, y, 240, 240, 240, 255);
    const res: FringeResult = stripFringe(img, 2);
    expect(res.saturated).toBe(true);
    expect(res.passes).toBe(2);
  });

  it("ne touche pas un sprite déjà propre", () => {
    const img: Rgba = blank(4, 4);
    for (let y: number = 0; y < 4; y++) for (let x: number = 0; x < 4; x++) put(img, x, y, 0, 0, 0, 255);
    const res: FringeResult = stripFringe(img);
    expect(res.removed).toBe(0);
    expect(res.passes).toBe(0);
  });
});

describe("components / dropFragments", () => {
  it("sépare deux taches disjointes", () => {
    const img: Rgba = blank(9, 3);
    put(img, 0, 1, 0, 0, 0, 255);
    put(img, 1, 1, 0, 0, 0, 255);
    put(img, 8, 1, 0, 0, 0, 255);
    const comps: number[][] = components(img);
    expect(comps.length).toBe(2);
    expect(comps[0]!.length).toBe(2); // trié du plus grand au plus petit
    expect(comps[1]!.length).toBe(1);
  });

  it("efface les miettes et conserve la composante principale", () => {
    const img: Rgba = blank(10, 3);
    for (let x: number = 0; x < 5; x++) put(img, x, 1, 0, 0, 0, 255);
    put(img, 9, 1, 0, 0, 0, 255); // miette
    const res: FragmentResult = dropFragments(img, 3);
    expect(res.dropped).toBe(1);
    expect(res.droppedPx).toBe(1);
    expect(alphaAt(img, 9, 1)).toBe(0);
    expect(alphaAt(img, 0, 1)).toBe(255);
  });

  it("CONSERVE et signale un fragment au-dessus du seuil, sans le supprimer", () => {
    // Un membre légitimement détaché (dard, éclat en orbite) ne doit pas
    // disparaître en silence : c'est au PO de trancher.
    const img: Rgba = blank(12, 3);
    for (let x: number = 0; x < 5; x++) put(img, x, 1, 0, 0, 0, 255);
    for (let x: number = 8; x < 12; x++) put(img, x, 1, 0, 0, 0, 255);
    const res: FragmentResult = dropFragments(img, 3);
    expect(res.dropped).toBe(0);
    expect(res.kept).toEqual([{ size: 4 }]);
    expect(alphaAt(img, 8, 1)).toBe(255);
  });
});

describe("opaqueBox / crop", () => {
  it("rogne au plus près des pixels visibles", () => {
    const img: Rgba = blank(10, 10);
    put(img, 3, 4, 0, 0, 0, 255);
    put(img, 6, 8, 0, 0, 0, 255);
    expect(opaqueBox(img)).toEqual({ x0: 3, y0: 4, x1: 6, y1: 8 });
    const out: Rgba = crop(img);
    expect([out.width, out.height]).toEqual([4, 5]);
    expect(alphaAt(out, 0, 0)).toBe(255);
    expect(alphaAt(out, 3, 4)).toBe(255);
  });

  it("préserve les couleurs en rognant", () => {
    const img: Rgba = blank(5, 5);
    put(img, 2, 2, 10, 20, 30, 255);
    const out: Rgba = crop(img);
    expect([out.width, out.height]).toEqual([1, 1]);
    expect([...out.data]).toEqual([10, 20, 30, 255]);
  });

  it("laisse une image vide inchangée plutôt que de produire une taille nulle", () => {
    const img: Rgba = blank(4, 4);
    expect(opaqueBox(img)).toBeNull();
    expect(crop(img)).toBe(img);
  });
});

describe("feather", () => {
  it("adoucit l'alpha du bord sans percer l'intérieur", () => {
    const img: Rgba = blank(5, 5);
    for (let y: number = 1; y < 4; y++) for (let x: number = 1; x < 4; x++) put(img, x, y, 0, 0, 0, 255);
    feather(img);
    expect(alphaAt(img, 1, 1)).toBeLessThan(255);   // coin adouci
    expect(alphaAt(img, 2, 2)).toBe(255);           // centre intact
  });

  it("reprend la couleur du voisin opaque le plus SOMBRE", () => {
    // Sinon adoucir un pixel de bord clair le rendrait translucide au lieu de
    // l'effacer, et réintroduirait la frange qu'on vient d'ôter.
    const img: Rgba = blank(4, 3);
    put(img, 1, 1, 250, 250, 250, 255); // bord clair
    put(img, 2, 1, 12, 12, 12, 255);    // voisin sombre
    feather(img);
    const i: number = (1 * 4 + 1) * 4;
    expect(img.data[i]).toBe(12);
  });
});

describe("downscale", () => {
  it("cale le plus grand côté sur la cible en gardant les proportions", () => {
    const img: Rgba = blank(400, 200);
    for (let i: number = 0; i < 400 * 200; i++) img.data[i * 4 + 3] = 255;
    const out: Rgba = downscale(img, 100);
    expect([out.width, out.height]).toEqual([100, 50]);
  });

  it("ne fait rien si l'image est déjà sous la cible", () => {
    const img: Rgba = blank(10, 10);
    expect(downscale(img, 256)).toBe(img);
  });

  it("ne laisse pas les pixels transparents assombrir les couleurs", () => {
    // Moyenne PRÉMULTIPLIÉE : sans elle, le voisin transparent (couleur 0,0,0
    // arbitraire) tirerait la moyenne vers le noir et cernerait le sprite.
    const img: Rgba = blank(2, 2);
    put(img, 0, 0, 200, 100, 50, 255);
    // les trois autres restent transparents, couleur nulle
    const out: Rgba = downscale(img, 1);
    expect([out.width, out.height]).toEqual([1, 1]);
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([200, 100, 50]);
    expect(out.data[3]).toBe(64); // 255/4, l'alpha lui est bien moyenné
  });
});

describe("chaîne complète", () => {
  it("part d'un sprite frangé et margé, et sort un sprite propre et serré", () => {
    // Le cas de bout en bout : sujet noir cerné de blanc, perdu dans du vide.
    const img: Rgba = blank(20, 20);
    for (let y: number = 6; y < 14; y++) {
      for (let x: number = 6; x < 14; x++) {
        const onRing: boolean = x === 6 || y === 6 || x === 13 || y === 13;
        if (onRing) put(img, x, y, 255, 255, 255, 255);
        else put(img, x, y, 15, 15, 15, 255);
      }
    }
    stripFringe(img);
    dropFragments(img);
    const out: Rgba = crop(img);
    expect([out.width, out.height]).toEqual([6, 6]); // le liseré est parti, le noir reste
    expect(lightBorderCount(out)).toBe(0);
  });
});
