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
export const MID = 8;

/** Marge de sécurité au-dessus de la profondeur du dessin d'angle, pour ne pas
 *  rogner pile sur le dernier pixel du contour. */
const DETAIL_MARGIN = 4;

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

/** Un `drawImage` : rectangle source → rectangle destination, sans mise à l'échelle. */
export interface PieceRect {
  sx: number; sy: number; sw: number; sh: number;
  dx: number; dy: number;
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
  const pieceW = [0, 1, 2].map(c => frame.right[c]! - frame.left[c]!);
  const pieceH = [0, 1, 2].map(r => frame.bottom[r]! - frame.top[r]!);

  const croppable = detailDepth + DETAIL_MARGIN <= targetInset;

  // Largeurs des trois colonnes et hauteurs des trois rangées de l'assemblage.
  const cw = croppable
    ? [targetInset, MID, targetInset]
    : [pieceW[0]!, MID, pieceW[2]!];
  const rh = croppable
    ? [targetInset, MID, targetInset]
    : [pieceH[0]!, MID, pieceH[2]!];

  const fullW = cw[0]! + cw[1]! + cw[2]!;
  const fullH = rh[0]! + rh[1]! + rh[2]!;

  // Réduction : ramène le plus grand coin sur la marge visée, pour que deux
  // marges tiennent dans le plus petit élément habillé.
  const biggest = Math.max(cw[0]!, cw[2]!, rh[0]!, rh[2]!);
  const scale = croppable ? 1 : targetInset / biggest;

  const dx = [0, cw[0]!, cw[0]! + cw[1]!];
  const dy = [0, rh[0]!, rh[0]! + rh[1]!];

  const rects: PieceRect[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      // Chaque bande est prise CONTIGUË au coin qu'elle prolonge : la bande du
      // haut commence exactement là où finit le coin haut-gauche, etc. C'est ce
      // qui rend la continuité vraie par construction — et c'est la propriété
      // que le test vérifie.
      const sx = c === 0 ? frame.left[0]!
        : c === 1 ? frame.left[0]! + cw[0]!
        : frame.right[2]! - cw[2]!;
      const sy = r === 0 ? frame.top[0]!
        : r === 1 ? frame.top[0]! + rh[0]!
        : frame.bottom[2]! - rh[2]!;
      rects.push({ sx, sy, sw: cw[c]!, sh: rh[r]!, dx: dx[c]!, dy: dy[r]! });
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
