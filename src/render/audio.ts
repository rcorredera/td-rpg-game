// ============================================================
// render/audio.ts — Registre des SFX (ADR-037) + routage par catégorie
// (ADR-038). Même principe que sprites.ts/icons.ts (ADR-005/012) : un rôle →
// un fichier, point de swap unique.
//
// Les réglages (`AudioSettings`) sont mis en cache ici (`current`) plutôt que
// transmis à chaque appel : `playSfx` est invoqué depuis `uiButton`, le point
// d'entrée UNIQUE de tout bouton du jeu — une centaine d'écrans/composants
// n'ont et n'auront jamais accès à `ProfileService`. `scene.sound.mute`/
// `.volume` sont déjà un état global équivalent (SoundManager PARTAGÉ par
// toutes les scènes d'un même Phaser.Game) ; ce cache suit le même principe
// pour la partie que Phaser ne porte pas nativement (catégories).
// ============================================================

import type Phaser from "phaser";
import { DEFAULT_AUDIO_SETTINGS } from "../core/types";
import type { AudioCategory, AudioSettings } from "../core/types";

/** Rôle SFX → clé de son Phaser. */
// eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
export const SFX = {
  shotArcher: "sfx_shot_archer",
  shotCatapult: "sfx_shot_catapult",
  shotFrost: "sfx_shot_frost",
  impact: "sfx_impact",
  enemyDied: "sfx_enemy_died",
  castleHit: "sfx_castle_hit",
  heroDied: "sfx_hero_died",
  uiClick: "sfx_ui_click",
} as const;

export type SfxKey = keyof typeof SFX;

/** Fichier source de chaque SFX (dossier `public/assets/audio/`). */
const FILES: Record<SfxKey, string> = {
  shotArcher: "sfx-shot-archer.ogg",
  shotCatapult: "sfx-shot-catapult.ogg",
  shotFrost: "sfx-shot-frost.ogg",
  impact: "sfx-impact.ogg",
  enemyDied: "sfx-enemy-died.ogg",
  castleHit: "sfx-castle-hit.ogg",
  heroDied: "sfx-hero-died.ogg",
  uiClick: "sfx-ui-click.ogg",
};

/** Volume par rôle (mix relatif, sous le volume global — ADR-038). Défaut
 *  0.7 ; le clic UI est plus fréquent (un par tap dans tout le jeu, via
 *  `uiButton`) donc baissé pour ne pas dominer. */
const VOLUME: Partial<Record<SfxKey, number>> = {
  uiClick: 0.5,
};

/** Catégorie commutable de chaque SFX (ADR-038). `music` n'a encore aucune
 *  entrée : aucune musique de fond n'existe (ADR-037), mais le réglage existe
 *  déjà côté profil pour qu'un futur ajout le respecte sans migration de plus. */
const CATEGORY_BY_KEY: Record<SfxKey, AudioCategory> = {
  shotArcher: "damage",
  shotCatapult: "damage",
  shotFrost: "damage",
  impact: "damage",
  enemyDied: "damage",
  castleHit: "damage",
  heroDied: "damage",
  uiClick: "notifications",
};

/** Tir d'une tour → SFX. Ajouter une tour = ajouter une entrée ici (même
 *  discipline que `sprites.ts` pour les skins, ADR-005). */
const SHOT_BY_TOWER: Record<string, SfxKey> = {
  tower_archer: "shotArcher",
  tower_catapult: "shotCatapult",
  tower_frost: "shotFrost",
};

export function shotSfx(towerDefId: string): SfxKey {
  const key: SfxKey | undefined = SHOT_BY_TOWER[towerDefId];
  if (!key) throw new Error(`audio: tour non mappée « ${towerDefId} »`);
  return key;
}

/** Charge tous les SFX. Idempotent entre scènes (cache Phaser), comme preloadSprites/preloadIcons. */
export function preloadAudio(scene: Phaser.Scene): void {
  for (const key of Object.keys(FILES) as SfxKey[]) {
    scene.load.audio(SFX[key], `assets/audio/${FILES[key]}`);
  }
}

/** Cœur pur : un SFX joue-t-il, compte tenu de `master` et de sa catégorie ?
 *  Séparé de `playSfx` pour rester testable sans scène Phaser (audio.test.ts). */
export function sfxEnabled(settings: AudioSettings, key: SfxKey): boolean {
  return settings.master && settings[CATEGORY_BY_KEY[key]];
}

let current: AudioSettings = DEFAULT_AUDIO_SETTINGS;

/** Applique les réglages persistés (`ProfileService.audioSettings`) : mémorise
 *  l'état pour le filtrage par catégorie (`sfxEnabled`) ET pilote le
 *  SoundManager Phaser (`mute` global, `volume` global — appliqués aux DEUX à
 *  la fois, `master` sert de coupe-tout indépendamment des catégories). À
 *  appeler au `create()` de chaque scène : `scene.sound` est PARTAGÉ par
 *  toutes les scènes d'un même `Phaser.Game`. */
export function applyAudioSettings(scene: Phaser.Scene, settings: AudioSettings): void {
  current = settings;
  scene.sound.mute = !settings.master;
  scene.sound.volume = settings.volume;
}

/** Joue un SFX si sa catégorie et `master` sont actifs. */
export function playSfx(scene: Phaser.Scene, key: SfxKey): void {
  if (!sfxEnabled(current, key)) return;
  scene.sound.play(SFX[key], { volume: VOLUME[key] ?? 0.7 });
}
