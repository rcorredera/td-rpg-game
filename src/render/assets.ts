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

/** À appeler dans le preload() des scènes qui affichent des entités. */
export function preloadSprites(scene: Phaser.Scene): void {
  scene.load.spritesheet(TEX.td, "assets/kenney-td/sheet.png", { frameWidth: TILE, frameHeight: TILE });
}
