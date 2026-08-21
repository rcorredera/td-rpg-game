// ============================================================
// render/assets/sprites.ts — LE registre de skin (données pures, zéro Phaser).
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
/**
 * Planche de marche : combien de DIRECTIONS y sont dessinées, et combien de
 * poses par direction. Le total de cases vaut le produit des deux.
 */
export interface WalkSheet {
  directions: number;
  poses: number;
}

export interface SpriteRef {
  /** Clé de texture Phaser. */
  key: string;
  /** Index de frame — uniquement pour une planche ; absent = texture autonome. */
  frame?: number;
  /** Teinte multiplicative (0xRRGGBB). Absent = couleurs natives du sprite. */
  tint?: number;
  /**
   * Planche de marche DESSINÉE (ADR-065/067). Absente = sprite statique, animé
   * par la transform (ADR-064).
   *
   * Les cases sont rangées DIRECTION-MAJOR : `direction * poses + pose`. L'ordre
   * des directions est celui de la planche, de haut en bas — face, profil droit,
   * dos ; la marche vers la gauche est le miroir du profil (`world/facing.ts`).
   */
  walk?: WalkSheet;
  /** Échelle par-dessus l'échelle de base. */
  scale?: number;
  /**
   * Taille d'affichage en unités logiques. Relève du SKIN, pas de la scène : la
   * hiérarchie de taille porte de l'information (un golem doit se voir massif au
   * premier regard) et changer de skin doit pouvoir la revoir d'un seul endroit.
   */
  size?: number;
}

/** Vue d'une tour. Le skin médiéval dessine la tour entière : plus de
 *  composition socle + emblème, qui n'existait que pour recycler des tourelles. */
export interface TowerView {
  base: SpriteRef;
  emblem?: SpriteRef;
}

// ---- Ennemis ------------------------------------------------------------
// La taille croît avec la menace : le joueur doit hiérarchiser une vague d'un coup
// d'œil, avant d'avoir lu la moindre barre de vie.
const ENEMIES: Record<string, SpriteRef> = {
  diablotin:   { key: "spr_diablotin", size: 38 },
  scorpion:    { key: "spr_scorpion", size: 36 },
  goblin:      { key: "spr_goblin", size: 46, walk: { directions: 3, poses: 3 } },
  wraith:      { key: "spr_ghost", size: 50 }, // sprite CraftPix (ADR-043)
  bat:         { key: "spr_bat", size: 52 },
  orc:         { key: "spr_orc", size: 54, walk: { directions: 3, poses: 4 } },
  troll:       { key: "spr_troll", size: 56 },
  dark_knight: { key: "spr_dark_knight", size: 58 },
  gargoyle:    { key: "spr_gargoyle", size: 60 },
  brute:       { key: "spr_brute", size: 62 },
  ogre:        { key: "spr_ogre", size: 66 },
  golem:       { key: "spr_golem", size: 70 },
  warlord:     { key: "spr_warlord", size: 72 },
  wyvern:      { key: "spr_wyvern", size: 78 },
  // Deuxième acte (ch.11-20, ADR-049).
  bog_sprite:       { key: "spr_bog_sprite", size: 36 },
  scarlet_prickler: { key: "spr_scarlet_prickler", size: 36 },
  frontier_raider:  { key: "spr_frontier_raider", size: 50 },
  rift_marauder:    { key: "spr_rift_marauder", size: 50 },
  shade_warder:     { key: "spr_shade_warder", size: 52 },
  veiled_assassin:  { key: "spr_veiled_assassin", size: 54 },
  four_eyed_warden: { key: "spr_four_eyed_warden", size: 58 },
  corrupted_hermit: { key: "spr_corrupted_hermit", size: 64 },
  howling_bones:    { key: "spr_howling_bones", size: 68 },
  the_gravedigger:  { key: "spr_the_gravedigger", size: 82 },
};

/** Taille par défaut si un skin oublie de la préciser. */
export const ENEMY_SIZE_FALLBACK: number = 46;

// ---- Tours --------------------------------------------------------------
// Une entrée par PALIER visuel : l'amélioration doit se voir sur la carte, pas
// seulement dans le menu (ADR-017). `tiers[0]` = niveaux 1-2, `tiers[1]` =
// niveau 3 et spécialisations. Ajouter un palier = ajouter une entrée ici.
interface TowerSkin {
  tiers: SpriteRef[];
  /** Teinte appliquée par spécialisation, pour distinguer deux branches d'un même palier
   *  QUAND elles partagent le même sprite (pas de texture dédiée dessinée pour l'une). */
  specTint?: Record<string, number>;
  /** Sprite ENTIÈREMENT différent pour une spécialisation donnée — prioritaire sur
   *  `specTint`. Une branche assez distincte (ex. arbalète à carreau unique vs
   *  tir groupé) mérite sa propre silhouette plutôt qu'une simple teinte. */
  specSprite?: Record<string, SpriteRef>;
}

const TOWERS: Record<string, TowerSkin> = {
  tower_archer: {
    tiers: [{ key: "spr_tower_archer" }, { key: "spr_tower_archer_3" }],
    specSprite: {
      spec_longbow: { key: "spr_tower_archer_longbow" },
      spec_volley: { key: "spr_tower_archer_volley" },
    },
  },
  tower_catapult: {
    tiers: [{ key: "spr_tower_catapult" }, { key: "spr_tower_catapult_3" }],
    specTint: { spec_greekfire: 0xffb887 },
  },
  tower_frost: {
    tiers: [{ key: "spr_tower_frost" }, { key: "spr_tower_frost_3" }],
    specSprite: {
      spec_frostfire: { key: "spr_tower_frost_frostfire" },
      spec_blizzard: { key: "spr_tower_frost_blizzard" },
    },
  },
};

/** Palier visuel d'une tour : niveau 3 ou spécialisée = rang supérieur. */
export function towerTier(level: number, specId?: string | null): number {
  return specId || level >= 3 ? 1 : 0;
}

// ---- Héros, base & tuiles ----------------------------------------------
const HERO: SpriteRef = { key: "spr_hero" };
const KEEP: SpriteRef = { key: "spr_keep" };

export type TileKind = "pad" | "keep";
const TILES: Record<TileKind, SpriteRef> = {
  pad: { key: "spr_pad" },
  keep: KEEP,
};

// ---- API ----------------------------------------------------------------

/**
 * Textures livrées en PLANCHE de marche, avec leur nombre de poses (ADR-065).
 *
 * Dérivé du registre plutôt que saisi à part : déclarer `frames` sur une entrée
 * suffit, et il n'existe aucune seconde liste à tenir en phase — c'est
 * exactement le genre de doublon qui se périme à la première créature ajoutée.
 */
export function animatedSprites(): [key: string, frames: number][] {
  const out: [string, number][] = [];
  for (const v of Object.values(ENEMIES)) {
    const total: number = walkFrameCount(v.walk);
    if (total > 1) out.push([v.key, total]);
  }
  return out;
}

/** Nombre total de cases d'une planche : directions × poses. 1 si absente. */
export function walkFrameCount(walk: WalkSheet | undefined): number {
  return walk === undefined ? 1 : Math.max(1, walk.directions) * Math.max(1, walk.poses);
}

/**
 * Pose à montrer sur une vignette FIXE (Bestiaire) : la première du cycle, un
 * appui au sol. `undefined` pour une créature à sprite unique, où demander une
 * frame n'aurait pas de sens.
 */
export function portraitFrame(defId: string): number | undefined {
  return walkFrameCount(ENEMIES[defId]?.walk) > 1 ? 0 : undefined;
}

export function enemyView(defId: string): SpriteRef {
  const v: SpriteRef | undefined = ENEMIES[defId];
  if (!v) throw new Error(`sprites: ennemi non mappé « ${defId} »`);
  return v;
}

export function towerView(defId: string, level = 1, specId?: string | null): TowerView {
  const skin: TowerSkin | undefined = TOWERS[defId];
  if (!skin) throw new Error(`sprites: tour non mappée « ${defId} »`);
  const specSprite: SpriteRef | undefined = specId ? skin.specSprite?.[specId] : undefined;
  if (specSprite) return { base: specSprite };
  const tier: number = Math.min(towerTier(level, specId), skin.tiers.length - 1);
  const base: SpriteRef = skin.tiers[tier]!;
  const tint: number | undefined = specId ? skin.specTint?.[specId] : undefined;
  return { base: tint ? { ...base, tint } : base };
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
export const SHEET_FRAME_MAX: number = 298;

/** Dimensions d'affichage d'un sprite, proportions natives conservées (ADR-046).
 *  Nommée plutôt que recopiée : la forme sert au rendu ET à ses tests
 *  (`.ai/conventions.md` — un type anonyme utilisé plus d'une fois devient une
 *  interface). */
export interface SpriteFit { w: number; h: number }

/**
 * Dimensions d'affichage qui FONT TENIR une texture de `nativeW`×`nativeH` dans
 * une case `target`×`target`, en conservant ses proportions natives.
 *
 * Le skin maison (ADR-016) dessinait tout sur un canevas carré 128×128, donc
 * `setDisplaySize(size, size)` était sans risque. Les sprites importés
 * (CraftPix, IA — ADR-043/044/045) sont rognés à leur silhouette réelle : une
 * chauve-souris aux ailes déployées fait ~2:1, un gobelin casqué plutôt 0.6:1.
 * Forcer un carré les écrase ou les étire selon le sens — constaté à l'écran,
 * en combat ET dans le Bestiaire. Le plus grand côté est calé sur `target`,
 * l'autre suit au même ratio ; jamais l'inverse (qui déborderait la case).
 */
export function fitSquare(nativeW: number, nativeH: number, target: number): SpriteFit {
  if (nativeW <= 0 || nativeH <= 0) return { w: target, h: target };
  const scale: number = target / Math.max(nativeW, nativeH);
  return { w: nativeW * scale, h: nativeH * scale };
}
