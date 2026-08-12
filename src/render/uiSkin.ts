// ============================================================
// render/uiSkin.ts — Chrome d'UI composé depuis le pack Tiny Swords (CC0).
//
// Trois obstacles, tous mesurés plutôt que devinés :
//
// 1. Les planches du pack ne sont PAS des nine-slice contigus : chaque élément
//    est une grille 3×3 de pièces SÉPARÉES par un pas de grille, avec en plus du
//    vide transparent autour de l'art. `scene.add.nineslice` exige une texture
//    contiguë — on recompose donc la planche une fois, sur canvas, exactement
//    comme `terrain.ts` génère le sol.
//
// 2. Les pièces font 64×64, ce qui donnerait des marges de nine-slice plus
//    grandes que la moitié des petits éléments (une ligne de liste fait 44 de
//    haut) : les coins se chevaucheraient. On ROGNE donc les coins à `CORNER`
//    px depuis le bord de l'art, au lieu de réduire la planche — le pixel art
//    garde sa densité 1:1, ce qu'une mise à l'échelle détruirait.
//
// 3. Le jeu tourne en filtrage LINEAR (le skin des unités est vectoriel,
//    ADR-016). Le filtre est forcé à NEAREST sur CES textures uniquement : un
//    pixel art filtré en linéaire bave, et basculer le réglage global
//    ramollirait tout le reste.
//
// ⚠ Base CLAIRE obligatoire : `setTint` MULTIPLIE (piège récurrent du projet).
// Le parchemin crème se teinte donc vers n'importe quel thème d'ADR-026, là où
// une planche bleue ne pourrait jamais devenir dorée.
// ============================================================

// `import TYPE` et non `import` : ce module est atteint depuis `components/`
// (via `panel.ts`), et importer Phaser comme VALEUR y lit `window` dès le
// chargement — ce qui casse les tests unitaires purs sous Vitest. Piège déjà
// payé une fois sur `ui.ts` (cf. `.ai/pitfalls.md`).
import type Phaser from "phaser";

const SRC = "assets/tiny-swords/ui";

/** `Phaser.Textures.FilterMode.NEAREST`, écrit en littéral pour la même raison :
 *  le nommer passerait par le namespace Phaser, donc par un import de valeur. */
const NEAREST = 1 as Phaser.Textures.FilterMode;

/**
 * Découpe d'une planche : rectangles des CELLULES de la grille, `[origine,
 * taille]` par colonne et par rangée.
 *
 * On décrit la grille, pas l'art : chaque pièce flotte dans sa cellule avec du
 * vide autour, et pas de la même façon d'une pièce à l'autre. Une première
 * version mesurait les bornes opaques par BANDE (union des trois pièces d'une
 * rangée) et échantillonnait au bord de cette bande — ce qui attrapait du vide
 * là où une pièce commence plus tard, et le contour de la voisine ailleurs :
 * bandes transparentes en haut du panneau et couture verticale au milieu,
 * visibles à l'écran. Les bornes sont donc mesurées PIÈCE PAR PIÈCE, à
 * l'exécution.
 */
interface Sheet {
  file: string;
  cols: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  rows: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  /** Coin conservé, par planche. Un panneau peut s'offrir 16 px ; un BOUTON non :
   *  à 36 de haut, deux coins de 16 n'en laissent que 4 de centre et la plaque
   *  paraît écrasée. Doit rester ≤ la moitié du plus petit élément habillé. */
  corner?: number;
}

interface Box { x: number; y: number; w: number; h: number }

/** Bornes opaques dans un rectangle de la planche, ou `null` si tout est vide. */
function opaqueBounds(
  data: Uint8ClampedArray, sheetW: number, x0: number, y0: number, w: number, h: number,
): Box | null {
  let minX = x0 + w, minY = y0 + h, maxX = x0 - 1, maxY = y0 - 1;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (data[(y * sheetW + x) * 4 + 3]! <= 40) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < minX ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Coin conservé, en pixels source. Doit rester ≤ la moitié du plus petit
 *  élément habillé (ligne de liste : 44) — sinon les coins se recouvrent. */
const CORNER = 16;
/** Bande centrale échantillonnée dans la pièce du milieu : c'est elle qui est
 *  étirée par le nine-slice, 8 px suffisent et gardent la texture minuscule. */
const MID = 8;

/** Toutes les planches carrées du pack partagent cette grille (pièces 64×64,
 *  posées aux offsets 0/128/256 d'une planche de 320). */
const SQUARE: Pick<Sheet, "cols" | "rows"> = {
  cols: [[0, 64], [128, 64], [256, 64]],
  rows: [[0, 64], [128, 64], [256, 64]],
};

const BTN_CORNER = 10;

const SHEETS: Record<string, Sheet> = {
  ts_panel: { file: "paper-regular.png", ...SQUARE },
  ts_btn: { file: "btn-big-blue.png", ...SQUARE, corner: BTN_CORNER },
  ts_btn_press: { file: "btn-big-blue-pressed.png", ...SQUARE, corner: BTN_CORNER },
  ts_btn_primary: { file: "btn-big-red.png", ...SQUARE, corner: BTN_CORNER },
  ts_btn_primary_press: { file: "btn-big-red-pressed.png", ...SQUARE, corner: BTN_CORNER },
};

/** Marge de nine-slice à passer à `scene.add.nineslice` pour une texture composée. */
export function uiSkinInset(key: string): number {
  return SHEETS[key]?.corner ?? CORNER;
}

/** Marge de nine-slice des textures composées ici. */
export const UI_SKIN_INSET = CORNER;
/** Clé de la texture de panneau (parchemin). */
export const UI_SKIN_PANEL = "ts_panel";
/** Boutons du pack : bleu au repos, rouge pour l'action principale, chacun avec
 *  son état enfoncé. Contrairement au parchemin, ces planches sont COLORÉES et
 *  ne se teintent donc pas par thème (`setTint` multiplie : un bleu ne peut pas
 *  devenir doré) — elles portent leur propre gamme, assumée. */
export const UI_SKIN_BTN = "ts_btn";
export const UI_SKIN_BTN_PRESS = "ts_btn_press";
export const UI_SKIN_BTN_PRIMARY = "ts_btn_primary";
export const UI_SKIN_BTN_PRIMARY_PRESS = "ts_btn_primary_press";

/** Le chrome du pack est-il disponible ? Sert aux composants à choisir entre
 *  l'habillage dessiné et leur repli Kenney. */
export function uiSkinActive(scene: Phaser.Scene): boolean {
  return scene.textures.exists(UI_SKIN_PANEL);
}

/** À appeler dans le `preload()` de chaque scène qui affiche du chrome d'UI. */
export function preloadUiSkin(scene: Phaser.Scene): void {
  for (const [key, s] of Object.entries(SHEETS)) {
    scene.load.image(`${key}__sheet`, `${SRC}/${s.file}`);
  }
}

/**
 * Recompose les nine-slice contigus. Idempotent : les composants l'appellent à
 * chaque usage, le premier fait le travail et les suivants sortent aussitôt.
 */
export function ensureUiSkinTextures(scene: Phaser.Scene): void {
  for (const [key, sheet] of Object.entries(SHEETS)) {
    if (scene.textures.exists(key)) continue;
    const sheetKey = `${key}__sheet`;
    if (!scene.textures.exists(sheetKey)) continue; // planche pas encore chargée
    const img = scene.textures.get(sheetKey).getSourceImage() as HTMLImageElement;

    // Relevé du canal alpha de la planche, une fois : c'est lui qui dit où
    // commence et finit CHAQUE pièce dans sa cellule.
    const probe = document.createElement("canvas");
    probe.width = img.width;
    probe.height = img.height;
    const pctx = probe.getContext("2d");
    if (!pctx) continue;
    pctx.drawImage(img, 0, 0);
    const data = pctx.getImageData(0, 0, img.width, img.height).data;

    const corner = sheet.corner ?? CORNER;
    const size = corner * 2 + MID;
    const tex = scene.textures.createCanvas(key, size, size);
    if (!tex) continue;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;

    const dx = [0, corner, corner + MID];
    const dy = [0, corner, corner + MID];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = opaqueBounds(
          data, img.width,
          sheet.cols[c]![0], sheet.rows[r]![0], sheet.cols[c]![1], sheet.rows[r]![1],
        );
        if (!cell) continue;
        // Colonne/rangée du MILIEU : on prélève une bande au CENTRE de la pièce,
        // jamais à son bord — un bord porte le contour, qui se répéterait en
        // couture une fois étiré. Colonnes/rangées extrêmes : on garde le coin
        // du bon côté, à la densité 1:1.
        const sw = c === 1 ? MID : corner;
        const sh = r === 1 ? MID : corner;
        const sx = c === 0 ? cell.x
          : c === 1 ? cell.x + Math.floor((cell.w - MID) / 2)
          : cell.x + cell.w - corner;
        const sy = r === 0 ? cell.y
          : r === 1 ? cell.y + Math.floor((cell.h - MID) / 2)
          : cell.y + cell.h - corner;
        ctx.drawImage(img, sx, sy, sw, sh, dx[c]!, dy[r]!, sw, sh);
      }
    }
    tex.refresh();
    tex.setFilter(NEAREST);
  }
}
