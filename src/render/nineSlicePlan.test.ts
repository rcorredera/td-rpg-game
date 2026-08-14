import { describe, expect, it } from "vitest";
import {
  fitInsets, MID, planNineSlice, planStrip, sliceInsets, type SheetFrame,
} from "./nineSlicePlan";

// ============================================================
// Ce fichier existe parce que son absence a coûté cinq allers-retours de
// playtest : chaque défaut de découpe (coin tronqué, contour dédoublé, arc
// détaché du bord) n'était visible qu'à l'œil, sur une capture, APRÈS livraison.
// Les propriétés ci-dessous sont celles qu'on vérifiait alors à la main.
// ============================================================

/** Parchemin, mesuré sur la planche : pièces de 52×44, dessin d'angle très court. */
const PAPER: SheetFrame = {
  left: [12, 128, 256], right: [64, 192, 308],
  top: [20, 128, 256], bottom: [64, 192, 301],
};
/** Bouton, mesuré : pièces de 45×47, dessin d'angle étalé sur 37 px. */
const BUTTON: SheetFrame = {
  left: [19, 128, 256], right: [64, 192, 301],
  top: [17, 128, 256], bottom: [64, 192, 303],
};
/**
 * Bouton ENFONCÉ (`btn-big-blue-pressed.png`), relevé sur la planche : le
 * bouton y est plus plat (36 px de haut en rangée 0 contre 49 en rangée 2) et
 * son dessin d'angle court sur 19 px — donc la pièce est gardée entière.
 *
 * C'est ce cas qui manquait au fichier, et il valait une plaque noire à chaque
 * appui : la bande du milieu était prélevée à x=64, dans la gouttière vide qui
 * sépare la colonne 0 (14→64) de la colonne 1 (128→192).
 */
const BUTTON_PRESSED: SheetFrame = {
  left: [14, 128, 256], right: [64, 192, 306],
  top: [28, 128, 256], bottom: [64, 192, 305],
};

/** Les trois planches réelles, avec la profondeur d'angle mesurée sur chacune. */
const PLANCHES = [
  ["parchemin", PAPER, 3],
  ["bouton", BUTTON, 37],
  ["bouton enfoncé", BUTTON_PRESSED, 19],
] as const;

describe("plan de découpe d'un nine-slice", () => {
  it("rogne à 1:1 quand le dessin d'angle est court", () => {
    // Parchemin : 3 px de dessin, marge visée 16 → il tient, on garde la densité.
    const p = planNineSlice(PAPER, 3, 16);
    expect(p.scale).toBe(1);
    expect(p.insets.left).toBe(16);
    expect(p.fullW).toBe(16 + MID + 16);
  });

  it("garde la pièce entière et réduit quand le dessin couvre le coin", () => {
    // Bouton : 37 px de dessin pour une marge visée de 22. Rogner le couperait ;
    // on garde donc la pièce (45×47) et c'est la texture qui rétrécit.
    const p = planNineSlice(BUTTON, 37, 22);
    expect(p.scale).toBeLessThan(1);
    expect(p.fullW).toBe(45 + MID + 45);
    expect(p.fullH).toBe(47 + MID + 47);
  });

  it("ramène toujours les marges à la taille visée", () => {
    // C'est CE contrat qui permet aux boutons de rester petits : sans lui, la
    // marge suivait l'art et j'ai fini par grossir les boutons à 76 pour
    // compenser — en tordant tout le reste de l'interface au passage.
    for (const [nom, frame, detail] of PLANCHES) {
      for (const cible of [12, 16, 22, 24]) {
        const p = planNineSlice(frame, detail, cible);
        for (const [cote, v] of Object.entries(p.insets)) {
          expect(v, `${nom} : ${cote} pour une cible de ${cible}`).toBeLessThanOrEqual(cible);
        }
      }
    }
  });

  it("prend chaque bande CONTIGUË au coin quand le coin est rogné", () => {
    // Une bande prélevée ailleurs (au centre de la pièce du milieu) ne raccorde
    // pas : mesuré à l'écran, le bord du remplissage sautait de 9 à 7 px entre
    // le coin et la bande, ce qui se lit comme un arc de coin détaché une fois
    // la bande étirée.
    //
    // La propriété ne vaut QUE si le coin est rogné : il reste alors du dessin
    // après lui dans la même pièce. Quand la pièce est gardée entière, il n'y a
    // par définition plus rien de contigu — la propriété devient impossible, et
    // c'est le test suivant qui prend le relais.
    for (const [nom, frame, detail] of PLANCHES) {
      const p = planNineSlice(frame, detail, 22);
      if (p.scale !== 1) continue; // pièce entière : cf. test suivant
      const at = (r: number, c: number) => p.rects[r * 3 + c]!;

      for (const r of [0, 1, 2]) {
        // bande du milieu = juste après le coin gauche, même bande verticale
        expect(at(r, 1).sx, `${nom}, rangée ${r} : bande décollée du coin gauche`)
          .toBe(at(r, 0).sx + at(r, 0).sw);
        expect(at(r, 1).sy, `${nom}, rangée ${r} : bande décalée verticalement`).toBe(at(r, 0).sy);
      }
      for (const c of [0, 1, 2]) {
        expect(at(1, c).sy, `${nom}, colonne ${c} : bande décollée du coin haut`)
          .toBe(at(0, c).sy + at(0, c).sh);
        expect(at(1, c).sx, `${nom}, colonne ${c} : bande décalée horizontalement`).toBe(at(0, c).sx);
      }
    }
  });

  it("prélève chaque découpe DANS une pièce, jamais dans la gouttière", () => {
    // LA propriété universelle, celle qui vaut pour les deux branches — et celle
    // dont l'absence a coûté un bug visible : sur les planches enfoncées, le coin
    // occupe toute sa pièce, donc « prolonger le coin » prélevait à x=64, dans le
    // vide transparent qui sépare la colonne 0 (14→64) de la colonne 1 (128→192).
    // Résultat à l'écran : une plaque noire à chaque appui de bouton.
    //
    // Contrôler seulement les bornes EXTÉRIEURES de la planche ne suffit pas :
    // la gouttière est à l'intérieur de ces bornes.
    for (const [nom, frame, detail] of PLANCHES) {
      for (const cible of [12, 16, 22, 24]) {
        const p = planNineSlice(frame, detail, cible);
        for (const q of p.rects) {
          const colonne = [0, 1, 2].some(c => q.sx >= frame.left[c]! && q.sx + q.sw <= frame.right[c]!);
          const rangee = [0, 1, 2].some(r => q.sy >= frame.top[r]! && q.sy + q.sh <= frame.bottom[r]!);
          expect(colonne, `${nom} (cible ${cible}) : découpe x ${q.sx}→${q.sx + q.sw} hors pièce`).toBe(true);
          expect(rangee, `${nom} (cible ${cible}) : découpe y ${q.sy}→${q.sy + q.sh} hors pièce`).toBe(true);
        }
      }
    }
  });

  it("assemble sans trou ni recouvrement", () => {
    // Les 9 découpes doivent paver exactement la texture : un trou laisse du
    // transparent au milieu du panneau, un recouvrement double le contour.
    for (const [, frame, detail] of PLANCHES) {
      const p = planNineSlice(frame, detail, 22);
      const couvert = new Set<string>();
      for (const q of p.rects) {
        for (let y = q.dy; y < q.dy + q.sh; y++) {
          for (let x = q.dx; x < q.dx + q.sw; x++) {
            const cle = `${x},${y}`;
            expect(couvert.has(cle), `recouvrement en ${cle}`).toBe(false);
            couvert.add(cle);
          }
        }
      }
      expect(couvert.size, "trou dans l'assemblage").toBe(p.fullW * p.fullH);
    }
  });

  it("ramène les marges à ce que l'élément peut loger", () => {
    // Le nine-slice se replie sur lui-même dès que deux marges opposées dépassent
    // la dimension. Constaté en jeu : le menu de tour pose des rangées de 30 à 44
    // unités de haut, contre des marges de 22 — l'ornement d'angle du panneau
    // ouvragé s'y écrasait. La garantie vaut pour TOUT élément habillé, y compris
    // ceux qu'on n'a pas encore écrits.
    const voulu = { left: 22, right: 22, top: 22, bottom: 22 };
    for (const [w, h] of [[230, 30], [230, 44], [230, 58], [44, 44], [12, 9], [400, 300]] as const) {
      const i = fitInsets(voulu, w, h);
      expect(i.left + i.right, `largeur ${w}`).toBeLessThan(w);
      expect(i.top + i.bottom, `hauteur ${h}`).toBeLessThan(h);
      for (const [cote, v] of Object.entries(i)) {
        expect(v, `${cote} négatif`).toBeGreaterThanOrEqual(0);
        expect(v, `${cote} au-delà du voulu`).toBeLessThanOrEqual(22);
      }
    }
  });

  it("rogne les deux côtés à parts égales", () => {
    // Rogner d'un seul côté déplacerait le dessin : l'élément perdrait sa volute
    // gauche en gardant la droite, ce qui se lit comme un cadre de travers.
    const i = fitInsets({ left: 22, right: 22, top: 22, bottom: 22 }, 230, 30);
    expect(i.top).toBe(i.bottom);
    expect(i.left).toBe(22);
  });

  it("ne touche à rien quand tout tient", () => {
    const voulu = { left: 22, right: 22, top: 22, bottom: 22 };
    expect(fitInsets(voulu, 400, 300)).toEqual(voulu);
  });

  it("compose une bande sans rogner ses embouts", () => {
    // Jauge du pack, mesurée : embouts de 10, corps au milieu de la planche.
    // Un embout de jauge n'entoure pas un remplissage, il EST le dessin — le
    // rogner comme un coin de panneau reviendrait à le supprimer.
    const b = planStrip({ left: [6, 130, 258], right: [16, 182, 268], top: 24, bottom: 38 });
    expect(b.insets).toEqual({ left: 10, right: 10, top: 0, bottom: 0 });
    expect(b.fullW).toBe(10 + MID + 10);
    expect(b.fullH).toBe(14);
    // `top`/`bottom` à zéro : c'est ce qui fait traiter la texture en TROIS
    // tranches par Phaser, donc étirer le corps sans déformer les embouts.
    expect(b.insets.top).toBe(0);
    expect(b.insets.bottom).toBe(0);
  });

  it("pave la bande sans trou ni recouvrement, et n'étire que son corps", () => {
    const b = planStrip({ left: [6, 130, 258], right: [16, 182, 268], top: 24, bottom: 38 });
    expect(b.rects.map(r => r.stretch)).toEqual(["none", "x", "none"]);
    let x = 0;
    for (const r of b.rects) {
      expect(r.dx, "trou ou recouvrement dans la bande").toBe(x);
      expect(r.dy).toBe(0);
      expect(r.sh).toBe(b.fullH);
      x += r.sw;
    }
    expect(x).toBe(b.fullW);
    // Le corps se prélève au CENTRE de la pièce du milieu : son bord porterait le
    // raccord avec l'embout, qui se répéterait en couture une fois étiré.
    const corps = b.rects[1]!;
    expect(corps.sx + corps.sw / 2).toBeCloseTo((130 + 182) / 2, 0);
  });

  it("ne prélève jamais hors de la planche", () => {
    for (const [, frame, detail] of PLANCHES) {
      const p = planNineSlice(frame, detail, 22);
      for (const q of p.rects) {
        expect(q.sx).toBeGreaterThanOrEqual(frame.left[0]!);
        expect(q.sx + q.sw).toBeLessThanOrEqual(frame.right[2]!);
        expect(q.sy).toBeGreaterThanOrEqual(frame.top[0]!);
        expect(q.sy + q.sh).toBeLessThanOrEqual(frame.bottom[2]!);
      }
    }
  });

  it("ne réserve jamais plus de marge que la texture n'en possède", () => {
    // Cas RÉEL, mesuré : le bouton au repos compose en 52×52 avec 22 de marge,
    // sa variante enfoncée en 48×41. Reposer 22 en haut ET en bas sur 41 px de
    // texture fait se recouvrir les tranches — plaque noire à l'appui. La borne
    // par la BOÎTE affichée (190×61 ici, largement suffisante) ne l'attrape pas :
    // c'est la texture qui est trop petite, pas le bouton.
    const voulu = { left: 22, right: 22, top: 22, bottom: 22 };
    const i = sliceInsets(voulu, { w: 190, h: 61 }, { w: 48, h: 41 });
    expect(i.top + i.bottom, "les tranches se recouvrent").toBeLessThan(41);
    expect(i.left + i.right).toBeLessThan(48);

    // Et la garantie générale : quelles que soient la boîte et la texture, les
    // marges tiennent dans les DEUX.
    for (const tex of [{ w: 48, h: 41 }, { w: 52, h: 52 }, { w: 20, h: 14 }]) {
      for (const box of [{ w: 190, h: 61 }, { w: 30, h: 30 }, { w: 600, h: 400 }]) {
        const f = sliceInsets(voulu, box, tex);
        expect(f.left + f.right).toBeLessThan(Math.min(box.w, tex.w));
        expect(f.top + f.bottom).toBeLessThan(Math.min(box.h, tex.h));
      }
    }
  });
});
