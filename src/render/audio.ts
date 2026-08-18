// ============================================================
// render/audio.ts — Registre des SFX (ADR-037). Même principe que
// sprites.ts/icons.ts (ADR-005/012) : un rôle → un fichier, point de swap
// unique. Le son coupé se pilote via `applyMuted` (persisté dans le profil,
// ProfileService.isMuted) — jamais lu ici, juste appliqué au SoundManager.
// ============================================================

import type Phaser from "phaser";

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

/** Volume par rôle. Défaut 0.7 ; le clic UI est plus fréquent (un par tap
 *  dans tout le jeu, via `uiButton`) donc baissé pour ne pas dominer. */
const VOLUME: Partial<Record<SfxKey, number>> = {
  uiClick: 0.5,
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

/** Joue un SFX. `scene.sound` est le SoundManager du `Phaser.Game`, PARTAGÉ
 *  par toutes les scènes (une seule instance) — un `.play()` pendant que le
 *  son est coupé (`applyMuted`) est un no-op Phaser natif, pas la peine de
 *  revérifier l'état ici. */
export function playSfx(scene: Phaser.Scene, key: SfxKey): void {
  scene.sound.play(SFX[key], { volume: VOLUME[key] ?? 0.7 });
}

/** Applique l'état persisté (`ProfileService.isMuted`) au SoundManager. À
 *  appeler au `create()` de chaque scène : coupe/rétablit tout le jeu d'un
 *  coup, puisque le SoundManager est partagé entre scènes. */
export function applyMuted(scene: Phaser.Scene, muted: boolean): void {
  scene.sound.mute = muted;
}
