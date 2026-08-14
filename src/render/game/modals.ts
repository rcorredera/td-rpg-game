// ============================================================
// render/game/modals.ts — Modales plein écran du run (confirmation
// de sortie, résultat de fin de run). Voir ADR-034.
// ============================================================

import type Phaser from "phaser";
import type { RunResult } from "../../core/types";
import { FONT_BODY, FONT_DISPLAY } from "../ui";
import { decorativeEdgeVisible, uiButton, uiPanel } from "../components";
import { C, GAME_H, GAME_W, VEIL } from "./constants";

/** Confirmation d'abandon de run : la run est perdue, aucun Éclat gagné. */
export function buildQuitConfirm(scene: Phaser.Scene, onQuit: () => void, onCancel: () => void): Phaser.GameObjects.Container {
  const c: Phaser.GameObjects.Container = scene.add.container(GAME_W / 2, GAME_H / 2).setDepth(3000);
  c.add(scene.add.rectangle(0, 0, VEIL, VEIL, 0x000000, 0.5));
  c.add(uiPanel(scene, 0, 0, 420, 190));
  if (decorativeEdgeVisible(scene)) {
    const edge: Phaser.GameObjects.Graphics = scene.add.graphics();
    edge.lineStyle(2, 0xc9a227, 1); edge.strokeRoundedRect(-210, -95, 420, 190, 14);
    c.add(edge);
  }
  c.add(scene.add.text(0, -55, "Abandonner la partie ?", { fontSize: "22px", color: C.uiText, fontFamily: FONT_DISPLAY }).setOrigin(0.5));
  c.add(scene.add.text(0, -22, "La run sera perdue, aucun Éclat gagné.", { fontSize: "14px", color: "#a89878", fontFamily: FONT_BODY }).setOrigin(0.5));
  c.add(uiButton(scene, -95, 45, "Quitter", { w: 130, h: 40, fontSize: 16, color: "#e8a87c" }, onQuit).container);
  c.add(uiButton(scene, 95, 45, "Continuer", { w: 130, h: 40, gold: true, fontSize: 16 }, onCancel).container);
  return c;
}

/** Écran de fin de run : victoire/défaite, étoiles, vagues tenues, récompenses.
 *  Les Sceaux paient le TEMPS passé à retenir la horde, pas les kills (ADR-021) :
 *  l'écran doit dire ce qui est récompensé, sinon le joueur optimise autre chose. */
export function buildEndRunOverlay(
  scene: Phaser.Scene, result: RunResult, wavesTotal: number, onReturn: () => void,
): Phaser.GameObjects.Container {
  const overlay: Phaser.GameObjects.Container = scene.add.container(GAME_W / 2, GAME_H / 2).setDepth(4000);
  overlay.add(scene.add.rectangle(0, 0, VEIL, VEIL, 0x000000, 0.45));
  overlay.add(uiPanel(scene, 0, 0, 420, 240));
  if (decorativeEdgeVisible(scene)) {
    const edge: Phaser.GameObjects.Graphics = scene.add.graphics();
    edge.lineStyle(2, 0xc9a227, 1); edge.strokeRoundedRect(-210, -120, 420, 240, 14);
    overlay.add(edge);
  }
  overlay.add(scene.add.text(0, -88, result.victory ? "Victoire !" : "Défaite", { fontSize: "30px", color: "#e8c252", fontFamily: FONT_DISPLAY }).setOrigin(0.5));
  if (result.victory) {
    const stars: string = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
    overlay.add(scene.add.text(0, -56, stars, { fontSize: "26px", color: "#e8c252", fontFamily: FONT_BODY }).setOrigin(0.5));
  }
  overlay.add(scene.add.text(0, -30, `Vagues : ${result.wavesCleared}/${wavesTotal}`, { fontSize: "18px", color: C.uiText, fontFamily: FONT_BODY }).setOrigin(0.5));
  overlay.add(scene.add.text(0, 5, `Éclats gagnés : +${result.shards}`, { fontSize: "20px", color: "#7ec8e3", fontFamily: FONT_BODY }).setOrigin(0.5));
  if (result.sceaux > 0) {
    overlay.add(scene.add.text(0, 32, `Sceaux gagnés : +${result.sceaux} ⚜ (${Math.round(result.heroBlockSeconds)}s à retenir la horde)`,
      { fontSize: "15px", color: "#c97ba2", fontFamily: FONT_BODY }).setOrigin(0.5));
  }
  overlay.add(uiButton(scene, 0, 75, "Retour au campement", { w: 240, h: 44, gold: true, fontSize: 17 }, onReturn).container);
  return overlay;
}
