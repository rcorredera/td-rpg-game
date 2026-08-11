// ============================================================
// render/terrain.ts — Sol du champ de bataille, généré sur canvas (ADR-016).
//
// Le prototype posait une tuile d'herbe unie du pack, d'un vert saturé et
// parfaitement plate : aucun relief, aucune variation, et un aplat qui écrasait
// les unités. Ici la prairie est DESSINÉE : nuances larges, touffes, et un léger
// grain — le tout désaturé pour rester en retrait des unités.
//
// Bruit déterministe (pas de Math.random) : deux lancements donnent le même sol,
// donc une capture de référence reste comparable.
// ============================================================

import type Phaser from "phaser";
import { GROUND } from "./palette";

export const TEX_GRASS = "terrain_grass";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

function noise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Dalle d'herbe RÉPÉTABLE : nuances, touffes et grain.
 *
 * Chaque motif est dessiné 9 fois, décalé de ±size en x et y. Sans ça, tout
 * élément qui dépasse un bord est coupé net et la répétition fait apparaître une
 * grille de carrés — défaut bien visible à l'écran lors du premier essai.
 */
function drawGrass(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = hex(GROUND.grass);
  ctx.fillRect(0, 0, size, size);

  /** Rejoue un tracé aux 9 positions du pavage pour qu'il se raccorde aux bords. */
  const tiled = (draw: (dx: number, dy: number) => void) => {
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) draw(ox * size, oy * size);
  };

  // Nuances larges : donnent du volume sans motif identifiable.
  for (let i = 0; i < 40; i++) {
    const x = noise(i, 11) * size;
    const y = noise(i, 12) * size;
    const r = 24 + noise(i, 13) * 60;
    const light = noise(i, 14) > 0.5;
    tiled((dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, light ? "rgba(127,160,90,0.55)" : "rgba(87,116,57,0.5)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Touffes : petits traits d'herbe, plus clairs, orientés au hasard.
  ctx.lineCap = "round";
  for (let i = 0; i < 130; i++) {
    const x = noise(i, 21) * size;
    const y = noise(i, 22) * size;
    const len = 2.5 + noise(i, 23) * 3.5;
    const lean = (noise(i, 24) - 0.5) * 2.4;
    ctx.strokeStyle = noise(i, 25) > 0.45 ? "rgba(140,175,100,0.75)" : "rgba(80,108,52,0.7)";
    ctx.lineWidth = 1.6;
    tiled((dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + lean + dx, y - len + dy);
      ctx.stroke();
    });
  }
}

/** Crée la texture de sol si absente. Idempotent ; sans DOM, ne fait rien. */
export function ensureTerrainTextures(scene: Phaser.Scene): void {
  if (typeof document === "undefined") return;
  if (scene.textures.exists(TEX_GRASS)) return;
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  drawGrass(ctx, size);
  scene.textures.addCanvas(TEX_GRASS, cv);
}

/**
 * Dessine un chemin de terre le long d'une polyligne : bordure sombre puis
 * cœur clair, avec des cailloux. Un seul tracé continu — l'ancien estampage
 * d'une tuile tous les 16 px produisait des bosses régulières visibles.
 */
export function drawDirtPath(
  g: Phaser.GameObjects.Graphics, pts: readonly { x: number; y: number }[], width = 46,
): void {
  if (pts.length < 2) return;
  const stroke = (w: number, color: number, alpha = 1) => {
    g.lineStyle(w, color, alpha);
    g.beginPath();
    g.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
    g.strokePath();
  };
  stroke(width + 8, GROUND.pathEdge, 0.55);   // bord fondu dans l'herbe
  stroke(width, GROUND.path, 1);              // cœur du chemin
  stroke(width - 14, 0xd8bd93, 0.45);         // trace centrale, plus claire
}
