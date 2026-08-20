// ============================================================
// render/assets/terrain.ts — Sol du champ de bataille, généré sur canvas (ADR-016).
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
import { biomeFor, type BiomeDef } from "./biomes";
import { PATH_WIDTH } from "../world/path";

/** Une texture de sol PAR BIOME : les chapitres n'ont plus le même décor (ADR-023). */
export function grassTextureKey(biome: string | undefined): string {
  return `terrain_${biome ?? "meadow"}`;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

function noise(x: number, y: number): number {
  const n: number = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Dalle d'herbe RÉPÉTABLE : nuances, touffes et grain.
 *
 * Chaque motif est dessiné 9 fois, décalé de ±size en x et y. Sans ça, tout
 * élément qui dépasse un bord est coupé net et la répétition fait apparaître une
 * grille de carrés — défaut bien visible à l'écran lors du premier essai.
 */
function drawGrass(ctx: CanvasRenderingContext2D, size: number, b: BiomeDef): void {
  ctx.fillStyle = hex(b.ground);
  ctx.fillRect(0, 0, size, size);

  /** Rejoue un tracé aux 9 positions du pavage pour qu'il se raccorde aux bords. */
  const tiled = (draw: (dx: number, dy: number) => void) => {
    for (let ox: number = -1; ox <= 1; ox++) for (let oy: number = -1; oy <= 1; oy++) draw(ox * size, oy * size);
  };

  // Nuances larges : donnent du volume sans motif identifiable.
  for (let i: number = 0; i < 40; i++) {
    const x: number = noise(i, 11) * size;
    const y: number = noise(i, 12) * size;
    const r: number = 24 + noise(i, 13) * 60;
    const light: boolean = noise(i, 14) > 0.5;
    tiled((dx, dy) => {
      const g: CanvasGradient = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, light ? b.patchLight : b.patchDark);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Motif de surface. Sa FORME porte la matière autant que sa couleur : recolorer
  // des brins d'herbe en blanc donne une prairie pâle, pas de la neige.
  ctx.lineCap = "round";
  for (let i: number = 0; i < b.fleckCount; i++) {
    const x: number = noise(i, 21) * size;
    const y: number = noise(i, 22) * size;
    const tone: string = noise(i, 25) > 0.45 ? b.fleckLight : b.fleckDark;
    const v: number = noise(i, 23);

    if (b.motif === "flake") {
      // Points épars : neige ou cendre en suspension.
      ctx.fillStyle = tone;
      const r: number = 0.8 + v * 1.6;
      tiled((dx, dy) => {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (b.motif === "rock") {
      // Éclats anguleux : gravats et pierraille.
      ctx.fillStyle = tone;
      const w: number = 2 + v * 3.5, h: number = 1.5 + noise(i, 26) * 2.5;
      tiled((dx, dy) => {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + w + dx, y + h * 0.4 + dy);
        ctx.lineTo(x + w * 0.5 + dx, y + h + dy);
        ctx.closePath();
        ctx.fill();
      });
    } else {
      // Traits : dressés pour l'herbe, couchés pour les roseaux du marais.
      const len: number = 2.5 + v * 3.5;
      const lean: number = (noise(i, 24) - 0.5) * (b.motif === "reed" ? 5 : 2.4);
      const rise: number = b.motif === "reed" ? len * 0.35 : len;
      ctx.strokeStyle = tone;
      ctx.lineWidth = 1.6;
      tiled((dx, dy) => {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + lean + dx, y - rise + dy);
        ctx.stroke();
      });
    }
  }
}

/** Crée la texture de sol du biome si absente. Idempotent ; sans DOM, ne fait rien. */
export function ensureTerrainTextures(scene: Phaser.Scene, biome?: string): void {
  if (typeof document === "undefined") return;
  const key: string = grassTextureKey(biome);
  if (scene.textures.exists(key)) return;
  const size: number = 256;
  const cv: HTMLCanvasElement = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx: CanvasRenderingContext2D | null = cv.getContext("2d");
  if (!ctx) return;
  drawGrass(ctx, size, biomeFor(biome));
  scene.textures.addCanvas(key, cv);
}

/**
 * Dessine un chemin de terre le long d'une polyligne : bordure sombre puis
 * cœur clair, avec des cailloux. Un seul tracé continu — l'ancien estampage
 * d'une tuile tous les 16 px produisait des bosses régulières visibles.
 */
export function drawDirtPath(
  g: Phaser.GameObjects.Graphics, pts: readonly { x: number; y: number }[],
  biome?: string, width = PATH_WIDTH,
): void {
  if (pts.length < 2) return;
  const b: BiomeDef = biomeFor(biome);
  const stroke = (w: number, color: number, alpha = 1) => {
    g.lineStyle(w, color, alpha);
    g.beginPath();
    g.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i: number = 1; i < pts.length; i++) g.lineTo(pts[i]!.x, pts[i]!.y);
    g.strokePath();
  };
  // La route suit le biome : un sentier de terre battue au milieu d'un col gelé
  // trahit tout de suite que le décor n'a pas été pensé pour le lieu.
  stroke(width + 8, b.pathEdge, 0.55);   // bord fondu dans le sol
  stroke(width, b.path, 1);              // cœur du chemin
  stroke(width - 14, b.pathCore, 0.45);  // trace centrale, plus claire
}
