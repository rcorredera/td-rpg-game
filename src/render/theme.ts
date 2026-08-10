// ============================================================
// render/theme.ts — Tokens visuels centralisés (couleurs, teintes).
// Un reskin de palette = ce fichier. N'importe RIEN de Phaser ici :
// ce sont des constantes pures, réutilisées par GameScene/MenuScene/ui.
// ============================================================

/** Palette médiévale (parchemin / forêt / pierre). */
export const C = {
  // Terrain & décor (fallback procédural ; les tuiles Tiny prennent le relais en Phase 2)
  grass: 0x4a6741, path: 0xb59a6a, pathEdge: 0x8a7350,
  stone: 0x8d8d93, wood: 0x7a5436, slot: 0x6b5a3e,
  // Familles de tours
  archer: 0x3e6b8c, catapult: 0x8c5a3e, frost: 0x7ec8e3, portal: 0x9b59b6,
  // Familles d'ennemis (teintes de secours / barres)
  goblin: 0x77a83a, orc: 0x5a7a3a, brute: 0x6b4a3a, bat: 0x5a4a6b,
  // Héros
  hero: 0xc9a227, heroBlade: 0xd9d9e0, castle: 0x9a9aa5,
  // Barres de vie & HUD
  hpBack: 0x222222, hpFront: 0xc0392b, gold: 0xe8c252, ui: 0x2b2118, uiText: "#f0e6d2",
} as const;

/** Couleurs sémantiques réutilisées (barres de PV, états). */
export const STATUS = {
  hpGood: 0x27ae60, hpWarn: 0xe8c252, hpBad: 0xc0392b,
  burn: 0xe67e22, frostRing: 0x7ec8e3,
} as const;

/** Teintes appliquées aux éléments gris du pack Kenney UI (multiplication → bois/pierre). */
export const UI_TINT = {
  panel: 0x3a2f22,      // panneau standard (brun sombre)
  panelDim: 0x2c241b,   // panneau verrouillé/inactif
  btn: 0x8a7350,        // bouton secondaire (bois)
} as const;

/** Couleurs de texte (chaînes CSS) — source unique pour tout render/, remplace
 *  les constantes locales dupliquées dans MenuScene/GameScene (ADR-007). */
export const TEXT = {
  gold: "#e8c252",   // titres, montants, accents
  dim: "#a89878",    // sous-titres, texte secondaire, verrouillé
  light: "#f0e6d2",  // corps de texte principal
  ok: "#27ae60",     // acquis / victoire / conquis
  bad: "#c0392b",    // coût inabordable / défaite
  warn: "#e8a87c",   // avertissement doux (quitter, groundOnly)
  sceau: "#c97ba2",  // monnaie Sceaux
  rift: "#b07cc6",   // Failles (texte)
} as const;

/** Teintes de bordure/accent (nombres, pour Graphics/nine-slice) — même principe que TEXT. */
export const ACCENT = {
  gold: 0xc9a227,        // bordure active/focus
  goldSoft: 0xe8c252,    // survol
  locked: 0x4a3f2e,      // bordure verrouillé
  lockedFill: 0x221b12,  // fond verrouillé
  dimBorder: 0x6b5a3e,   // bordure inactive douce
  won: 0x27ae60,         // bordure "conquis"
} as const;
