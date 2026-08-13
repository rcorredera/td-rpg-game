// ============================================================
// render/uiTheme.ts — Habillage des MENUS, interchangeable (ADR-026).
//
// Le chrome des menus était figé sur une gamme brun/parchemin. Ici, une palette
// est une DONNÉE : en changer une revient à basculer un objet, pas à parcourir
// les écrans.
//
// PORTÉE : uniquement le chrome des menus — fond, panneaux, bordures, textes.
// Les couleurs du champ de bataille (terrain, biomes, familles ennemies) sont un
// autre sujet et vivent dans `palette.ts` / `biomes.ts`. Un thème de menu ne doit
// jamais les toucher : le joueur juge les deux séparément.
//
// PUR : aucune dépendance Phaser ni DOM.
// ============================================================

export interface UiTheme {
  id: string;
  name: string;

  /** Fond d'écran : aplat de base et deux marbrures (claire, sombre). */
  backdrop: number;
  marbleLight: string;
  marbleDark: string;

  /** Panneaux : standard, inactif, bouton secondaire. */
  panel: number;
  panelDim: number;
  btn: number;

  /**
   * Teinte appliquée à l'habillage SOMBRE du pack (`paper-special`).
   *
   * Elle est CLAIRE, et ce n'est pas une coquetterie : `setTint` multiplie. Sur
   * une base crème on teignait vers du sombre ; sur une base ardoise il faut au
   * contraire un multiplicateur proche du blanc, sinon le panneau vire au noir et
   * les volutes dorées disparaissent. Le thème ne redéfinit donc plus la clarté
   * du panneau — le pack la porte — il en nuance la DOMINANTE.
   */
  skinTint: number;

  /** Bordures et accents. */
  accent: number;
  accentSoft: number;
  locked: number;
  lockedFill: number;
  dimBorder: number;
  won: number;

  /** Textes (chaînes CSS). */
  textAccent: string;
  textDim: string;
  textLight: string;
}

/** Braise — l'habillage d'origine : parchemin, bois et or. */
const EMBER: UiTheme = {
  id: "ember", name: "Braise",
  backdrop: 0x1a140e, marbleLight: "rgba(74,58,38,0.10)", marbleDark: "rgba(18,13,9,0.14)",
  panel: 0x6f5c3e, panelDim: 0x50422d, btn: 0x9c8259,
  skinTint: 0xffd9ae,
  accent: 0xc9a227, accentSoft: 0xe8c252,
  locked: 0x4a3f2e, lockedFill: 0x3b3122, dimBorder: 0x6b5a3e, won: 0x27ae60,
  textAccent: "#e8c252", textDim: "#a89878", textLight: "#f0e6d2",
};

/** Nocturne — ardoise bleu nuit et or. Le brun laisse place à un froid profond ;
 *  l'or est conservé, c'est lui qui porte la lecture et l'esprit médiéval. */
const NOCTURNE: UiTheme = {
  id: "nocturne", name: "Nocturne",
  backdrop: 0x111726, marbleLight: "rgba(64,84,122,0.12)", marbleDark: "rgba(7,10,18,0.16)",
  panel: 0x5a6d94, panelDim: 0x3c4a66, btn: 0x6a80ab,
  skinTint: 0xe8f0ff,
  accent: 0xc9a227, accentSoft: 0xf0cf6a,
  locked: 0x33405c, lockedFill: 0x2a3348, dimBorder: 0x4a5c80, won: 0x2fbf71,
  textAccent: "#f0cf6a", textDim: "#93a5c4", textLight: "#e9eff9",
};

/** Arcane — pourpre profond et or rosé. Plus « faille » que « donjon », en écho
 *  aux portails de Faille du jeu. */
const ARCANE: UiTheme = {
  id: "arcane", name: "Arcane",
  backdrop: 0x181026, marbleLight: "rgba(96,64,132,0.12)", marbleDark: "rgba(10,6,16,0.16)",
  panel: 0x7a629e, panelDim: 0x4e3e6b, btn: 0x866bab,
  skinTint: 0xe6ccff,
  accent: 0xc79a5e, accentSoft: 0xf0c98a,
  locked: 0x40325c, lockedFill: 0x33284a, dimBorder: 0x5c4880, won: 0x3fc08a,
  textAccent: "#f0c98a", textDim: "#ab99c9", textLight: "#efe7fa",
};

/**
 * Remplissage du panneau ouvragé du pack (`paper-special.png`), MESURÉ au centre
 * de sa pièce centrale : `rgb(82, 91, 102)`.
 *
 * C'est lui, et non `panel`, qui décide de la clarté réellement affichée : le
 * thème ne fait plus que le nuancer (`skinTint`). Les garanties de contraste se
 * jugent donc sur `renderedPanel()`, pas sur `panel` — sinon un test vert
 * garantirait la lisibilité d'une couleur que personne n'affiche.
 */
export const SKIN_PANEL_FILL = 0x525b66;

/** Assombrissement du panneau inactif, relatif au panneau standard. */
export const SKIN_DIM_FACTOR = 0.6;

/** Couleur RÉELLEMENT affichée par un panneau habillé, `setTint` multipliant. */
export function renderedPanel(theme: UiTheme, dim = false): number {
  const f = dim ? SKIN_DIM_FACTOR : 1;
  const ch = (shift: number): number => {
    const base = (SKIN_PANEL_FILL >> shift) & 0xff;
    const tint = (theme.skinTint >> shift) & 0xff;
    return Math.round((base * tint / 255) * f);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export const UI_THEMES: Record<string, UiTheme> = {
  ember: EMBER,
  nocturne: NOCTURNE,
  arcane: ARCANE,
};

export const DEFAULT_UI_THEME = "nocturne";

/**
 * Thème actif. Un paramètre d'URL `?theme=` permet de comparer les palettes sans
 * reconstruire — c'est un outil de décision, pas une option de jeu, donc aucune
 * UI ne l'expose et il retombe silencieusement sur le défaut.
 */
export function resolveUiTheme(search?: string): UiTheme {
  const q = search ?? (typeof location !== "undefined" ? location.search : "");
  const id = /[?&]theme=([a-z]+)/i.exec(q)?.[1]?.toLowerCase();
  return UI_THEMES[id ?? ""] ?? UI_THEMES[DEFAULT_UI_THEME]!;
}

export const UI_THEME: UiTheme = resolveUiTheme();
