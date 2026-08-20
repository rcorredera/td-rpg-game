// ============================================================
// render/assets/biomes.ts — Identité VISUELLE d'un chapitre (ADR-023).
//
// « Le Col du Gel » s'affichait sur la même prairie verte que tous les autres :
// le nom promettait un lieu, l'écran en montrait un seul. Un chapitre qui ne se
// reconnaît pas d'un coup d'œil n'est pas un chapitre, c'est la même carte avec
// d'autres vagues.
//
// RÉPARTITION DES RÔLES : le content nomme un biome (`"frost"`), il ne choisit
// aucune couleur — le rendu décide à quoi ce biome ressemble. C'est ce qui permet
// à un futur skin de tout redéfinir sans toucher au contenu (ADR-005).
//
// PUR : aucune dépendance Phaser ni DOM, donc testable.
// ============================================================

/** Motif de surface. Ce n'est pas qu'une couleur : la FORME dit la matière. */
export type BiomeMotif =
  | "grass"  // brins dressés — prairie, forêt
  | "rock"   // éclats anguleux — carrières, ruines
  | "flake"  // points épars — neige, cendre
  | "reed";  // traits couchés — marais, gué

export interface BiomeDef {
  /** Libellé lisible, pour la doc et les futurs écrans. */
  name: string;
  /** Fond du sol. */
  ground: number;
  /** Deux nuances des taches larges qui donnent du volume. */
  patchLight: string;
  patchDark: string;
  /** Deux teintes du motif de surface. */
  fleckLight: string;
  fleckDark: string;
  /** Densité du motif : une lande rase n'a pas la densité d'une forêt. */
  fleckCount: number;
  motif: BiomeMotif;
  /** Chemin : bordure, cœur, trace centrale. */
  path: number;
  pathEdge: number;
  pathCore: number;
  /** Props semés sur le sol (ADR-062). */
  decor: BiomeDecor;
}

/**
 * Décor d'un biome. Deux nombres seulement : le semis lui-même vit dans
 * `world/decor.ts`, et la COULEUR des props se dérive de `ground` — un nouveau
 * biome hérite donc d'un décor cohérent sans réglage supplémentaire.
 */
export interface BiomeDecor {
  /** Nombre de props visé sur tout le champ. 0 = biome nu. */
  count: number;
  /** Part de buissons, 0..1 ; le reste est en rochers. Une lande de cendre ou
   *  de givre est à 0 : rien n'y pousse, et un buisson vert y hurlerait. */
  bushShare: number;
}

/**
 * Un biome par chapitre. Tous restent DÉSATURÉS : la règle de la palette veut que
 * plus une couleur est saturée, plus elle porte du sens — le décor ne doit jamais
 * concurrencer les unités, quelle que soit son ambiance.
 */
export const BIOMES: Record<string, BiomeDef> = {
  meadow: {
    name: "Prairie",
    ground: 0x6b8c4a,
    patchLight: "rgba(127,160,90,0.55)", patchDark: "rgba(87,116,57,0.5)",
    fleckLight: "rgba(140,175,100,0.75)", fleckDark: "rgba(80,108,52,0.7)",
    fleckCount: 130, motif: "grass",
    path: 0xc2a173, pathEdge: 0x9d7f55, pathCore: 0xd8bd93,
    decor: { count: 34, bushShare: 0.60 },
  },
  ash: {
    name: "Cendres",
    ground: 0x5a534c,
    patchLight: "rgba(122,112,102,0.5)", patchDark: "rgba(58,52,47,0.55)",
    fleckLight: "rgba(180,172,163,0.5)", fleckDark: "rgba(40,36,32,0.6)",
    fleckCount: 150, motif: "flake",
    path: 0x8f8175, pathEdge: 0x635a51, pathCore: 0xa89a8c,
    decor: { count: 26, bushShare: 0.00 },
  },
  marsh: {
    name: "Marécage",
    ground: 0x4e6b52,
    patchLight: "rgba(95,130,105,0.55)", patchDark: "rgba(52,74,62,0.55)",
    fleckLight: "rgba(126,160,130,0.6)", fleckDark: "rgba(48,70,58,0.7)",
    fleckCount: 110, motif: "reed",
    path: 0x9c8f6a, pathEdge: 0x6e6448, pathCore: 0xb5a884,
    decor: { count: 30, bushShare: 0.70 },
  },
  forest: {
    name: "Forêt",
    ground: 0x3f6141,
    patchLight: "rgba(86,122,80,0.55)", patchDark: "rgba(41,62,44,0.6)",
    fleckLight: "rgba(110,150,98,0.7)", fleckDark: "rgba(32,52,34,0.7)",
    fleckCount: 175, motif: "grass",
    path: 0xa88f66, pathEdge: 0x74603f, pathCore: 0xc0a882,
    decor: { count: 42, bushShare: 0.75 },
  },
  quarry: {
    name: "Carrières",
    ground: 0x7d7466,
    patchLight: "rgba(150,141,127,0.5)", patchDark: "rgba(90,83,73,0.55)",
    fleckLight: "rgba(176,167,152,0.6)", fleckDark: "rgba(70,64,56,0.6)",
    fleckCount: 120, motif: "rock",
    path: 0xb9a68a, pathEdge: 0x8a7a63, pathCore: 0xd0c0a4,
    decor: { count: 34, bushShare: 0.08 },
  },
  frost: {
    name: "Glace",
    ground: 0x8fa3b0,
    patchLight: "rgba(202,219,229,0.6)", patchDark: "rgba(118,140,155,0.5)",
    fleckLight: "rgba(236,246,252,0.75)", fleckDark: "rgba(104,128,145,0.5)",
    fleckCount: 160, motif: "flake",
    path: 0xa9b7bf, pathEdge: 0x76889a, pathCore: 0xd3dee5,
    decor: { count: 20, bushShare: 0.00 },
  },
  barrow: {
    name: "Tertres",
    ground: 0x5d5464,
    patchLight: "rgba(112,100,122,0.5)", patchDark: "rgba(60,52,68,0.55)",
    fleckLight: "rgba(150,136,160,0.55)", fleckDark: "rgba(44,38,52,0.65)",
    fleckCount: 100, motif: "grass",
    path: 0x9b8d84, pathEdge: 0x6c6058, pathCore: 0xb6a89e,
    decor: { count: 28, bushShare: 0.30 },
  },
  ruins: {
    name: "Ruines",
    ground: 0x6e675c,
    patchLight: "rgba(134,126,113,0.5)", patchDark: "rgba(78,72,64,0.55)",
    fleckLight: "rgba(166,158,144,0.6)", fleckDark: "rgba(58,53,46,0.6)",
    fleckCount: 135, motif: "rock",
    path: 0xb0a48c, pathEdge: 0x7d735e, pathCore: 0xc7bca0,
    decor: { count: 30, bushShare: 0.18 },
  },
  tundra: {
    name: "Toundra",
    ground: 0x76858a,
    patchLight: "rgba(150,166,170,0.55)", patchDark: "rgba(96,110,116,0.5)",
    fleckLight: "rgba(200,214,218,0.6)", fleckDark: "rgba(80,94,100,0.6)",
    fleckCount: 120, motif: "flake",
    path: 0xa1a49c, pathEdge: 0x717468, pathCore: 0xc0c2b8,
    decor: { count: 20, bushShare: 0.06 },
  },
  blight: {
    name: "Terre gâtée",
    ground: 0x5c3f3c,
    patchLight: "rgba(120,74,66,0.55)", patchDark: "rgba(58,36,34,0.6)",
    fleckLight: "rgba(158,92,78,0.6)", fleckDark: "rgba(42,26,24,0.7)",
    fleckCount: 140, motif: "rock",
    path: 0x8f7060, pathEdge: 0x5f4740, pathCore: 0xa88773,
    decor: { count: 28, bushShare: 0.12 },
  },
};

/** Biome de repli — un chapitre sans biome déclaré reste jouable. */
export const DEFAULT_BIOME: string = "meadow";

export function biomeFor(id: string | undefined): BiomeDef {
  return BIOMES[id ?? DEFAULT_BIOME] ?? BIOMES[DEFAULT_BIOME]!;
}
