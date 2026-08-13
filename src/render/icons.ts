// ============================================================
// render/icons.ts — Registre des icônes d'UI (ADR-012).
//
// Même principe que sprites.ts pour le monde (ADR-005) : un point de swap
// unique. Les écrans nomment un rôle (`story`, `armory`…), jamais un fichier
// ni un emoji — changer d'iconographie ne touche que ce fichier.
//
// Les SVG sont monochromes blancs : la couleur vient de `setTint` au rendu,
// donc une même icône sert en or, en gris verrouillé ou en violet de Faille.
// ============================================================

import type Phaser from "phaser";

/** Rôle d'icône → clé de texture Phaser. */
export const ICON = {
  story: "ui_scroll",
  rift: "ui_portal",
  armory: "ui_shield",
  bestiary: "ui_book",
  chronicles: "ui_banner",
  locked: "ui_lock",
  castle: "ui_castle",
} as const;

export type IconKey = keyof typeof ICON;

/** Fichier source de chaque icône (dossier `public/assets/icons/`). */
const FILES: Record<IconKey, string> = {
  story: "ui-scroll.svg",
  rift: "ui-portal.svg",
  armory: "ui-shield.svg",
  bestiary: "ui-book.svg",
  chronicles: "ui-banner.svg",
  locked: "ui-lock.svg",
  castle: "ui-castle.svg",
};

/**
 * Résolution de rasterisation. Les SVG sont vectoriels, mais Phaser les rasterise
 * une fois au chargement — cette valeur est donc le plafond d'affichage NET.
 *
 * Exportée parce que c'est un plafond d'AFFICHAGE, pas un détail de chargement :
 * `composeTile` agrandit l'icône jusqu'à la place disponible et doit s'arrêter
 * là, sinon la tuile gagne en surface ce qu'elle perd en netteté.
 *
 * Portée de 128 à 192 avec la refonte des tuiles : la tuile principale du
 * Campement offre 306 unités de zone utile, et un plafond à 128 y laissait 43 %
 * de vide que rien d'autre ne pouvait combler. Coût : 7 icônes × 192² × 4 o ≈ 1 Mo.
 */
export const ICON_RASTER_PX = 192;

/** Charge toutes les icônes d'UI. Idempotent entre scènes (cache Phaser). */
export function preloadIcons(scene: Phaser.Scene): void {
  for (const key of Object.keys(FILES) as IconKey[]) {
    scene.load.svg(ICON[key], `assets/icons/${FILES[key]}`, { width: ICON_RASTER_PX, height: ICON_RASTER_PX });
  }
}
