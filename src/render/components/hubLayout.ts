// ============================================================
// render/components/hubLayout.ts — Disposition du Campement (ADR-025).
//
// Le hub empilait cinq cartes identiques dans une colonne centrée de 540 unités
// de large. En paysage mobile, la largeur logique disponible avoisine 1 300 : on
// en utilisait donc 44 %, le reste en noir de part et d'autre. Et cinq entrées de
// même poids ne disent pas où aller — « Histoire », la seule action qui fait
// avancer le jeu, pesait autant que « Chroniques ».
//
// D'où deux tuiles de rangs différents : une PRINCIPALE, et des SECONDAIRES en
// grille. Sur écran étroit, la grille repasse à une colonne plutôt que d'écraser
// les tuiles.
//
// PUR : aucune dépendance Phaser ni DOM, donc testable.
// ============================================================

import { WORLD_H, WORLD_W } from "../viewport";

export interface TileBox {
  /** Centre de la tuile. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HubLayout {
  primary: TileBox;
  secondary: TileBox[];
  /** Vrai si la largeur a permis de poser principale et grille côte à côte. */
  sideBySide: boolean;
}

/**
 * Largeur logique en deçà de laquelle deux colonnes deviennent illisibles.
 *
 * Abaissé de 900 à 860 avec le passage du monde en 960×540 (ADR-027) : la zone
 * d'un menu ne descend jamais sous `WORLD_W - 80` = 880, donc à 900 le Campement
 * repassait en COLONNE UNIQUE sur tout écran 16:9 exact — et cinq tuiles empilées
 * ne tiennent plus dans 540 de haut (débordement mesuré de 23 unités sous le
 * monde). Deux colonnes y donnent des tuiles de 242×167 au lieu de 880×42.
 */
export const SIDE_BY_SIDE_MIN_WIDTH = 860;

const GAP = 16;

/** Sous le bandeau de titre (108) et son écart. */
const HUB_TOP = 150;
/** Marge basse : le dernier rang ne doit pas coller au bord du monde. */
const BOTTOM_MARGIN = 40;

/**
 * Zone utile d'un écran de menu, ANCRÉE sur le centre du monde.
 *
 * C'est ici que vit le centre horizontal, et nulle part ailleurs : écrit en dur
 * dans `MenuScene` (`400`, l'ancien 800/2), il a survécu au passage en 960×540
 * (ADR-027) et décalait tout l'écran de 80 unités vers la gauche. Le défaut est
 * invisible en paysage mobile — le débord latéral l'absorbe — et flagrant dès que
 * la largeur visible vaut celle du monde. Les tests de ce module ne vérifiaient
 * que la répartition RELATIVE à un centre passé en paramètre, jamais que ce centre
 * était le bon : la fonction pure était juste, son ancrage faux.
 */
export function menuZone(v: { width: number; bottom: number }): {
  cx: number; cy: number; w: number; h: number;
} {
  const w = Math.min(1180, v.width - 80);
  const h = Math.max(220, Math.min(v.bottom - 30, WORLD_H - BOTTOM_MARGIN) - HUB_TOP);
  return { cx: WORLD_W / 2, cy: HUB_TOP + h / 2, w, h };
}

/** Même ancrage pour la grille des chapitres, qui a la même largeur utile à 20 près. */
export function levelGridZone(v: { width: number }): { cx: number; w: number } {
  return { cx: WORLD_W / 2, w: Math.min(1180, v.width - 60) };
}

/**
 * Place une tuile principale et `count` tuiles secondaires dans la zone donnée.
 *
 * `cx`/`cy` sont le centre de la zone utile, `w`/`h` ses dimensions. Le plancher
 * `minTile` vient du plancher tactile (ADR-011) : la grille perd une colonne
 * plutôt que de descendre en dessous.
 */
export function hubLayout(
  cx: number, cy: number, w: number, h: number, count: number, minTile = 96,
): HubLayout {
  const sideBySide = w >= SIDE_BY_SIDE_MIN_WIDTH;

  if (!sideBySide) {
    // Colonne unique : la principale garde un tiers de la hauteur, le reste se
    // partage entre les secondaires.
    const primaryH = Math.max(minTile, h * 0.34);
    const restH = h - primaryH - GAP;
    // Le plancher tactile est une PRÉFÉRENCE, pas une garantie : il ne peut pas
    // être honoré en débordant de la zone. Écrit en `Math.max(minTile * 0.6, …)`,
    // il ne s'activait justement QUE lorsqu'il ne tenait pas — les tuiles sortaient
    // alors sous le bas de l'écran. Si ça ne rentre pas, c'est la zone qui gagne :
    // au caller de donner plus de place ou moins d'entrées.
    const rowH = Math.max(1, (restH - GAP * (count - 1)) / Math.max(1, count));
    const top = cy - h / 2;
    return {
      primary: { x: cx, y: top + primaryH / 2, w, h: primaryH },
      secondary: Array.from({ length: count }, (_, i) => ({
        x: cx,
        y: top + primaryH + GAP + rowH / 2 + i * (rowH + GAP),
        w, h: rowH,
      })),
      sideBySide: false,
    };
  }

  // Deux colonnes : la principale occupe la gauche sur toute la hauteur, les
  // secondaires forment une grille à droite. C'est la hiérarchie qui manquait —
  // l'action qui fait avancer le jeu doit se voir en premier.
  const leftW = Math.round((w - GAP) * 0.42);
  const rightW = w - GAP - leftW;
  const left = cx - w / 2;
  const cols = count <= 2 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const cellW = (rightW - GAP * (cols - 1)) / cols;
  const cellH = (h - GAP * (rows - 1)) / rows;

  return {
    primary: { x: left + leftW / 2, y: cy, w: leftW, h },
    secondary: Array.from({ length: count }, (_, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      return {
        x: left + leftW + GAP + cellW / 2 + col * (cellW + GAP),
        y: cy - h / 2 + cellH / 2 + row * (cellH + GAP),
        w: cellW, h: cellH,
      };
    }),
    sideBySide: true,
  };
}
