// ============================================================
// render/menu/chroniclesView.ts — Chroniques (meilleurs runs).
// Voir ADR-027, ADR-034.
// ============================================================

import type Phaser from "phaser";
import type { BestRun } from "../../core/types";
import { touchSize } from "../viewport";
import { uiPanelPad, layoutCursor, type LayoutCursor, type UiScrollList } from "../components";
import { box, header, scrollArea } from "./helpers";
import { CX, DIM, GOLD, LIGHT, OK, TXT } from "./theme";
import type { MenuCtx } from "./types";

export function buildChronicles(ctx: MenuCtx): void {
  const top: number = header(ctx, "Chroniques");
  const runs: BestRun[] = ctx.profileSvc.get().bestRuns;
  if (runs.length === 0) {
    ctx.panel.add(ctx.scene.add.text(CX, top + 120, "Les Chroniques sont vierges.\nLe Roi-Charogne n'attendra pas — partez au combat !",
      { fontSize: "16px", color: DIM, ...TXT, align: "center", lineSpacing: 6 }).setOrigin(0.5));
    return;
  }
  const scroll: UiScrollList = scrollArea(ctx, top);
  const c: Phaser.GameObjects.Container = scroll.content;
  const cursor: LayoutCursor = layoutCursor(0);
  c.add(ctx.scene.add.text(CX, cursor.next(24), `Vos ${runs.length} plus hauts faits`, { fontSize: "14px", color: DIM, ...TXT }).setOrigin(0.5));
  // Colonnes DÉRIVÉES de la rangée, jamais posées en absolu. Les quatre X
  // valaient 120 / 170 / 500 / 680 : des restes du monde 800×600 centré sur 400.
  // Après le passage en 960×540 (ADR-027), la rangée va de 180 à 780 — le rang
  // « #1 » tombait donc 60 unités HORS du panneau et le libellé se posait sur sa
  // volute d'angle. Le centre avait été corrigé partout, ces quatre-là non.
  const rowW: number = 600;
  const pad: number = uiPanelPad(ctx.scene);
  const left: number = CX - rowW / 2 + pad;
  const right: number = CX + rowW / 2 - pad;
  runs.forEach((r, i) => {
    const y: number = cursor.next(touchSize(44), 8);
    const date: string = new Date(r.dateISO).toLocaleDateString("fr-FR");
    box(ctx, CX, y, rowW, touchSize(44), 0x2b2118, r.victory ? 0x27ae60 : 0x6b5a3e, 8, c);
    const rang: Phaser.GameObjects.Text = ctx.scene.add.text(left, y, `#${i + 1}`, { fontSize: "15px", color: GOLD, ...TXT }).setOrigin(0, 0.5);
    c.add(rang);
    const chap: string = r.chapter !== undefined ? `Ch.${r.chapter + 1} — ` : "";
    c.add(ctx.scene.add.text(left + rang.width + 12, y, `${chap}${r.waves} vague${r.waves > 1 ? "s" : ""} — ${r.kills} kills`,
      { fontSize: "15px", color: LIGHT, ...TXT }).setOrigin(0, 0.5));
    c.add(ctx.scene.add.text(CX + rowW * 0.12, y, r.victory ? "Victoire" : "Défaite",
      { fontSize: "14px", color: r.victory ? OK : DIM, ...TXT }).setOrigin(0.5));
    c.add(ctx.scene.add.text(right, y, date, { fontSize: "13px", color: DIM, ...TXT }).setOrigin(1, 0.5));
  });
  scroll.setContentHeight(cursor.y);
}
