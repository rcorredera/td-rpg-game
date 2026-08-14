// ============================================================
// render/components/levelGrid.ts — Grille de niveaux (chapitres).
//
// En paysage, une liste verticale gâche la largeur et déborde dès une dizaine
// d'entrées. Les chapitres sont des items COURTS (numéro, nom, étoiles) : une
// grille les affiche tous d'un coup et occupe l'espace disponible (ADR-013).
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT } from "../theme";
import { ICON } from "../icons";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY } from "../ui";
import { touchSize } from "../viewport";
import { uiFramedPanel, uiPanelPad } from "./panel";
import { rowColors, type RowColors, type RowState } from "./listRow";
import { uiSkinInset, UI_SKIN_PANEL } from "../uiSkin";

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
 * Proportion maximale hauteur/largeur d'une cellule.
 *
 * La grille remplit la hauteur qu'on lui donne, mais une vignette de chapitre
 * plus haute que large cesse de ressembler à une carte : deux rangées dans les
 * ~380 unités libres de l'écran Histoire donneraient sinon des cellules de
 * 172×185, en portrait.
 */
const MAX_ASPECT: number = 0.85;

/**
 * Pure — répartit `count` tuiles dans la place disponible.
 *
 * On vise `maxCols` colonnes mais on n'en garde jamais plus que nécessaire :
 * 3 chapitres sur 5 colonnes donneraient des tuiles perdues à droite. La
 * largeur de cellule s'ajuste ensuite pour remplir l'espace.
 *
 * `availH` est FACULTATIF : sans lui, la cellule garde sa hauteur plancher — et
 * c'est précisément ce que faisait l'écran Histoire, qui posait 10 vignettes de
 * 74 dans les 380 unités disponibles et laissait 40 % de l'écran vide sous la
 * grille. Avec, la cellule grandit jusqu'à occuper la hauteur offerte.
 */
export function gridLayout(
  count: number, availW: number, maxCols: number, gap: number, minCellH: number,
  availH?: number,
): GridLayout {
  const cols: number = Math.max(1, Math.min(maxCols, count));
  const rows: number = Math.ceil(count / Math.max(1, cols));
  const cellW: number = (availW - gap * (cols - 1)) / cols;
  const grown: number = availH === undefined || rows === 0
    ? minCellH
    : (availH - gap * (rows - 1)) / rows;
  const cellH: number = Math.max(minCellH, Math.min(grown, cellW * MAX_ASPECT));
  return {
    cols, rows, cellW, cellH,
    totalW: cols * cellW + gap * (cols - 1),
    totalH: rows * cellH + gap * (rows - 1),
  };
}

/**
 * Nombre de lignes RÉSERVÉES au nom de chapitre. « Les Faubourgs en cendres » en
 * occupe deux ; au-delà, le nom est tronqué plutôt que de mordre les étoiles.
 */
export const NAME_LINES: number = 2;

export interface LevelCellOpts {
  /** Hauteur de la cellule. */
  h: number;
  /** Marge intérieure, dérivée de l'ornement du panneau (ADR-030). */
  pad: number;
  /** Hauteurs MESURÉES, pas les tailles de police demandées : Phaser rend un
   *  texte nettement plus haut que son `fontSize` (34 pour 26 demandés, relevé). */
  numH: number;
  lineH: number;
  starSize: number;
  gap: number;
}

export interface LevelCellBox {
  numTop: number;
  nameTop: number;
  /** Hauteur disponible pour le nom avant la bande d'étoiles. */
  nameMaxH: number;
  /** Centre vertical de la rangée d'étoiles. */
  starCy: number;
}

/**
 * Hauteur minimale d'une vignette pour que numéro, nom et étoiles coexistent.
 *
 * La bande d'étoiles est réservée MÊME sur un chapitre non conquis : sans quoi
 * les noms sauteraient d'une vignette à l'autre selon qu'elle est gagnée ou non.
 */
export function levelCellMinH(o: Omit<LevelCellOpts, "h">): number {
  return 2 * o.pad + o.numH + o.gap + NAME_LINES * o.lineH + o.gap + o.starSize;
}

/**
 * Pure — empile numéro, nom et étoiles dans une vignette.
 *
 * Existe parce que les trois éléments obéissaient à deux règles CONCURRENTES :
 * le texte s'empilait depuis le haut sans borne, les étoiles étaient épinglées
 * en bas, et rien ne réservait la bande entre les deux. Mesuré sur le chapitre 2,
 * le nom finissait 9,2 unités PAR-DESSUS les étoiles dès qu'il passait à deux
 * lignes. Deux règles qui ne se parlent pas finissent toujours par se croiser.
 */
export function levelCellLayout(o: LevelCellOpts): LevelCellBox {
  const numTop: number = -o.h / 2 + o.pad;
  const nameTop: number = numTop + o.numH + o.gap;
  const starCy: number = o.h / 2 - o.pad - o.starSize / 2;
  return { numTop, nameTop, starCy, nameMaxH: starCy - o.starSize / 2 - o.gap - nameTop };
}

export interface LevelTile {
  /** Numéro affiché en gros (1-based). */
  index: number;
  name: string;
  state: RowState;
  /** Étoiles obtenues (0-3) ; non affichées si le niveau n'est pas conquis. */
  stars?: number;
  /**
   * Clé de texture de sol du chapitre — la vignette montre alors le LIEU (ADR-025).
   * Dix cases numérotées identiques ne disent rien de ce qui attend le joueur ;
   * un aperçu du biome les rend reconnaissables d'un coup d'œil. Omise sur un
   * chapitre verrouillé : le lieu fait partie de ce qu'on découvre.
   */
  biomeTexture?: string;
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
  /** Hauteur offerte à la grille — elle s'y étale au lieu de laisser du vide. */
  availH?: number,
): UiLevelGrid {
  const gap: number = 10;
  // La tuile doit rester tapable ET loger son contenu : numéro, nom sur deux
  // lignes, étoiles. Les polices sont remontées sur petit écran (ADR-015), donc
  // une hauteur fixe faisait déborder le nom hors de la tuile.
  //
  // Hauteurs MESURÉES sur des sondes, et non les tailles de police demandées :
  // Phaser rend un texte ~1,25× plus haut que son `fontSize`, et c'est cet écart
  // qui manquait au plancher — le nom du chapitre 2 recouvrait les étoiles.
  // La sonde reçoit la taille DEMANDÉE : `scene.add.text` applique déjà
  // `scaleFont` (main.ts, ADR-015). La repasser ici la compterait deux fois.
  const sonde = (size: number, famille: string): number => {
    const t: Phaser.GameObjects.Text = scene.add.text(0, 0, "Ag", { fontSize: `${size}px`, fontFamily: famille });
    const h: number = t.height;
    t.destroy();
    return h;
  };
  const numH: number = sonde(26, FONT_DISPLAY);
  const lineH: number = sonde(12, FONT_BODY);
  const cellGap: number = 4;
  // L'étoile suit la POLICE, pas la cellule. Dérivée de `cellH` (× 0,13) elle
  // entrait dans une boucle : la hauteur de cellule dépend de la bande d'étoiles,
  // qui dépendrait de la hauteur de cellule. Et une note se lit à côté d'un nom,
  // donc c'est bien à ce nom qu'elle doit être calée.
  const starSize: number = Math.max(12, Math.round(lineH * 0.8));
  const minCellH: number = Math.max(
    touchSize(74),
    levelCellMinH({ pad: uiPanelPad(scene), numH, lineH, starSize, gap: cellGap }),
  );
  const layout: GridLayout = gridLayout(tiles.length, availW, maxCols, gap, minCellH, availH);
  const cellH: number = layout.cellH;
  const container: Phaser.GameObjects.Container = scene.add.container(0, 0);
  const x0: number = cx - layout.totalW / 2 + layout.cellW / 2;

  tiles.forEach((t, i) => {
    const col: number = i % layout.cols;
    const row: number = Math.floor(i / layout.cols);
    const x: number = x0 + col * (layout.cellW + gap);
    const y: number = top + cellH / 2 + row * (cellH + gap);
    const colors: RowColors = rowColors(t.state);

    const cell: Phaser.GameObjects.Container = scene.add.container(x, y);
    const { container: panel } = uiFramedPanel(scene, 0, 0, {
      w: layout.cellW, h: cellH, tint: colors.fill, borderColor: colors.border, radius: 10,
    });
    cell.add(panel);

    // Aperçu du lieu, fortement assombri : il doit se deviner derrière le texte,
    // pas lui disputer la lisibilité (le numéro reste l'information première).
    if (t.biomeTexture && scene.textures.exists(t.biomeTexture)) {
      // Rectangle en retrait plutôt qu'un masque arrondi : un masque géométrique
      // travaille en coordonnées MONDE, or la grille vit dans un conteneur
      // défilant — il se décalait et masquait tout. Le retrait suffit à ce que le
      // cadre arrondi reste net par-dessus.
      // Retrait dérivé de la marge RÉELLE de l'habillage : à 7 unités, l'aperçu
      // recouvrait le liseré doré du panneau ouvragé du pack, qui court à ~9 du
      // bord. Une valeur en dur redevient fausse au premier changement de planche.
      const inset: number = Math.max(7, uiSkinInset(UI_SKIN_PANEL) * 0.6);
      cell.add(scene.add.tileSprite(
        0, 0, layout.cellW - inset * 2, cellH - inset * 2, t.biomeTexture,
      ).setAlpha(0.4));
    }

    // Numéro, nom et étoiles placés par UN seul calcul : c'est ce qui garantit
    // qu'ils ne se croisent pas. La marge vient de l'ORNEMENT, pas d'un chiffre —
    // à 6 unités du bord, le numéro se posait sur la volute d'angle (marge 22).
    const box: LevelCellBox = levelCellLayout({
      h: cellH, pad: uiPanelPad(scene), numH, lineH, starSize, gap: cellGap,
    });
    const num: Phaser.GameObjects.Text = scene.add.text(0, box.numTop, String(t.index), {
      fontSize: "26px", color: t.state === "locked" ? TEXT.dim : TEXT.gold, fontFamily: FONT_DISPLAY,
    }).setOrigin(0.5, 0);
    // `maxLines` : le nom ne peut PLUS déborder de la bande qui lui est réservée,
    // quelle que soit la longueur qu'on donnera un jour à un chapitre. Sans lui,
    // la garantie de `levelCellLayout` ne tiendrait qu'aux noms d'aujourd'hui.
    const name: Phaser.GameObjects.Text = scene.add.text(0, box.nameTop, t.name, {
      fontSize: "12px", color: colors.titleColor, fontFamily: FONT_BODY,
      align: "center", maxLines: NAME_LINES,
      wordWrap: { width: layout.cellW - uiPanelPad(scene) * 2 },
    }).setOrigin(0.5, 0);
    cell.add([num, name]);

    if (t.state === "done") {
      // Trois étoiles du REGISTRE d'icônes (ADR-012), et non les glyphes Unicode
      // « ★ / ☆ » : ceux-là sont rendus par la police du système, donc changent
      // d'aspect d'un appareil à l'autre et échappent à la palette — exactement
      // ce qu'on s'interdit pour les emojis. Le pack Tiny Swords n'offre rien qui
      // note un niveau, elles sont donc dessinées pour le projet.
      const s: number = t.stars ?? 0;
      const size: number = starSize;
      const gapS: number = Math.round(size * 0.28);
      const y: number = box.starCy;
      for (let k: number = 0; k < 3; k++) {
        const gagnee: boolean = k < s;
        // L'étoile non gagnée garde l'OR, en transparence. Teintée avec
        // `ACCENT.locked`, elle avait la luminance du panneau et disparaissait :
        // le joueur ne voyait plus qu'il manquait des étoiles, il croyait qu'il
        // n'y en avait pas du tout.
        cell.add(scene.add.image((k - 1) * (size + gapS), y, gagnee ? ICON.star : ICON.starEmpty)
          .setDisplaySize(size, size)
          .setTint(ACCENT.goldSoft)
          .setAlpha(gagnee ? 1 : 0.3));
      }
    }

    if (t.onSelect) {
      const zone: Phaser.GameObjects.Zone = scene.add.zone(0, 0, layout.cellW, cellH).setInteractive({ cursor: CURSOR_POINT });
      const hl: Phaser.GameObjects.Graphics = scene.add.graphics();
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
