// ============================================================
// render/components/levelGrid.ts — Grille de niveaux (chapitres).
//
// En paysage, une liste verticale gâche la largeur et déborde dès une dizaine
// d'entrées. Les chapitres sont des items COURTS (numéro, nom, étoiles) : une
// grille les affiche tous d'un coup et occupe l'espace disponible (ADR-013).
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT } from "../theme";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY } from "../ui";
import { scaleFont, touchSize } from "../viewport";
import { uiFramedPanel } from "./panel";
import { rowColors, type RowState } from "./listRow";

export interface GridLayout {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  /** Largeur totale occupée — sert à centrer la grille. */
  totalW: number;
  totalH: number;
}

/**
 * Pure — répartit `count` tuiles dans une largeur disponible.
 *
 * On vise `maxCols` colonnes mais on n'en garde jamais plus que nécessaire :
 * 3 chapitres sur 5 colonnes donneraient des tuiles perdues à droite. La
 * largeur de cellule s'ajuste ensuite pour remplir l'espace.
 */
export function gridLayout(
  count: number, availW: number, maxCols: number, gap: number, cellH: number,
): GridLayout {
  const cols = Math.max(1, Math.min(maxCols, count));
  const rows = Math.ceil(count / Math.max(1, cols));
  const cellW = (availW - gap * (cols - 1)) / cols;
  return {
    cols, rows, cellW, cellH,
    totalW: cols * cellW + gap * (cols - 1),
    totalH: rows * cellH + gap * (rows - 1),
  };
}

export interface LevelTile {
  /** Numéro affiché en gros (1-based). */
  index: number;
  name: string;
  state: RowState;
  /** Étoiles obtenues (0-3) ; non affichées si le niveau n'est pas conquis. */
  stars?: number;
  onSelect?: () => void;
}

export interface UiLevelGrid {
  container: Phaser.GameObjects.Container;
  layout: GridLayout;
}

/** Grille de tuiles de niveau, centrée horizontalement sur `cx`. */
export function uiLevelGrid(
  scene: Phaser.Scene, cx: number, top: number,
  tiles: LevelTile[], availW: number, maxCols = 5,
): UiLevelGrid {
  const gap = 10;
  // La tuile doit rester tapable ET loger son contenu : numéro, nom sur deux
  // lignes, étoiles. Les polices sont remontées sur petit écran (ADR-015), donc
  // une hauteur fixe faisait déborder le nom hors de la tuile.
  const numH = scaleFont(26), nameH = scaleFont(12);
  const cellH = Math.max(touchSize(74), numH + nameH * 2 + 30);
  const layout = gridLayout(tiles.length, availW, maxCols, gap, cellH);
  const container = scene.add.container(0, 0);
  const x0 = cx - layout.totalW / 2 + layout.cellW / 2;

  tiles.forEach((t, i) => {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = x0 + col * (layout.cellW + gap);
    const y = top + cellH / 2 + row * (cellH + gap);
    const colors = rowColors(t.state);

    const cell = scene.add.container(x, y);
    const { container: panel } = uiFramedPanel(scene, 0, 0, {
      w: layout.cellW, h: cellH, tint: colors.fill, borderColor: colors.border, radius: 10,
    });
    cell.add(panel);

    // Numéro et nom empilés d'après leurs hauteurs réelles, le bloc étant remonté
    // pour laisser la place aux étoiles en bas.
    const num = scene.add.text(0, 0, String(t.index), {
      fontSize: "26px", color: t.state === "locked" ? TEXT.dim : TEXT.gold, fontFamily: FONT_DISPLAY,
    }).setOrigin(0.5, 0);
    const name = scene.add.text(0, 0, t.name, {
      fontSize: "12px", color: colors.titleColor, fontFamily: FONT_BODY,
      align: "center", wordWrap: { width: layout.cellW - 12 },
    }).setOrigin(0.5, 0);
    const top0 = -cellH / 2 + 6;
    num.setY(top0);
    name.setY(top0 + num.height + 2);
    cell.add([num, name]);

    if (t.state === "done") {
      const s = t.stars ?? 0;
      cell.add(scene.add.text(0, cellH / 2 - 14, "★".repeat(s) + "☆".repeat(3 - s), {
        fontSize: "13px", color: TEXT.gold, fontFamily: FONT_BODY,
      }).setOrigin(0.5));
    }

    if (t.onSelect) {
      const zone = scene.add.zone(0, 0, layout.cellW, cellH).setInteractive({ cursor: CURSOR_POINT });
      const hl = scene.add.graphics();
      hl.fillStyle(ACCENT.gold, 0.09);
      hl.fillRoundedRect(-layout.cellW / 2, -cellH / 2, layout.cellW, cellH, 10);
      hl.setVisible(false);
      cell.add(hl);
      zone.on("pointerover", () => hl.setVisible(true));
      zone.on("pointerout", () => hl.setVisible(false));
      zone.on("pointerup", () => t.onSelect!());
      cell.add(zone);
    } else {
      panel.setAlpha(0.75);
    }
    container.add(cell);
  });

  return { container, layout };
}
