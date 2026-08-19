// ============================================================
// render/assets.ts — Préchargement du spritesheet Kenney Tower Defense
// (top-down, CC0). Planche packée en tuiles 64×64, 23 colonnes →
// frame = row*23 + col. Art vectoriel lisse (pas pixel : pixelArt = false).
// Idempotent entre scènes (cache Phaser), comme preloadUi.
// ============================================================

import Phaser from "phaser";

/** Clé(s) de texture des spritesheets. */
// eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
export const TEX = {
  td: "td_sheet", // Kenney TD : véhicules, tourelles, tuiles, FX
} as const;

/** Taille d'une tuile source (pixels). */
export const TILE: number = 64;
/** Nombre de colonnes de la planche (frame = row*COLS + col). */
export const SHEET_COLS: number = 23;

export function frame(col: number, row: number): number {
  return row * SHEET_COLS + col;
}

/** Skin médiéval (ADR-016) : une texture autonome par entité, dessinée pour le
 *  projet. Rasterisées grand (les unités sont bien plus grosses qu'avant) puis
 *  réduites à l'affichage — jamais l'inverse, qui donnerait du flou. */
const MEDIEVAL: Record<string, [file: string, px: number]> = {
  spr_tower_catapult: ["tower-catapult.svg", 128],
  spr_tower_catapult_3: ["tower-catapult-3.svg", 128],
  spr_keep: ["keep-bastion.svg", 192],
  spr_pad: ["pad-slot.svg", 128],
};

/** Sprites CraftPix (raster, licence CraftPix — cf. ADR-043/044) : coexistent avec le
 *  skin SVG maison le temps de la transition, même point de swap unique (ADR-005). */
const CRAFTPIX: Record<string, string> = {
  spr_scorpion: "scorpion.png",
  spr_troll: "troll.png",
  spr_ghost: "ghost.png",
  spr_ogre: "ogre.png",
  spr_dark_knight: "dark-knight.png",
  spr_rat: "imp.png",
  spr_goblin: "goblin-knight.png",
  spr_orc: "orc-fang.png",
  spr_brute: "brute-zombie.png",
  spr_golem: "steel-golem.png",
  spr_warlord: "warlord.png",
  // Créatures volantes générées par IA (ADR-045) : aucune des 20 variantes
  // CraftPix des deux packs de monstres n'en propose — dernier reliquat du
  // skin SVG maison, remplacé pour coller au reste du bestiaire.
  spr_bat: "bat-ai.png",
  spr_gargoyle: "gargoyle-ai.png",
  spr_wyvern: "wyvern-ai.png",
  // Héros généré par IA (ADR-045) : remplace le SVG maison précédent.
  spr_hero: "hero-ai.png",
  // Tour d'archerie générée par IA (ADR-047), les deux paliers visuels
  // (ADR-017) et ses deux spécialisations. Catapulte reste en SVG maison.
  spr_tower_archer: "tower-archer-ai.png",
  spr_tower_archer_3: "tower-archer-3-ai.png",
  // Spécialisation "Arc long" : silhouette dédiée (arbalète à carreau unique),
  // pas une simple teinte du palier 3 — assez distincte pour le mériter.
  spr_tower_archer_longbow: "tower-archer-longbow-ai.png",
  spr_tower_archer_volley: "tower-archer-volley-ai.png",
  // Tour de givre, les deux paliers. Catapulte reste en SVG maison.
  spr_tower_frost: "tower-frost-ai.png",
  spr_tower_frost_3: "tower-frost-3-ai.png",
  // Spécialisation "Givre ardent" : silhouette dédiée (tornade glace + feu),
  // pas une simple teinte du palier 3.
  spr_tower_frost_frostfire: "tower-frost-frostfire-ai.png",
  // Spécialisation "Blizzard" : tourbillon de glace.
  spr_tower_frost_blizzard: "tower-frost-blizzard-ai.png",
};

/** À appeler dans le preload() des scènes qui affichent des entités. */
export function preloadSprites(scene: Phaser.Scene): void {
  scene.load.spritesheet(TEX.td, "assets/kenney-td/sheet.png", { frameWidth: TILE, frameHeight: TILE });
  for (const [key, [file, px]] of Object.entries(MEDIEVAL)) {
    scene.load.svg(key, `assets/skin-medieval/${file}`, { width: px, height: px });
  }
  for (const [key, file] of Object.entries(CRAFTPIX)) {
    scene.load.image(key, `assets/skin-craftpix/${file}`);
  }
}
