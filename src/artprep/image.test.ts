import { describe, expect, it } from "vitest";
import {
  BACKGROUND_MIN, components, crop, downscale, dropFragments, feather, fillHoles, findHoles, floodBackground, FRINGE_LUMA,
  type Hole, isFringe,
  type FragmentResult, type FringeResult,
  isBorder, lightBorderCount, luma, opaqueBox, type Rgba, stack, stripFringe,
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

describe("floodBackground", () => {
  /** Sujet noir sur fond blanc opaque, avec une POCHE blanche enfermée dedans —
   *  un reflet d'armure, un œil. C'est elle que le détourage doit épargner. */
  function subjectOnWhite(): Rgba {
    const img: Rgba = blank(9, 9);
    for (let y: number = 0; y < 9; y++) {
      for (let x: number = 0; x < 9; x++) put(img, x, y, 255, 255, 255, 255);
    }
    // Anneau noir de (2,2) à (6,6), intérieur laissé blanc.
    for (let y: number = 2; y <= 6; y++) {
      for (let x: number = 2; x <= 6; x++) {
        const onRing: boolean = x === 2 || y === 2 || x === 6 || y === 6;
        if (onRing) put(img, x, y, 10, 10, 10, 255);
      }
    }
    return img;
  }

  it("retire le fond blanc atteignable depuis les bords", () => {
    const img: Rgba = subjectOnWhite();
    const removed: number = floodBackground(img);
    expect(removed).toBeGreaterThan(0);
    expect(alphaAt(img, 0, 0)).toBe(0);
    expect(alphaAt(img, 8, 8)).toBe(0);
  });

  it("ÉPARGNE une poche claire enfermée dans le dessin", () => {
    // Le piège classique du détourage par couleur : traiter « tout pixel clair »
    // mange les reflets et les yeux. Déjà payé une fois par le projet (ADR-050).
    const img: Rgba = subjectOnWhite();
    floodBackground(img);
    expect(alphaAt(img, 4, 4)).toBe(255); // cœur de la poche, intact
    expect(alphaAt(img, 2, 2)).toBe(255); // contour noir, intact
  });

  it("ne touche pas un sujet sans fond clair", () => {
    const img: Rgba = blank(5, 5);
    for (let y: number = 0; y < 5; y++) for (let x: number = 0; x < 5; x++) put(img, x, y, 30, 40, 50, 255);
    expect(floodBackground(img)).toBe(0);
  });

  it("est sans effet sur une image DÉJÀ détourée", () => {
    // C'est ce qui permet de l'appliquer sans condition : un PNG à fond
    // transparent traverse l'étape inchangé.
    const img: Rgba = blank(7, 7);
    for (let y: number = 2; y <= 4; y++) for (let x: number = 2; x <= 4; x++) put(img, x, y, 20, 20, 20, 255);
    expect(floodBackground(img)).toBe(0);
    expect(alphaAt(img, 3, 3)).toBe(255);
  });

  it("respecte le seuil : un gris moyen n'est pas du fond", () => {
    const img: Rgba = blank(4, 4);
    for (let y: number = 0; y < 4; y++) for (let x: number = 0; x < 4; x++) put(img, x, y, 150, 150, 150, 255);
    expect(floodBackground(img, BACKGROUND_MIN)).toBe(0);
    expect(floodBackground(img, 100)).toBe(16);
  });

  it("suit le fond dans une échancrure, jusqu'au fond du creux", () => {
    // Un fond en U doit être vidé entièrement : le remplissage progresse, il ne
    // se contente pas d'un anneau au bord de l'image.
    const img: Rgba = blank(7, 5);
    for (let y: number = 0; y < 5; y++) for (let x: number = 0; x < 7; x++) put(img, x, y, 255, 255, 255, 255);
    for (let y: number = 0; y < 4; y++) { put(img, 2, y, 0, 0, 0, 255); put(img, 4, y, 0, 0, 0, 255); }
    floodBackground(img);
    expect(alphaAt(img, 3, 0)).toBe(0); // entre les deux murs, ouvert par le haut
    expect(alphaAt(img, 3, 3)).toBe(0); // fond du creux, atteint en descendant
  });
});

describe("isFringe — distinguer la frange du dessin clair", () => {
  /** Bande horizontale : [vide] [bord clair] [intérieur] — on décide du bord. */
  function strip(edge: readonly [number, number, number], inner: readonly [number, number, number]): Rgba {
    const img: Rgba = blank(4, 1);
    put(img, 1, 0, edge[0], edge[1], edge[2], 255);
    put(img, 2, 0, inner[0], inner[1], inner[2], 255);
    put(img, 3, 0, inner[0], inner[1], inner[2], 255);
    return img;
  }

  it("retient un pixel clair posé devant un contour NOIR", () => {
    // La frange typique : un dégradé vers le blanc qui borde le trait noir.
    expect(isFringe(strip([250, 250, 250], [12, 12, 12]), 1, 0)).toBe(true);
  });

  it("ÉPARGNE un pixel clair posé devant un dessin AUSSI clair", () => {
    // Le vrai défaut trouvé sur le troll et le chef de guerre : peau gris-bleu
    // et lame claire étaient rongées couche après couche, sans jamais s'épuiser.
    expect(isFringe(strip([200, 205, 210], [198, 203, 208]), 1, 0)).toBe(false);
  });

  it("épargne un pixel clair devant un dessin PLUS clair encore", () => {
    expect(isFringe(strip([180, 180, 180], [230, 230, 230]), 1, 0)).toBe(false);
  });

  it("ne touche jamais un pixel sombre, même isolé", () => {
    expect(isFringe(strip([20, 20, 20], [200, 200, 200]), 1, 0)).toBe(false);
  });

  it("retire un éclat clair sans rien derrière lui", () => {
    // Un ou deux pixels flottants, restes de sélection : jamais du dessin.
    const img: Rgba = blank(3, 1);
    put(img, 1, 0, 245, 245, 245, 255);
    expect(isFringe(img, 1, 0)).toBe(true);
  });

  it("exige un écart NET, pas une différence de bruit", () => {
    // Sans marge, le grain du JPEG suffirait à déclarer « frange » et l'érosion
    // repartirait pour un tour à chaque passe.
    expect(isFringe(strip([204, 204, 204], [200, 200, 200]), 1, 0)).toBe(false);
    expect(isFringe(strip([215, 215, 215], [200, 200, 200]), 1, 0)).toBe(true);
  });
});

describe("stripFringe — convergence", () => {
  it("s'arrête sur un sujet CLAIR au lieu de le ronger jusqu'au bout", () => {
    // Le test de non-régression du défaut troll/warlord : un disque pâle bordé
    // d'une frange plus pâle encore. Seule la frange doit partir.
    const img: Rgba = blank(11, 11);
    for (let y: number = 0; y < 11; y++) {
      for (let x: number = 0; x < 11; x++) {
        const d: number = Math.hypot(x - 5, y - 5);
        if (d <= 3) put(img, x, y, 195, 200, 205, 255);      // sujet clair
        else if (d <= 4.5) put(img, x, y, 250, 250, 250, 255); // frange plus claire
      }
    }
    const before: number = [...img.data].filter((_, i) => i % 4 === 3 && img.data[i] !== 0).length;
    stripFringe(img);
    const after: number = [...img.data].filter((_, i) => i % 4 === 3 && img.data[i] !== 0).length;
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
    expect(alphaAt(img, 5, 5)).toBe(255); // cœur du sujet intact
    expect(alphaAt(img, 5, 2)).toBe(255); // bord du sujet clair, conservé
  });
});

describe("isFringe — halo blanc uniforme", () => {
  it("retire un halo à la couleur du fond, même adossé à du blanc", () => {
    // Cas d'une sélection dure sous Photoshop : le halo est opaque et uniforme,
    // donc chaque couche ressemble à la suivante et la règle du contraste seule
    // ne mordrait jamais dedans. `floodBackground` l'ôte en amont dans la chaîne,
    // mais `stripFringe` doit rester correcte utilisée seule.
    const img: Rgba = blank(5, 1);
    put(img, 1, 0, 252, 252, 252, 255);
    put(img, 2, 0, 252, 252, 252, 255);
    put(img, 3, 0, 15, 15, 15, 255);
    expect(isFringe(img, 1, 0)).toBe(true);
    stripFringe(img);
    expect(alphaAt(img, 1, 0)).toBe(0);
    expect(alphaAt(img, 2, 0)).toBe(0);
    expect(alphaAt(img, 3, 0)).toBe(255); // le trait noir survit
  });
});

describe("findHoles / fillHoles", () => {
  /** Un anneau de trait noir sur fond blanc : le creux au centre est enfermé. */
  function ring(): Rgba {
    const img: Rgba = { width: 40, height: 40, data: new Uint8Array(40 * 40 * 4).fill(255) };
    const set = (x: number, y: number, v: number): void => {
      const i: number = (y * 40 + x) * 4;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    };
    for (let y: number = 10; y <= 30; y++) for (let x: number = 10; x <= 30; x++) set(x, y, 20);
    for (let y: number = 15; y <= 25; y++) for (let x: number = 15; x <= 25; x++) set(x, y, 255);
    return img;
  }

  it("compte le fond EXTÉRIEUR tant qu'il n'a pas été retiré", () => {
    // D'où l'ordre imposé : sans remplissage préalable, le fond de l'image est
    // lui aussi une composante claire, et le bouchage l'emporterait avec le reste
    // — sans effet visible ici, mais le compte rendu à l'opérateur serait faux.
    expect(findHoles(ring()).length).toBe(2);
  });

  it("recense le creux enfermé une fois le fond retiré", () => {
    const img: Rgba = ring();
    floodBackground(img);
    const holes: Hole[] = findHoles(img);
    expect(holes.length).toBe(1);
    expect(holes[0]!.size).toBe(11 * 11);
    expect(holes[0]!.x0).toBe(15);
    expect(holes[0]!.y1).toBe(25);
  });

  it("NE MUTE PAS l'image : recenser n'est pas boucher", () => {
    // Le piège d'ADR-050 — la passe des poches enfermées mangeait les reflets.
    // Le recensement doit pouvoir s'exécuter à chaque fois sans rien casser.
    const img: Rgba = ring();
    floodBackground(img);
    const before: Uint8Array = img.data.slice();
    findHoles(img);
    expect(img.data).toEqual(before);
  });

  it("bouche le creux et RIEN d'autre", () => {
    const img: Rgba = ring();
    floodBackground(img);
    const px: number = fillHoles(img, findHoles(img));
    expect(px).toBe(11 * 11);
    expect(img.data[(20 * 40 + 20) * 4 + 3]).toBe(0);   // le creux
    expect(img.data[(12 * 40 + 20) * 4 + 3]).toBe(255); // le trait reste
  });

  it("ne touche pas aux poches qu'on ne lui donne PAS", () => {
    // Boucher par boîte englobante emporterait la voisine : deux creux d'un même
    // fer de hache se chevauchent en boîte sans se toucher en pixels.
    const img: Rgba = ring();
    // Deuxième creux, dans la même bande horizontale que le premier.
    for (let y: number = 18; y <= 22; y++) {
      for (let x: number = 27; x <= 29; x++) {
        const i: number = (y * 40 + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = 255;
      }
    }
    floodBackground(img);
    const holes: Hole[] = findHoles(img).sort((a, b) => b.size - a.size);
    expect(holes.length).toBe(2);
    fillHoles(img, [holes[0]!]);
    expect(img.data[(20 * 40 + 20) * 4 + 3]).toBe(0);   // le grand, bouché
    expect(img.data[(20 * 40 + 28) * 4 + 3]).toBe(255); // le petit, intact
  });
});

describe("stack", () => {
  function solid(w: number, h: number, v: number): Rgba {
    const img: Rgba = { width: w, height: h, data: new Uint8Array(w * h * 4).fill(255) };
    for (let i: number = 0; i < w * h; i++) { img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; }
    return img;
  }

  it("empile les images dans l'ordre reçu", () => {
    const out: Rgba = stack([solid(4, 2, 10), solid(4, 3, 20)]);
    expect(out.width).toBe(4);
    expect(out.height).toBe(5);
    expect(out.data[0]).toBe(10);
    expect(out.data[(2 * 4) * 4]).toBe(20);
  });

  it("aligne à gauche et complète en BLANC", () => {
    // Un remplissage transparent serait pris pour du dessin déjà découpé par le
    // détourage, qui laisserait une frange le long du raccord.
    const out: Rgba = stack([solid(2, 1, 10), solid(5, 1, 20)]);
    expect(out.width).toBe(5);
    expect(out.data[(0 * 5 + 0) * 4]).toBe(10);       // la source étroite
    expect(out.data[(0 * 5 + 4) * 4]).toBe(255);      // le complément
    expect(out.data[(0 * 5 + 4) * 4 + 3]).toBe(255);  // opaque, pas transparent
  });

  it("rend l'image seule inchangée", () => {
    const one: Rgba = solid(3, 3, 42);
    expect(stack([one])).toEqual(one);
  });
});
