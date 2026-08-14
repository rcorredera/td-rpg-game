// ============================================================
// render/components/listRow.ts — Rangée générique (cadre, titre,
// description, action/étiquette à droite). Remplace MenuScene.row().
// ============================================================

import Phaser from "phaser";
import { ACCENT, TEXT, UI_TINT } from "../theme";
import { FONT_BODY } from "../ui";
import { scaleFont, touchSize } from "../viewport";
import { uiFramedPanel } from "./panel";
import { uiButton } from "./button";

export type RowState = "normal" | "locked" | "unaffordable" | "done";

export interface RowColors { border: number; fill: number; titleColor: string }

/** Pure — état → teintes de cadre/fond/titre. Exportée pour test unitaire. */
export function rowColors(state: RowState): RowColors {
  switch (state) {
    case "locked": return { border: ACCENT.locked, fill: ACCENT.lockedFill, titleColor: TEXT.dim };
    case "unaffordable": return { border: ACCENT.dimBorder, fill: UI_TINT.panel, titleColor: TEXT.light };
    case "done": return { border: ACCENT.won, fill: UI_TINT.panel, titleColor: TEXT.light };
    case "normal": return { border: ACCENT.gold, fill: UI_TINT.panel, titleColor: TEXT.light };
  }
}

export interface UiListRowTrailing {
  label: string;
  color?: string;
  onClick?: () => void;
}

export interface UiListRowOpts {
  w?: number;
  h?: number;
  title: string;
  desc?: string;
  trailing: UiListRowTrailing;
  state?: RowState;
}

export interface UiListRow {
  container: Phaser.GameObjects.Container;
  /** Hauteur EFFECTIVE : la rangée grandit pour rester tapable ET pour contenir son
   *  bouton d'action, qui a lui aussi son plancher. L'écran doit empiler d'après
   *  cette valeur — sinon les rangées se chevauchent sur mobile. */
  h: number;
}

export function uiListRow(scene: Phaser.Scene, x: number, y: number, opts: UiListRowOpts): UiListRow {
  const w: number = opts.w ?? 600;
  // La rangée doit loger son bouton d'action (qui a son propre plancher tactile)
  // ET son bloc de texte, dont la taille est remontée sur petit écran (ADR-015).
  const btnH: number = touchSize(34);
  const textH: number = opts.desc ? scaleFont(17) + scaleFont(12) + 22 : scaleFont(17) + 18;
  const h: number = Math.max(touchSize(opts.h ?? 62), btnH + 14, textH);
  const state: RowState = opts.state ?? "normal";
  const colors: RowColors = rowColors(state);

  const container: Phaser.GameObjects.Container = scene.add.container(x, y);
  const { container: panel } = uiFramedPanel(scene, 0, 0, { w, h, tint: colors.fill, borderColor: colors.border });
  container.add(panel);

  // Bloc de texte centré d'après les hauteurs RÉELLES : les polices sont remontées
  // sur petit écran (ADR-015), et des Y en dur collaient titre et description.
  const textX: number = -w / 2 + 40;
  const title: Phaser.GameObjects.Text = scene.add.text(textX, 0, opts.title, { fontSize: "17px", color: colors.titleColor, fontFamily: FONT_BODY });
  if (!opts.desc) {
    title.setOrigin(0, 0.5);
    container.add(title);
  } else {
    const desc: Phaser.GameObjects.Text = scene.add.text(textX, 0, opts.desc, { fontSize: "12px", color: TEXT.dim, fontFamily: FONT_BODY });
    const lead: number = 3;
    const blockH: number = title.height + lead + desc.height;
    title.setY(-blockH / 2);
    desc.setY(-blockH / 2 + title.height + lead);
    container.add([title, desc]);
  }

  const trailX: number = w / 2 - 70;
  if (opts.trailing.onClick) {
    container.add(uiButton(scene, trailX, 0, opts.trailing.label, { w: 96, h: 34, gold: true, fontSize: 14 }, opts.trailing.onClick).container);
  } else {
    container.add(scene.add.text(trailX, 0, opts.trailing.label, {
      fontSize: "15px", color: opts.trailing.color ?? TEXT.dim, fontFamily: FONT_BODY,
    }).setOrigin(0.5));
  }

  return { container, h };
}
