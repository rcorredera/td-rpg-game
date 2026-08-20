// ============================================================
// render/menu/riftsView.ts — Écran Failles infinies (teaser v1).
// Voir ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CONTENT } from "../../content/index";
import { ICON } from "../theme/icons";
import { ACCENT, TEXT } from "../theme/theme";
import { uiChip, type UiChip } from "../components";
import { header } from "./helpers";
import { CX, TXT } from "./theme";
import type { MenuCtx } from "./types";

export function buildRifts(ctx: MenuCtx): void {
  const p: Phaser.GameObjects.Container = ctx.panel;
  header(ctx, "Failles infinies");
  if (!ctx.profileSvc.storyCompleted()) {
    p.add(ctx.scene.add.text(CX, 290,
      "Les Failles ne s'ouvrent qu'aux vainqueurs.\n\nAchevez l'Histoire — terrassez le Roi-Charogne —\net leur seuil vous sera révélé.",
      { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
    const locked: UiChip = uiChip(ctx.scene, CX, 410, {
      text: `${ctx.profileSvc.get().chaptersWon.length}/${CONTENT.chapters.length} chapitres conquis`,
      fontSize: 16, color: TEXT.dim, pill: true,
    });
    p.add(locked.container);
    p.add(ctx.scene.add.image(CX - locked.text.width / 2 - 18, 410, ICON.locked)
      .setDisplaySize(17, 17).setTint(ACCENT.dimBorder));
    return;
  }
  p.add(ctx.scene.add.text(CX, 280,
    "Au-delà des terres connues, les Failles déversent\ndes hordes sans fin. Nul n'en est revenu —\nseuls les noms des plus endurants survivent,\ngravés dans les Chroniques.",
    { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
  const soon: UiChip = uiChip(ctx.scene, CX + 8, 400, { text: "Bientôt", fontSize: 20, color: TEXT.rift, pill: true });
  p.add(soon.container);
  p.add(ctx.scene.add.image(CX + 8 - soon.text.width / 2 - 20, 400, ICON.rift).setDisplaySize(21, 21).setTint(0xb07cc6));
  p.add(ctx.scene.add.text(CX, 460, "Mode v1 : scaling agressif, modificateurs de Faille, leaderboard.",
    { fontSize: "12px", color: TEXT.dim, ...TXT }).setOrigin(0.5));
}
