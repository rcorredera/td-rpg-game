// ============================================================
// render/sprites.ts — LE registre de skin (données pures, zéro Phaser).
// Associe chaque entité logique (defId d'ennemi/tour, héros, tuile) à une
// frame du pack Kenney TD (assets.ts). C'est le POINT DE SWAP UNIQUE :
// changer d'assets (médiéval, peinture…) = éditer ce seul fichier.
//
// Planche TD 23×13, frame = row*23 + col (cf assets.ts). Frames repérées
// sur montages annotés en dev. Le boss n'a pas de frame dédiée :
// EntityLayer applique scale+tint sur la frame de base (ADR-004 §boss).
// ============================================================

import { TEX } from "./assets";

export type SheetKey = keyof typeof TEX;

/** Référence vers une frame, avec teinte/échelle optionnelles. */
export interface SpriteRef {
  sheet: SheetKey;
  frame: number;
  /** Teinte multiplicative (0xRRGGBB). Absent = couleurs natives du sprite. */
  tint?: number;
  /** Échelle par-dessus l'échelle de base (art vectoriel → échelles fractionnaires OK). */
  scale?: number;
}

/** Vue d'une tour : socle (plateforme) + tête (canon/lanceur) posée dessus. */
export interface TowerView {
  base: SpriteRef;
  emblem?: SpriteRef;
}

// ---- Ennemis (véhicules Kenney TD) -------------------------------------
// defId historiques (goblin/orc/brute/bat) conservés ; seul le visuel change.
const ENEMIES: Record<string, SpriteRef> = {
  goblin: { sheet: "td", frame: 246 }, // éclaireur : petit char rapide (bleu)
  orc:    { sheet: "td", frame: 249 }, // blindé : char vert standard
  brute:  { sheet: "td", frame: 250 }, // char lourd (rouge)
  bat:    { sheet: "td", frame: 270 }, // drone aérien (avion vert) — volant
};

// ---- Tours : plateforme + tête de canon, teintées par famille -----------
const TOWER_BASE: SpriteRef = { sheet: "td", frame: 181 }; // socle octogonal gris
const TOWERS: Record<string, TowerView> = {
  tower_archer:   { base: TOWER_BASE, emblem: { sheet: "td", frame: 226 } },                 // canon simple
  tower_catapult: { base: TOWER_BASE, emblem: { sheet: "td", frame: 227 } },                 // mortier (zone)
  tower_frost:    { base: TOWER_BASE, emblem: { sheet: "td", frame: 203, tint: 0x8fd0ff } }, // canon cryo (bleu)
};

// ---- Héros & tuiles -----------------------------------------------------
const HERO: SpriteRef = { sheet: "td", frame: 247 }; // unité de commandement (char orange)

export type TileKind = "grass" | "grassAlt" | "path" | "pad";
const TILES: Record<TileKind, SpriteRef> = {
  grass:    { sheet: "td", frame: 119 }, // herbe unie
  grassAlt: { sheet: "td", frame: 124 }, // herbe (variante)
  path:     { sheet: "td", frame: 50 },  // terre/route
  pad:      { sheet: "td", frame: 41 },  // plateforme de tour (herbe surélevée + cible)
};

/** Décorations dispersées sur l'herbe (buissons / plantes). */
export const DECOR_FRAMES = [131, 132, 134] as const;

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

export function tileFor(kind: TileKind): SpriteRef {
  return TILES[kind];
}

/** Frames valides sur la planche TD (23×13 = 299). */
export const SHEET_FRAME_MAX = 298;
