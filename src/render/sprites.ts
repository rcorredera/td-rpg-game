// ============================================================
// render/sprites.ts — LE registre de skin (données pures, zéro Phaser).
// Associe chaque entité logique (defId d'ennemi/tour, héros, tuile) à sa
// texture. C'est le POINT DE SWAP UNIQUE : changer d'assets = éditer ce
// seul fichier (ADR-005).
//
// SKIN ACTIF : médiéval maison (ADR-016) — textures autonomes dessinées pour
// le projet, dans `public/assets/skin-medieval/`. Le skin précédent (Kenney TD)
// affichait des CHARS D'ASSAUT et des DRONES dans un jeu de chevaliers : une
// incohérence permanente entre ce que le texte raconte et ce que l'écran montre.
//
// Une SpriteRef porte soit une texture autonome (`key` seul), soit une frame de
// planche (`key` + `frame`) — les deux coexistent le temps de la transition.
// ============================================================

import { TEX } from "./assets";

export type SheetKey = keyof typeof TEX;

/** Référence vers une texture, avec teinte/échelle optionnelles. */
export interface SpriteRef {
  /** Clé de texture Phaser. */
  key: string;
  /** Index de frame — uniquement pour une planche ; absent = texture autonome. */
  frame?: number;
  /** Teinte multiplicative (0xRRGGBB). Absent = couleurs natives du sprite. */
  tint?: number;
  /** Échelle par-dessus l'échelle de base. */
  scale?: number;
}

/** Vue d'une tour. Le skin médiéval dessine la tour entière : plus de
 *  composition socle + emblème, qui n'existait que pour recycler des tourelles. */
export interface TowerView {
  base: SpriteRef;
  emblem?: SpriteRef;
}

// ---- Ennemis ------------------------------------------------------------
const ENEMIES: Record<string, SpriteRef> = {
  goblin: { key: "spr_goblin" },
  orc:    { key: "spr_orc" },
  brute:  { key: "spr_brute" },
  bat:    { key: "spr_bat" },
};

// ---- Tours --------------------------------------------------------------
const TOWERS: Record<string, TowerView> = {
  tower_archer:   { base: { key: "spr_tower_archer" } },
  tower_catapult: { base: { key: "spr_tower_catapult" } },
  tower_frost:    { base: { key: "spr_tower_frost" } },
};

// ---- Héros, base & tuiles ----------------------------------------------
const HERO: SpriteRef = { key: "spr_hero" };
const KEEP: SpriteRef = { key: "spr_keep" };

export type TileKind = "pad" | "keep";
const TILES: Record<TileKind, SpriteRef> = {
  pad: { key: "spr_pad" },
  keep: KEEP,
};

// ---- API ----------------------------------------------------------------

export function enemyView(defId: string): SpriteRef {
  const v = ENEMIES[defId];
  if (!v) throw new Error(`sprites: ennemi non mappé « ${defId} »`);
  return v;
}

export function towerView(defId: string, _level?: number, _specId?: string | null): TowerView {
  const v = TOWERS[defId];
  if (!v) throw new Error(`sprites: tour non mappée « ${defId} »`);
  return v;
}

export function heroView(): SpriteRef {
  return HERO;
}

export function keepView(): SpriteRef {
  return KEEP;
}

export function tileFor(kind: TileKind): SpriteRef {
  return TILES[kind];
}

/** Frames valides sur la planche TD (23×13 = 299). Conservé : la planche sert
 *  encore aux FX (flamme d'explosion) le temps de leur reprise. */
export const SHEET_FRAME_MAX = 298;
