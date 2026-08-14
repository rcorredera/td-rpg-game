// ============================================================
// render/menu/types.ts — Types partagés par MenuScene et les
// écrans du Campement (render/menu/*View.ts). Voir ADR-034.
// ============================================================

import type Phaser from "phaser";
import type { ProfileService } from "../../meta/profile";

export type View = "home" | "story" | "rifts" | "shop" | "chronicles" | "bestiary";
export type ShopTab = "arsenal" | "forge" | "hero";
export type BestiaryTab = "creatures" | "defenses";

/** Contexte passé à chaque écran : la scène pour créer des objets Phaser, le
 *  panel courant où les ajouter (recréé à chaque `showView`), et les points
 *  d'entrée vers l'état que seule MenuScene possède. */
export interface MenuCtx {
  scene: Phaser.Scene;
  panel: Phaser.GameObjects.Container;
  profileSvc: ProfileService;
  /** Bas des chips de monnaie, mesuré : `header()` s'ancre dessous. */
  chipsBottomY: number;
  navigate: (view: View) => void;
  refreshCurrencies: () => void;
}
