// ============================================================
// render/game/constants.ts — Constantes de rendu partagées par
// GameScene et ses modules. Voir ADR-034.
// ============================================================

import { BATTLEFIELD } from "../../core/types";

// Palette médiévale (parchemin/forêt/pierre)
// eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
export const C = {
  grass: 0x4a6741, path: 0xb59a6a, pathEdge: 0x8a7350,
  stone: 0x8d8d93, wood: 0x7a5436, slot: 0x6b5a3e,
  archer: 0x3e6b8c, catapult: 0x8c5a3e, frost: 0x7ec8e3, portal: 0x9b59b6,
  goblin: 0x77a83a, orc: 0x5a7a3a, brute: 0x6b4a3a, bat: 0x5a4a6b,
  hero: 0xc9a227, heroBlade: 0xd9d9e0, castle: 0x9a9aa5,
  hpBack: 0x222222, hpFront: 0xc0392b, gold: 0xe8c252, ui: 0x2b2118, uiText: "#f0e6d2",
} as const;

// Champ de bataille : défini par le core (source unique), pas redéclaré ici.
export const GAME_W: number = BATTLEFIELD.w;
export const GAME_H: number = BATTLEFIELD.h;

/** Libellé posé sur une plaque du pack. Crème plutôt que doré : mesuré, l'or ne
 *  garde que 0,26 d'écart de luminance sur le teal contre 0,43 pour le crème. */
export const HUD_LABEL: string = "#f7efe0";
/** Voile des modales : volontairement plus grand que tout écran plausible, pour
 *  couvrir la vue quelle que soit sa taille sans avoir à le redimensionner. */
export const VEIL: number = 4000;

// Délai UI avant l'enchaînement auto des vagues (confort, pas de l'équilibrage).
export const AUTO_WAVE_DELAY_MS: number = 2000;
