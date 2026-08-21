// ============================================================
// render/game/types.ts — Types partagés par GameScene et ses
// modules de rendu (render/game/*.ts). Voir ADR-034.
// ============================================================

import type { ProjectileStyle } from "../world/projectiles";
import type { Vec2 } from "../../core/types";
import type { Facing } from "../world/facing";

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
/**
 * Direction de marche d'une entité : dernière position connue et orientation.
 *
 * La position est retenue sur les DEUX axes depuis ADR-067. N'en suivre que
 * l'abscisse rendait les segments verticaux invisibles au rendu, et une créature
 * dessinée de profil descendait vers le Bastion en marchant de côté.
 */
export interface FacingState { x: number; y: number; facing: Facing }

/** Contexte de construction du HUD, calculé une fois par `Hud.build` : habillage
 *  actif et dimensions dont dépendent tous ses boutons. */
export interface HudBuildCtx {
  skin: boolean;
  cy: number;
  btnH: number;
  iconS: number;
}
