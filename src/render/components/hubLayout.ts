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

/** Largeur logique en deçà de laquelle deux colonnes deviennent illisibles. */
export const SIDE_BY_SIDE_MIN_WIDTH = 900;

const GAP = 16;

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
    const rowH = Math.max(minTile * 0.6, (restH - GAP * (count - 1)) / Math.max(1, count));
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
