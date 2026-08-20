// ============================================================
// render/audio.ts — Registre des SFX (ADR-037) + routage par catégorie
// (ADR-038) + musique de menu (ADR-039). Même principe que sprites.ts/icons.ts
// (ADR-005/012) : un rôle → un fichier, point de swap unique.
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
  shotArcherSpec: "sfx_shot_archer_spec",
  shotCatapult: "sfx_shot_catapult",
  shotFrost: "sfx_shot_frost",
  shotFrostFire: "sfx_shot_frost_fire",
  impact: "sfx_impact",
  impactFrost: "sfx_impact_frost",
  enemyDied: "sfx_enemy_died",
  castleHit: "sfx_castle_hit",
  heroDied: "sfx_hero_died",
  heroAttack: "sfx_hero_attack",
  uiClick: "sfx_ui_click",
  purchase: "sfx_purchase",
  bestiaryOpen: "sfx_bestiary_open",
  chroniclesOpen: "sfx_chronicles_open",
  victory: "sfx_victory",
  defeat: "sfx_defeat",
  heroWhirlwind: "sfx_hero_whirlwind",
  heroRally: "sfx_hero_rally",
  accountSpell: "sfx_account_spell",
} as const;

export type SfxKey = keyof typeof SFX;

/** Fichier source de chaque SFX (dossier `public/assets/audio/`). */
const FILES: Record<SfxKey, string> = {
  shotArcher: "sfx-shot-archer.ogg",
  shotArcherSpec: "sfx-shot-archer-spec.ogg",
  // ADR-053 : remplace le fichier initial d'ADR-042, jugé inadapté par le PO
  // (pas assez « impact de projectile lourd ») — piste « Rock Meteor Throw »
  // du pack TomMusic, déjà sourcée (mêmes conditions de licence).
  shotCatapult: "sfx-shot-catapult.ogg",
  shotFrost: "sfx-shot-frost.ogg",
  shotFrostFire: "sfx-shot-frost-fire.ogg",
  impact: "sfx-impact.ogg",
  impactFrost: "sfx-impact-frost.ogg",
  enemyDied: "sfx-enemy-died.ogg",
  castleHit: "sfx-castle-hit.ogg",
  heroDied: "sfx-hero-died.ogg",
  heroAttack: "sfx-hero-attack.ogg",
  uiClick: "sfx-ui-click.ogg",
  purchase: "sfx-purchase.ogg",
  bestiaryOpen: "sfx-bestiary-open.ogg",
  chroniclesOpen: "sfx-chronicles-open.ogg",
  victory: "sfx-victory.wav",
  defeat: "sfx-defeat.wav",
  heroWhirlwind: "sfx-hero-whirlwind.wav",
  heroRally: "sfx-hero-rally.wav",
  accountSpell: "sfx-account-spell.ogg",
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
  shotArcherSpec: "damage",
  shotCatapult: "damage",
  shotFrost: "damage",
  shotFrostFire: "damage",
  impact: "damage",
  impactFrost: "damage",
  enemyDied: "damage",
  castleHit: "damage",
  heroDied: "damage",
  heroAttack: "damage",
  uiClick: "notifications",
  purchase: "notifications",
  bestiaryOpen: "notifications",
  chroniclesOpen: "notifications",
  victory: "notifications",
  defeat: "notifications",
  heroWhirlwind: "damage",
  heroRally: "damage",
  accountSpell: "damage",
};

/** Tir d'une tour → SFX, variante selon la spécialisation niv.4 active (ADR-042) :
 *  Archerie spécialisée (Salve/Arc long) sonne différemment de la base, et la
 *  spécialisation « Givre ardent » (givre+brûlure) sonne comme un sort de feu,
 *  pas de glace — `spec_blizzard` n'émet jamais de tir (aura continue) donc
 *  n'a pas besoin d'entrée ici. Ajouter une tour = ajouter une entrée ici (même
 *  discipline que `sprites.ts` pour les skins, ADR-005). */
const SHOT_BY_TOWER: Record<string, (specId: string | null) => SfxKey> = {
  tower_archer: (specId) => (specId ? "shotArcherSpec" : "shotArcher"),
  tower_catapult: () => "shotCatapult",
  tower_frost: (specId) => (specId === "spec_frostfire" ? "shotFrostFire" : "shotFrost"),
};

export function shotSfx(towerDefId: string, specId: string | null = null): SfxKey {
  const pick: ((specId: string | null) => SfxKey) | undefined = SHOT_BY_TOWER[towerDefId];
  if (!pick) throw new Error(`audio: tour non mappée « ${towerDefId} »`);
  return pick(specId);
}

/** Impact d'une tour À ZONE (`explosion` de sim avec `towerDefId`) → SFX
 *  (ADR-054) : le givre a désormais son propre éclat glacé plutôt que
 *  l'« impact » générique — sinon indifférenciable du tourbillon du héros, qui
 *  utilisait le même son (confondant : deux sources totalement différentes).
 *  Toute autre tour à zone (catapulte) retombe sur l'impact générique. */
const IMPACT_BY_TOWER: Partial<Record<string, SfxKey>> = {
  tower_frost: "impactFrost",
};

export function impactSfx(towerDefId: string): SfxKey {
  return IMPACT_BY_TOWER[towerDefId] ?? "impact";
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

/** Cœur pur : la musique doit-elle tourner, compte tenu de `master` et de la
 *  catégorie « musique » ? Ne dit RIEN sur le CONTEXTE (menu vs run) — c'est
 *  à l'appelant (MenuScene) de savoir s'il est un endroit qui joue de la
 *  musique (ADR-039). */
export function musicEnabled(settings: AudioSettings): boolean {
  return settings.master && settings.music;
}

let current: AudioSettings = DEFAULT_AUDIO_SETTINGS;

/** Applique les réglages persistés (`ProfileService.audioSettings`) : mémorise
 *  l'état pour le filtrage par catégorie (`sfxEnabled`/`musicEnabled`) ET
 *  pilote le SoundManager Phaser (`mute` global, `volume` global — appliqués
 *  aux DEUX à la fois, `master` sert de coupe-tout indépendamment des
 *  catégories). À appeler au `create()` de chaque scène : `scene.sound` est
 *  PARTAGÉ par toutes les scènes d'un même `Phaser.Game`.
 *
 *  Ne DÉMARRE jamais la musique (seul `playMenuMusic` le fait, appelé
 *  explicitement par le contexte qui en veut) — mais la COUPE si les
 *  réglages ne l'autorisent plus, y compris pendant qu'elle joue. */
export function applyAudioSettings(scene: Phaser.Scene, settings: AudioSettings): void {
  current = settings;
  scene.sound.mute = !settings.master;
  scene.sound.volume = settings.volume;
  if (!musicEnabled(current)) stopMenuMusic();
}

/** Joue un SFX si sa catégorie et `master` sont actifs. */
export function playSfx(scene: Phaser.Scene, key: SfxKey): void {
  if (!sfxEnabled(current, key)) return;
  scene.sound.play(SFX[key], { volume: VOLUME[key] ?? 0.7 });
}

// ---------------------------------------------------------------------------
// Musique de menu (ADR-039). Piste unique, en boucle, jouée UNIQUEMENT dans
// MenuScene — jamais pendant un run (demande PO explicite). Distincte des SFX :
// une instance longue-durée à démarrer/arrêter, pas un tir-et-oublie.
// ---------------------------------------------------------------------------

const MUSIC_MENU: string = "music_menu";
const MUSIC_MENU_FILE: string = "music-menu.ogg";
/** Mix relatif sous le volume global (ADR-038) : un fond musical ne doit
 *  jamais dominer les SFX de gameplay. */
const MUSIC_VOLUME: number = 0.35;

export function preloadMusic(scene: Phaser.Scene): void {
  scene.load.audio(MUSIC_MENU, `assets/audio/${MUSIC_MENU_FILE}`);
}

let musicSound: Phaser.Sound.BaseSound | null = null;

/** Démarre la musique de menu si les réglages l'autorisent. Idempotent : ne
 *  redémarre pas une instance déjà en cours — `MenuScene` la rappelle à
 *  chaque `create()`, y compris après un `scene.restart()` au resize. */
export function playMenuMusic(scene: Phaser.Scene): void {
  if (!musicEnabled(current)) return;
  if (musicSound?.isPlaying) return;
  musicSound = scene.sound.add(MUSIC_MENU, { loop: true, volume: MUSIC_VOLUME });
  musicSound.play();
}

/** Arrête la musique de menu — appelé au `shutdown` de `MenuScene` (départ en
 *  run) ET par `applyAudioSettings` si la catégorie « musique » est coupée
 *  pendant qu'elle joue. */
export function stopMenuMusic(): void {
  musicSound?.stop();
  musicSound?.destroy();
  musicSound = null;
}
