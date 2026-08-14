// ============================================================
// render/components/tileContent.ts — Composition VERTICALE du contenu d'une tuile.
//
// PUR : aucune dépendance Phaser ni DOM, donc testable.
//
// POURQUOI un module à part. `uiTile` empilait son contenu à taille FIXE (icône
// plafonnée à 96) dans une boîte calculée d'après l'écran. Tout l'écart partait
// donc en vide : mesuré sur la tuile « Histoire » du Campement, 150 unités de
// contenu dans 350 de tuile, soit 100 de vide en haut ET en bas — 57 % de la
// surface. La jauge d'avancement, elle, était ancrée en bas de la tuile et
// flottait 82 unités sous le texte.
//
// La règle tient en une phrase : le contenu REMPLIT la boîte qu'on lui donne,
// l'icône absorbant la place restante jusqu'à sa résolution native.
// ============================================================

export interface TileContentInput {
  w: number;
  h: number;
  /** Hauteur MESURÉE du titre rendu — les polices sont remontées sur petit
   *  écran (ADR-015), une hauteur supposée ferait déborder le texte. */
  titleH: number;
  /** Hauteur mesurée du sous-titre, 0 s'il n'y en a pas. */
  subH: number;
  /** Résolution native de l'icône : au-delà, l'agrandir ne fait que la flouter. */
  maxGlyph: number;
  /** Hauteur réservée en pied (jauge d'avancement), 0 s'il n'y en a pas. */
  footerH: number;
  /**
   * Marge intérieure MINIMALE imposée par l'habillage (`uiPanelPad`).
   *
   * La marge proportionnelle seule vaut 15 sur une tuile de 167, alors que la
   * volute d'angle du panneau ouvragé en occupe 22 : le contenu se posait dessus.
   */
  minPad?: number;
}

/** Positions, relatives au CENTRE de la tuile (repère d'un container Phaser). */
export interface TileContentBox {
  pad: number;
  gap: number;
  glyph: number;
  /** Centre de l'icône (les images Phaser ont pour origine leur centre). */
  iconCy: number;
  /** Hauts du titre et du sous-titre (textes posés en origine 0,5 / 0). */
  titleTop: number;
  subTop: number;
  /** Haut de la jauge de pied. */
  footerTop: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Répartit icône, titre, sous-titre et pied dans une tuile de `w`×`h`.
 *
 * La marge et l'écart sont PROPORTIONNELS à la tuile, bornés pour qu'une petite
 * tuile garde de l'air et qu'une grande ne se creuse pas. L'icône prend ensuite
 * tout ce qui reste, bornée par sa résolution native et par la largeur.
 *
 * Si les seuls textes dépassent déjà la zone utile, l'icône tombe à zéro et le
 * débordement est celui des textes : c'est alors la BOÎTE qui est trop petite,
 * et c'est au calcul de disposition (`hubLayout`, `gridLayout`) de la corriger.
 */
export function composeTile(o: TileContentInput): TileContentBox {
  const pad: number = Math.max(clamp(o.h * 0.09, 8, 22), o.minPad ?? 0);
  const gap: number = clamp(o.h * 0.035, 4, 10);
  const subGap: number = gap * 0.5;

  const zoneTop: number = -o.h / 2 + pad;
  const zoneH: number = Math.max(0, o.h - 2 * pad);

  // La jauge appartient au BLOC, elle n'est pas ancrée au bas de la tuile.
  // Ancrée, elle s'éloignait du texte de tout le vide résiduel — 82 unités
  // mesurées sur la tuile « Histoire ». Deux règles concurrentes (« bloc centré »
  // et « pied en bas ») ne peuvent pas tenir ensemble : il n'en reste qu'une.
  const footerBlock: number = o.footerH > 0 ? gap + o.footerH : 0;
  const textH: number = o.titleH + (o.subH > 0 ? subGap + o.subH : 0);
  // Plafonds de PROPORTION en plus du plafond de résolution : depuis que le
  // panneau porte le cadre ouvragé du pack, c'est lui qui donne sa présence à la
  // tuile, et une icône qui occupait 55 % de la hauteur écrasait tout le reste.
  const glyph: number = Math.max(0, Math.min(
    o.maxGlyph, o.w * 0.5, o.h * 0.42, zoneH - textH - footerBlock - gap,
  ));

  const blockH: number = glyph + gap + textH + footerBlock;
  const top: number = zoneTop + (zoneH - blockH) / 2;

  return {
    pad, gap, glyph,
    iconCy: top + glyph / 2,
    titleTop: top + glyph + gap,
    subTop: top + glyph + gap + o.titleH + subGap,
    footerTop: top + blockH - o.footerH,
  };
}
