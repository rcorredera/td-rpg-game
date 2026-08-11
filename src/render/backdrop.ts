// ============================================================
// render/backdrop.ts — Fonds d'écran générés sur canvas (ADR-014).
//
// Les écrans étaient des aplats `#1a140e`. Plutôt que d'embarquer des images
// de fond (poids, licence, une par ratio d'écran), les textures sont DESSINÉES
// au boot — même technique que les curseurs (render/ui.ts) : nettes à toute
// densité, teintables, et un fond qui suit n'importe quelle taille de vue.
//
// Le bruit est DÉTERMINISTE (pas de Math.random) : deux lancements donnent le
// même grain, donc une capture de référence reste comparable.
// ============================================================

import type Phaser from "phaser";

export const TEX_GRAIN = "ui_grain";
export const TEX_VIGNETTE = "ui_vignette";

/** Bruit pseudo-aléatoire reproductible : suffisant pour du grain, et stable
 *  d'une exécution à l'autre contrairement à Math.random. */
function noise(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Dalle de grain répétable : pierre/parchemin sombre, sans motif perceptible. */
function drawGrain(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "#1a140e";
  ctx.fillRect(0, 0, size, size);

  // Marbrures larges : cassent l'uniformité sans créer de motif reconnaissable.
  for (let i = 0; i < 90; i++) {
    const x = noise(i, 1) * size;
    const y = noise(i, 2) * size;
    const r = 30 + noise(i, 3) * 90;
    const warm = noise(i, 4) > 0.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, warm ? "rgba(74,58,38,0.10)" : "rgba(18,13,9,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grain fin : un pixel sur deux environ, très faible opacité.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = (i / 4) | 0;
    const v = (noise(p % size, (p / size) | 0) - 0.5) * 16;
    d[i] = Math.max(0, Math.min(255, d[i]! + v));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + v));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + v));
  }
  ctx.putImageData(img, 0, 0);
}

/** Vignette radiale : transparente au centre, sombre aux bords. Étirée à la
 *  taille de la vue par l'appelant — l'ovalisation est voulue et invisible. */
function drawVignette(ctx: CanvasRenderingContext2D, size: number): void {
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.65, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

/** Génère les textures de fond si absentes. Idempotent (cache Phaser partagé
 *  entre scènes). Sans DOM (tests Vitest), ne fait rien. */
export function ensureBackdropTextures(scene: Phaser.Scene): void {
  if (typeof document === "undefined") return;
  const make = (key: string, size: number, draw: (c: CanvasRenderingContext2D, s: number) => void) => {
    if (scene.textures.exists(key)) return;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    draw(ctx, size);
    scene.textures.addCanvas(key, cv);
  };
  make(TEX_GRAIN, 256, drawGrain);
  make(TEX_VIGNETTE, 256, drawVignette);
}

export interface BackdropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Pose le fond d'un écran de menu : grain répété + vignette, sur toute la vue.
 * À rappeler quand la vue change de taille (le container est à recréer).
 */
export function addBackdrop(scene: Phaser.Scene, v: BackdropRect): Phaser.GameObjects.Container {
  ensureBackdropTextures(scene);
  const c = scene.add.container(0, 0).setDepth(-100);

  if (scene.textures.exists(TEX_GRAIN)) {
    c.add(scene.add.tileSprite(v.left, v.top, v.width, v.height, TEX_GRAIN).setOrigin(0, 0));
  } else {
    // Repli (texture indisponible) : l'aplat historique, jamais un écran vide.
    c.add(scene.add.rectangle(v.left + v.width / 2, v.top + v.height / 2, v.width, v.height, 0x1a140e));
  }
  if (scene.textures.exists(TEX_VIGNETTE)) {
    c.add(scene.add.image(v.left + v.width / 2, v.top + v.height / 2, TEX_VIGNETTE)
      .setDisplaySize(v.width, v.height));
  }
  return c;
}
