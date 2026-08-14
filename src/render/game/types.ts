// ============================================================
// render/game/types.ts — Types partagés par GameScene et ses
// modules de rendu (render/game/*.ts). Voir ADR-034.
// ============================================================

import type { ProjectileStyle } from "../projectiles";
import type { Vec2 } from "../../core/types";

/** Clés des éléments du HUD. Un type fermé plutôt que des chaînes libres : une
 *  clé mal orthographiée à un point d'accès (`hudTexts["glod"]`) ne
 *  désynchronise plus silencieusement l'affichage, elle ne compile pas. */
export type HudKey =
  | "gold" | "castle" | "wave" | "portalWarn"
  | "spell" | "rally" | "ww" | "speed" | "auto" | "nextWave";

/** Effet transitoire (sort, impact). `kind` choisit le rendu : chaque sort doit
 *  être reconnaissable à sa forme, pas seulement à sa couleur (ADR-016). */
export interface FxEffect {
  pos: Vec2; radius: number; until: number;
  life?: number; color?: number; kind?: "whirl" | "rally" | "arrows";
}

/** Projectile en vol : porte son style (ADR-016) et l'instant de départ, pour
 *  être interpolé le long de sa trajectoire au lieu d'être un trait fixe.
 *  `hit` retient si l'impact a déjà été émis, pour ne le déclencher qu'une fois. */
export interface ShotFx {
  from: Vec2; to: Vec2; start: number; until: number; style: ProjectileStyle; hit?: boolean;
}

/** Entrée du menu de slot (construire / améliorer / spécialiser / vendre).
 *  `cb: null` = entrée désactivée (or insuffisant) : grisée, coût en rouge. */
export interface SlotMenuEntry {
  label: string; sub?: string; sub2?: string; cb: (() => void) | null; color?: string;
}

/** Direction du regard d'une entité : dernière abscisse connue + face (-1/1). */
export interface FacingState { x: number; face: number }

/** Contexte de construction du HUD, calculé une fois par `Hud.build` : habillage
 *  actif et dimensions dont dépendent tous ses boutons. */
export interface HudBuildCtx {
  skin: boolean;
  cy: number;
  btnH: number;
  iconS: number;
}
