// ============================================================
// render/castle.ts — Où se trouve le Bastion, et où se trouve sa jauge.
//
// PUR : aucune dépendance Phaser ni DOM.
//
// POURQUOI un module. Cette géométrie était écrite TROIS fois — dans
// `GameScene.buildCastle`, dans le tracé de la jauge de PV, et recopiée en
// commentaire dans `balance/datasheet.test.ts`, qui garantit que les emplacements
// de tour ne mordent pas sur le sprite. Deux des trois copies avaient déjà
// divergé : la jauge était calée sur `end.x - 62` quand le sprite l'est sur
// `min(end.x, W - 62)`, soit 26 unités de décalage visibles à l'écran dès qu'un
// chapitre ne finit pas contre le bord droit.
// ============================================================

import { BATTLEFIELD } from "../core/types";

/** Demi-côté du sprite du Bastion, affiché en 124×124. */
export const CASTLE_HALF = 62;

/** Décalage vertical du sprite par rapport à son point d'ancrage (assise au sol). */
const SPRITE_LIFT = 6;

/** Marge conservée sous le bord bas pour que l'assise reste dans le champ. */
const BOTTOM_KEEP = 70;

export interface Point { x: number; y: number }

/**
 * Centre du sprite du Bastion, d'après le dernier point du chemin principal.
 *
 * Les chemins finissent au bord droit du champ : un Bastion centré sur le
 * waypoint final déborderait du cadre. On le ramène donc à l'intérieur.
 */
export function castleAnchor(end: Point): Point {
  return {
    x: Math.min(end.x, BATTLEFIELD.w - CASTLE_HALF),
    y: Math.min(end.y, BATTLEFIELD.h - BOTTOM_KEEP) - SPRITE_LIFT,
  };
}

/** Jauge de PV du Bastion : posée au-dessus du sprite et CENTRÉE sur lui. */
export function castleBarBox(end: Point): { x: number; y: number; w: number; h: number } {
  const a = castleAnchor(end);
  const w = 76, h = 11;
  return { x: a.x - w / 2, y: a.y - CASTLE_HALF - h - 4, w, h };
}
