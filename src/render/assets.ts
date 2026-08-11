// ============================================================
// render/assets.ts — Préchargement du spritesheet Kenney Tower Defense
// (top-down, CC0). Planche packée en tuiles 64×64, 23 colonnes →
// frame = row*23 + col. Art vectoriel lisse (pas pixel : pixelArt = false).
// Idempotent entre scènes (cache Phaser), comme preloadUi.
// ============================================================

import Phaser from "phaser";

/** Clé(s) de texture des spritesheets. */
export const TEX = {
  td: "td_sheet", // Kenney TD : véhicules, tourelles, tuiles, FX
} as const;

/** Taille d'une tuile source (pixels). */
export const TILE = 64;
/** Nombre de colonnes de la planche (frame = row*COLS + col). */
export const SHEET_COLS = 23;

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

/** À appeler dans le preload() des scènes qui affichent des entités. */
export function preloadSprites(scene: Phaser.Scene): void {
  scene.load.spritesheet(TEX.td, "assets/kenney-td/sheet.png", { frameWidth: TILE, frameHeight: TILE });
  for (const [key, [file, px]] of Object.entries(MEDIEVAL)) {
    scene.load.svg(key, `assets/skin-medieval/${file}`, { width: px, height: px });
  }
}
