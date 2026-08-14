// ============================================================
// render/menu/storyView.ts — Écran Histoire : grille des chapitres.
// Voir ADR-013, ADR-025, ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CONTENT } from "../../content/index";
import { TEXT } from "../theme";
import { viewport } from "../viewport";
import { ensureTerrainTextures, grassTextureKey } from "../terrain";
import { levelGridZone, uiLevelGrid, type LevelGridZone, type LevelTile, type RowState, type UiLevelGrid, type UiScrollList } from "../components";
import { header, scrollArea } from "./helpers";
import { CX, TXT } from "./theme";
import type { MenuCtx } from "./types";

export function buildStory(ctx: MenuCtx): void {
  const top: number = header(ctx, "Histoire");

  // Déblocage séquentiel : conquérir le chapitre précédent pour ouvrir le suivant
  const isUnlocked = (i: number): boolean =>
    CONTENT.chapters[i]!.playable && (i === 0 || ctx.profileSvc.chapterWon(i - 1));

  // Grille plutôt que liste : les chapitres sont des items courts et nombreux.
  // En paysage, une liste verticale gâche la largeur et déborde dès 10 entrées,
  // là où une grille les montre tous d'un coup (ADR-013).
  const scroll: UiScrollList = scrollArea(ctx, top);
  const c: Phaser.GameObjects.Container = scroll.content;
  // Les textures de sol sont générées à la demande côté jeu (ADR-023) ; l'écran
  // Histoire en a besoin aussi pour l'aperçu des vignettes.
  for (const ch of CONTENT.chapters) ensureTerrainTextures(ctx.scene, ch.biome);

  const tiles: LevelTile[] = CONTENT.chapters.map((ch, i) => {
    const won: boolean = ctx.profileSvc.chapterWon(i);
    const unlocked: boolean = isUnlocked(i);
    return {
      index: i + 1,
      name: unlocked || won ? ch.name : "???",
      state: (won ? "done" : unlocked ? "normal" : "locked") as RowState,
      stars: won ? ctx.profileSvc.chapterStarsOf(i) : 0,
      // Le lieu se découvre : un chapitre verrouillé garde son décor caché.
      biomeTexture: unlocked || won ? grassTextureKey(ch.biome) : undefined,
      onSelect: unlocked
        ? () => ctx.scene.scene.start("game", { profileSvc: ctx.profileSvc, chapterIndex: i })
        : undefined,
    };
  });
  // La grille s'élargit avec l'écran : bornée à 700, elle laissait un tiers du
  // paysage inutilisé alors qu'elle est l'écran le plus consulté du jeu (ADR-025).
  const gz: LevelGridZone = levelGridZone(viewport());
  // La grille reçoit aussi la HAUTEUR disponible : bornée à sa cellule plancher
  // de 74, elle laissait 40 % de l'écran vide sous elle alors que les vignettes
  // portent l'aperçu du biome — c'est justement ce qui gagne à être grand.
  const GRID_TOP: number = 6, LORE_H: number = 44;
  const gridH: number = Math.max(80, viewport().bottom - (top + 10) - 12 - GRID_TOP - LORE_H);
  const grid: UiLevelGrid = uiLevelGrid(ctx.scene, gz.cx, GRID_TOP, tiles, gz.w, 5, gridH);
  c.add(grid.container);

  // Lore du prochain objectif (premier chapitre débloqué non conquis)
  const next: number = CONTENT.chapters.findIndex((_ch, i) => isUnlocked(i) && !ctx.profileSvc.chapterWon(i));
  const lore: string = next >= 0 ? CONTENT.chapters[next]!.lore : "La vallée respire. Pour l'instant.";
  const loreY: number = GRID_TOP + grid.layout.totalH + 14;
  const loreText: Phaser.GameObjects.Text = ctx.scene.add.text(CX, loreY, lore.replace("\n", " "),
    { fontSize: "12px", color: TEXT.dim, ...TXT, align: "center", wordWrap: { width: 600 } }).setOrigin(0.5, 0);
  c.add(loreText);
  scroll.setContentHeight(loreY + loreText.height + 12);
}
