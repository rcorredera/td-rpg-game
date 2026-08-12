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

/** Bornes OPAQUES d'une planche, mesurées sur son canal alpha : [début, fin]
 *  inclus de chacune des trois colonnes et des trois rangées. */
interface Sheet {
  file: string;
  cols: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
  rows: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
}

/** Coin conservé, en pixels source. Doit rester ≤ la moitié du plus petit
 *  élément habillé (ligne de liste : 44) — sinon les coins se recouvrent. */
const CORNER = 16;
/** Bande centrale échantillonnée dans la pièce du milieu : c'est elle qui est
 *  étirée par le nine-slice, 8 px suffisent et gardent la texture minuscule. */
const MID = 8;

const SHEETS: Record<string, Sheet> = {
  ts_panel: {
    file: "paper-regular.png",
    cols: [[12, 63], [128, 191], [256, 307]],
    rows: [[20, 63], [128, 191], [256, 300]],
  },
};

/** Marge de nine-slice des textures composées ici. */
export const UI_SKIN_INSET = CORNER;
/** Clé de la texture de panneau (parchemin). */
export const UI_SKIN_PANEL = "ts_panel";

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
    const src = scene.textures.get(sheetKey).getSourceImage() as CanvasImageSource;

    const size = CORNER * 2 + MID;
    const tex = scene.textures.createCanvas(key, size, size);
    if (!tex) continue;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;

    // Coordonnées source de chaque bande : coin gauche/haut pris au début de
    // l'art, coin droit/bas pris à sa FIN moins le coin (l'art n'est pas centré
    // dans sa cellule — le parchemin commence à x=12 et finit à x=307).
    const sx = [sheet.cols[0][0], sheet.cols[1][0], sheet.cols[2][1] + 1 - CORNER];
    const sy = [sheet.rows[0][0], sheet.rows[1][0], sheet.rows[2][1] + 1 - CORNER];
    const sw = [CORNER, MID, CORNER];
    const sh = [CORNER, MID, CORNER];
    const dx = [0, CORNER, CORNER + MID];
    const dy = [0, CORNER, CORNER + MID];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.drawImage(src, sx[c]!, sy[r]!, sw[c]!, sh[r]!, dx[c]!, dy[r]!, sw[c]!, sh[r]!);
      }
    }
    tex.refresh();
    tex.setFilter(NEAREST);
  }
}
