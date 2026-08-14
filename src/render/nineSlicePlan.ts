// ============================================================
// render/nineSlicePlan.ts — Où découper une planche 3×3 pour en faire un
// nine-slice contigu.
//
// PUR : aucune dépendance Phaser, DOM ni canvas. C'est tout l'intérêt — la
// géométrie est la partie qui se trompe, et c'est donc elle qui doit être
// testée. La peinture sur canvas (`uiSkin.ts`) n'est qu'une boucle de
// `drawImage` au-dessus de ce plan.
//
// Historique, pour que personne ne refasse le chemin : la première version
// vivait entièrement dans le code canvas et a accumulé quatre mécanismes
// concurrents (rognage, réduction, cadre commun, prélèvement « en
// prolongement »), chacun ajouté pour corriger un artefact vu à l'écran. Sans
// test, chaque correction en révélait un autre. Le modèle ci-dessous en garde
// UN seul, et la continuité y est vraie par construction plutôt que constatée.
// ============================================================

/** Largeur de la bande centrale prélevée : c'est elle que le nine-slice étire,
 *  8 px suffisent et gardent la texture minuscule. */
export const MID: number = 8;

/** Marge de sécurité au-dessus de la profondeur du dessin d'angle, pour ne pas
 *  rogner pile sur le dernier pixel du contour. */
const DETAIL_MARGIN: number = 4;

/** Bornes opaques des 9 pièces, unifiées par rangée et par colonne.
 *  Unifiées, car les pièces d'une même rangée n'ont pas toutes la même hauteur
 *  (mesuré : 43 px pour la pièce bas-milieu du parchemin contre 45 pour ses
 *  voisines). Sans repère commun, le contour se décale entre coin et bord. */
export interface SheetFrame {
  left: readonly [number, number, number];
  right: readonly [number, number, number];
  top: readonly [number, number, number];
  bottom: readonly [number, number, number];
}

/**
 * Axes le long desquels le nine-slice ÉTIRERA la pièce à l'affichage.
 *
 * Ce n'est pas une décoration du plan : une pièce étirée le long d'un axe doit
 * être CONSTANTE le long de cet axe, sinon le moindre pixel divergent devient une
 * traînée large de tout le panneau (cf. `nineSliceFlatten.ts`).
 */
export type Stretch = "none" | "x" | "y" | "both";

/** Un `drawImage` : rectangle source → rectangle destination, sans mise à l'échelle. */
export interface PieceRect {
  sx: number; sy: number; sw: number; sh: number;
  dx: number; dy: number;
  stretch: Stretch;
}

/** Marges de nine-slice, potentiellement différentes sur chaque côté : les pièces
 *  du pack ne sont pas carrées (45 de large pour 47 de haut). */
export interface Insets {
  left: number; right: number; top: number; bottom: number;
}

export interface NineSlicePlan {
  /** Texture assemblée, AVANT réduction. */
  fullW: number;
  fullH: number;
  /** Réduction appliquée ensuite (1 = aucune). */
  scale: number;
  /** Marges de la texture FINALE, à passer à `scene.add.nineslice`. */
  insets: Insets;
  /** Les 9 découpes, dans l'ordre rangée puis colonne. */
  rects: PieceRect[];
}

/** Bornes opaques des 3 pièces d'une BANDE, hauteur unifiée. */
export interface StripFrame {
  left: readonly [number, number, number];
  right: readonly [number, number, number];
  top: number;
  bottom: number;
}

export interface StripPlan {
  fullW: number;
  fullH: number;
  /** `top`/`bottom` valent 0 : Phaser traite alors la texture en TROIS tranches. */
  insets: Insets;
  rects: PieceRect[];
}

/**
 * Bande à trois tranches — jauges, rubans : deux embouts et un corps étirable.
 *
 * Deux différences assumées avec `planNineSlice` :
 *
 * - les embouts ne sont JAMAIS rognés. Sur une jauge, l'embout n'entoure pas un
 *   remplissage, il EST le dessin ; le rogner reviendrait à le supprimer.
 * - le corps est prélevé au centre de la pièce du MILIEU de la planche, et non en
 *   prolongement d'un embout. Sur une planche 3×3 de panneau, la pièce du milieu
 *   est un remplissage sans bord et ne raccorderait pas ; sur une bande, c'est au
 *   contraire la pièce que l'artiste a dessinée pour se répéter entre les embouts.
 */
export function planStrip(frame: StripFrame): StripPlan {
  const wL: number = frame.right[0]! - frame.left[0]!;
  const wR: number = frame.right[2]! - frame.left[2]!;
  const h: number = frame.bottom - frame.top;
  const midCentre: number = Math.round((frame.left[1]! + frame.right[1]!) / 2 - MID / 2);

  return {
    fullW: wL + MID + wR,
    fullH: h,
    insets: { left: wL, right: wR, top: 0, bottom: 0 },
    rects: [
      { sx: frame.left[0]!, sy: frame.top, sw: wL, sh: h, dx: 0, dy: 0, stretch: "none" },
      { sx: midCentre, sy: frame.top, sw: MID, sh: h, dx: wL, dy: 0, stretch: "x" },
      { sx: frame.right[2]! - wR, sy: frame.top, sw: wR, sh: h, dx: wL + MID, dy: 0, stretch: "none" },
    ],
  };
}

/**
 * Ramène des marges à ce qu'un élément de `w`×`h` peut réellement loger.
 *
 * Deux marges opposées ne tiennent pas dans une dimension plus petite que leur
 * somme : le nine-slice se replie alors sur lui-même — coins écrasés, bande du
 * milieu de largeur négative. Constaté sur le menu de tour, dont les rangées font
 * 30 à 44 unités de haut pour des marges de 22 : l'ornement d'angle du panneau
 * ouvragé s'y écrasait en bouillie.
 *
 * On rogne alors PROPORTIONNELLEMENT, pour que l'élément perde du dessin des deux
 * côtés à parts égales plutôt que de le perdre tout entier d'un seul.
 */
export function fitInsets(insets: Insets, w: number, h: number): Insets {
  const fit = (a: number, b: number, avail: number): [number, number] => {
    const room: number = Math.max(0, avail - 2);
    if (a + b <= room) return [a, b];
    const k: number = a + b === 0 ? 0 : room / (a + b);
    return [Math.floor(a * k), Math.floor(b * k)];
  };
  const [left, right] = fit(insets.left, insets.right, w);
  const [top, bottom] = fit(insets.top, insets.bottom, h);
  return { left, right, top, bottom };
}

/**
 * Marges effectives d'un nine-slice : bornées par la boîte affichée ET par la
 * TEXTURE elle-même.
 *
 * La seconde borne manquait. Les planches du pack ne composent pas toutes à la
 * même taille — `btn-big-blue` donne 52×52 (marges 22), sa variante enfoncée
 * 48×41 (marges 22 et 16), parce que le bouton enfoncé est plus plat. Poser
 * 22 de marge haute ET basse sur une texture de 41 fait se recouvrir les
 * tranches : la plaque rendait un damier noir à chaque appui.
 *
 * Un nine-slice ne peut jamais réserver plus de dessin qu'il n'en possède.
 */
export function sliceInsets(
  insets: Insets, box: { w: number; h: number }, tex: { w: number; h: number },
): Insets {
  return fitInsets(insets, Math.min(box.w, tex.w), Math.min(box.h, tex.h));
}

/**
 * Décide où découper, à partir d'UNE mesure : la profondeur du dessin d'angle.
 *
 * Un coin doit contenir TOUT son dessin, sinon la courbe est tronquée et ne
 * rejoint pas le bord droit. Deux cas, et un seul critère pour trancher :
 *
 * - le dessin est court (parchemin : 3 px) → on ROGNE à la marge visée, et l'art
 *   garde sa densité 1:1 ;
 * - le dessin couvre la pièce (boutons : 37 px sur une pièce de 45) → on garde la
 *   pièce ENTIÈRE et c'est la texture qui est réduite. Rogner y couperait
 *   forcément le dessin, quel que soit le réglage.
 *
 * C'est le seul embranchement du module, et il est piloté par une mesure, pas
 * par un mode déclaré à la main planche par planche.
 */
export function planNineSlice(
  frame: SheetFrame, detailDepth: number, targetInset: number,
): NineSlicePlan {
  const pieceW: number[] = [0, 1, 2].map(c => frame.right[c]! - frame.left[c]!);
  const pieceH: number[] = [0, 1, 2].map(r => frame.bottom[r]! - frame.top[r]!);

  const croppable: boolean = detailDepth + DETAIL_MARGIN <= targetInset;

  // Largeurs des trois colonnes et hauteurs des trois rangées de l'assemblage.
  const cw: number[] = croppable
    ? [targetInset, MID, targetInset]
    : [pieceW[0]!, MID, pieceW[2]!];
  const rh: number[] = croppable
    ? [targetInset, MID, targetInset]
    : [pieceH[0]!, MID, pieceH[2]!];

  const fullW: number = cw[0]! + cw[1]! + cw[2]!;
  const fullH: number = rh[0]! + rh[1]! + rh[2]!;

  // Réduction : ramène le plus grand coin sur la marge visée, pour que deux
  // marges tiennent dans le plus petit élément habillé.
  const biggest: number = Math.max(cw[0]!, cw[2]!, rh[0]!, rh[2]!);
  const scale: number = croppable ? 1 : targetInset / biggest;

  const dx: number[] = [0, cw[0]!, cw[0]! + cw[1]!];
  const dy: number[] = [0, rh[0]!, rh[0]! + rh[1]!];

  // Où prélever la bande du milieu — et c'est la branche qui décide, pas un
  // réglage :
  //
  // - ROGNÉ : contiguë au coin, dans la MÊME pièce. La bande du haut commence
  //   exactement là où finit le coin haut-gauche, donc la continuité est vraie
  //   par construction. Prélevée ailleurs, elle ne raccorde pas — mesuré à
  //   l'écran sur le parchemin, le bord du remplissage sautait de 9 à 7 px.
  // - PIÈCE ENTIÈRE : il ne RESTE rien de contigu. Le coin occupe déjà toute sa
  //   pièce, et « prolonger » revient à prélever dans la gouttière transparente
  //   qui sépare les pièces de la planche. C'est exactement ce qui rendait les
  //   planches enfoncées (`btn-*-pressed`, dessin d'angle sur 19 px) noires à
  //   l'appui. On prélève alors dans la pièce que l'artiste a dessinée pour ça :
  //   celle du milieu de la planche, en son centre.
  const midX: number = croppable
    ? frame.left[0]! + cw[0]!
    : Math.round((frame.left[1]! + frame.right[1]!) / 2 - MID / 2);
  const midY: number = croppable
    ? frame.top[0]! + rh[0]!
    : Math.round((frame.top[1]! + frame.bottom[1]!) / 2 - MID / 2);

  const rects: PieceRect[] = [];
  for (let r: number = 0; r < 3; r++) {
    for (let c: number = 0; c < 3; c++) {
      const sx: number = c === 0 ? frame.left[0]!
        : c === 1 ? midX
        : frame.right[2]! - cw[2]!;
      const sy: number = r === 0 ? frame.top[0]!
        : r === 1 ? midY
        : frame.bottom[2]! - rh[2]!;
      // La colonne du milieu s'étire en X, la rangée du milieu en Y — les quatre
      // coins ne s'étirent jamais et gardent donc l'art intact.
      const stretch: Stretch = c === 1
        ? (r === 1 ? "both" : "x")
        : (r === 1 ? "y" : "none");
      rects.push({ sx, sy, sw: cw[c]!, sh: rh[r]!, dx: dx[c]!, dy: dy[r]!, stretch });
    }
  }

  return {
    fullW, fullH, scale,
    insets: {
      left: Math.round(cw[0]! * scale),
      right: Math.round(cw[2]! * scale),
      top: Math.round(rh[0]! * scale),
      bottom: Math.round(rh[2]! * scale),
    },
    rects,
  };
}
