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
  spr_goblin: ["foe-goblin.svg", 128],
  spr_orc: ["foe-orc.svg", 128],
  spr_brute: ["foe-brute.svg", 128],
  spr_bat: ["foe-bat.svg", 128],
  spr_rat: ["foe-rat.svg", 128],
  spr_gargoyle: ["foe-gargoyle.svg", 128],
  spr_golem: ["foe-golem.svg", 128],
  spr_wraith: ["foe-wraith.svg", 128],
  // Boss rasterisés plus grand : ils s'affichent bien plus gros que la piétaille,
  // et agrandir une texture réduite donnerait du flou (ADR-022).
  spr_warlord: ["foe-warlord.svg", 192],
  spr_wyvern: ["foe-wyvern.svg", 192],
  spr_hero: ["hero-knight.svg", 128],
  spr_tower_archer: ["tower-archer.svg", 128],
  spr_tower_catapult: ["tower-catapult.svg", 128],
  spr_tower_frost: ["tower-frost.svg", 128],
  spr_tower_archer_3: ["tower-archer-3.svg", 128],
  spr_tower_catapult_3: ["tower-catapult-3.svg", 128],
  spr_tower_frost_3: ["tower-frost-3.svg", 128],
  spr_keep: ["keep-bastion.svg", 192],
  spr_pad: ["pad-slot.svg", 128],
};

/** Sprites CraftPix (raster, licence CraftPix — cf. ADR-043) : coexistent avec le skin
 *  SVG maison le temps de la transition, même point de swap unique (ADR-005). */
const CRAFTPIX: Record<string, string> = {
  spr_scorpion: "scorpion.png",
  spr_troll: "troll.png",
  spr_ghost: "ghost.png",
  spr_ogre: "ogre.png",
  spr_dark_knight: "dark-knight.png",
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
