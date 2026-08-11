// ============================================================
// render/palette.ts — Palette du skin médiéval (maquette, ADR-016).
//
// Le prototype tenait sur un brun sombre quasi monochrome, jugé daté. Ici :
// des valeurs plus CLAIRES pour le monde (une prairie se lit de jour), des
// accents franchement saturés réservés à l'information de jeu, et une famille
// de couleur par camp pour que chaque unité se distingue au premier coup d'œil.
//
// Règle de lecture : plus une couleur est saturée, plus elle porte du SENS.
// Le décor reste désaturé, les ennemis et les tours tranchent dessus.
// ============================================================

/** Sol et décor — désaturés, ils ne doivent jamais concurrencer les unités. */
export const GROUND = {
  grassLight: 0x7fa05a,
  grass: 0x6b8c4a,
  grassDark: 0x577439,
  path: 0xc2a173,
  pathEdge: 0x9d7f55,
  rock: 0x8a8577,
  water: 0x4f7f96,
} as const;

/** Camps ennemis — une teinte dominante par famille, nettement séparées. */
export const FOE = {
  goblin: 0x8dc63f,      // vert acide : petit et vif
  goblinDark: 0x5d8f22,
  orc: 0x3f7d5a,         // vert profond : le fantassin
  orcDark: 0x2a5a3f,
  brute: 0x9c5a3c,       // terre de brique : le tank
  bruteDark: 0x6d3c25,
  bat: 0x7d5aa6,         // violet : le volant
  batDark: 0x54397a,
  boss: 0xd4632f,
} as const;

/** Défenses du joueur — bleu/pierre côté allié, pour trancher avec les verts ennemis. */
export const KEEP = {
  stone: 0xb9b3a4,
  stoneDark: 0x7d786c,
  roofArcher: 0x3f6fa8,
  roofCatapult: 0x9a6134,
  roofFrost: 0x4aa3c4,
  wood: 0x8b5e34,
  banner: 0xc4453f,
} as const;

/** Héros — or chaud, unique dans la palette : il doit se repérer instantanément. */
export const HERO_C = {
  armor: 0xdcd6c6,
  armorDark: 0x9a9384,
  cloth: 0xc4453f,
  gold: 0xe8b84b,
} as const;

/** Accents d'information : réservés aux barres, portées, états. */
export const SIGNAL = {
  hpGood: 0x5ec26a,
  hpWarn: 0xe8c252,
  hpBad: 0xd6483f,
  slow: 0x7ec8e3,
  burn: 0xe67e22,
  select: 0xffd970,
} as const;
