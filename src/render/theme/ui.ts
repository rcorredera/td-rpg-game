// ============================================================
// render/theme/ui.ts — Chrome d'UI partagé : échelle de rendu, polices, curseurs,
// caméra logique 800×600, préchargement du pack Kenney UI.
// Les composants (boutons, panneaux…) vivent dans render/components/ (ADR-007).
// ============================================================

import Phaser from "phaser";
import { onViewportChange, viewport, WORLD_H, WORLD_W, type Viewport } from "../platform/viewport";
import { preloadUiSkin } from "../skin/uiSkin";

export { UI_TINT } from "./theme";

// Le pack Kenney UI n'est plus embarqué en entier : seuls les fichiers réellement
// chargés sont versionnés, à plat et renommés par usage (11 Mo → 4 fichiers).
const P: string = "assets/kenney-ui";

// L'échelle de rendu vit désormais dans render/platform/viewport.ts (ADR-010) : elle est
// recalculée à chaque resize/rotation au lieu d'être figée au boot, et le
// framebuffer suit la fenêtre entière — plus seulement un cadre 4:3 (ADR-009).

/** Polices embarquées (public/fonts, OFL) — chargées dans main.ts avant le boot Phaser.
 *  Cinzel : capitales gravées (titres, boutons, chiffres). Alegreya : textes courants. */
export const FONT_DISPLAY: string = '"Cinzel", "Times New Roman", serif';
export const FONT_BODY: string = '"Alegreya", Georgia, serif';

// ---- Curseurs ------------------------------------------------------------
// Les PNG de curseurs des packs (30px, dessinés petit) sont flous à l'écran.
// On dessine les nôtres sur un canvas hors-écran : vectoriel → net à tout DPR,
// servi en image-set 2x quand le navigateur le supporte.

function goldGradient(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g: CanvasGradient = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "#f6e7c0");
  g.addColorStop(0.45, "#e3bd6d");
  g.addColorStop(1, "#b9842f");
  return g;
}

/** Flèche médiévale dorée, pointe en (5,3). */
function drawArrowCursor(ctx: CanvasRenderingContext2D): void {
  const pts: ReadonlyArray<readonly [number, number]> = [
    [5, 3], [5, 25.5], [10.6, 20.4], [14.2, 28.4], [18.4, 26.4], [14.9, 18.6], [22.4, 18.6],
  ];
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#2b1c0e";
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.fillStyle = goldGradient(ctx, 3, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6.4, 6.2);
  ctx.lineTo(6.4, 22.6);
  ctx.stroke();
}

/** Main gantelet qui pointe (façon WC3), bout de l'index en (14,3). */
function drawHandCursor(ctx: CanvasRenderingContext2D): void {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const silhouette = (): void => {
    ctx.beginPath();
    ctx.roundRect(10.8, 2.6, 5.6, 14.5, 2.8);  // index levé (à gauche du poing)
    ctx.roundRect(17.2, 12.8, 4.6, 5.6, 2.3);  // majeur replié (bosse de phalange)
    ctx.roundRect(21.6, 13.8, 4, 5, 2);        // annulaire replié
    ctx.roundRect(8, 14.6, 17.2, 12.4, 5.5);   // poing
    ctx.roundRect(5, 16.6, 5.8, 8.6, 2.9);     // pouce
  };
  silhouette();
  ctx.strokeStyle = "#2b1c0e";
  ctx.lineWidth = 3.4;
  ctx.stroke();
  silhouette();
  ctx.fillStyle = goldGradient(ctx, 2, 28);
  ctx.fill();
  // Séparation des doigts repliés
  ctx.strokeStyle = "rgba(43,28,14,0.55)";
  ctx.lineWidth = 1.3;
  for (const x of [17.5, 21.8] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 14.4);
    ctx.lineTo(x, 18.2);
    ctx.stroke();
  }
}

function renderCursorPng(draw: (ctx: CanvasRenderingContext2D) => void, scale: number): string {
  const cv: HTMLCanvasElement = document.createElement("canvas");
  cv.width = cv.height = 32 * scale;
  const ctx: CanvasRenderingContext2D | null = cv.getContext("2d");
  if (!ctx) return "";
  ctx.scale(scale, scale);
  draw(ctx);
  return cv.toDataURL("image/png");
}

/** Valeur CSS `cursor` : image-set 1x/2x si supporté (sondé), sinon url() simple. */
function cursorCss(draw: (ctx: CanvasRenderingContext2D) => void, hx: number, hy: number, fallback: string): string {
  const x1: string = renderCursorPng(draw, 1);
  const x2: string = renderCursorPng(draw, 2);
  if (!x1) return fallback;
  const probe: HTMLSpanElement = document.createElement("span");
  for (const fn of ["image-set", "-webkit-image-set"]) {
    const v: string = `${fn}(url("${x2}") 2x, url("${x1}") 1x) ${hx} ${hy}, ${fallback}`;
    probe.style.cursor = v;
    if (probe.style.cursor) return v;
  }
  return `url("${x1}") ${hx} ${hy}, ${fallback}`;
}

const hasDom: boolean = typeof document !== "undefined";
export const CURSOR_DEFAULT: string = hasDom ? cursorCss(drawArrowCursor, 5, 3, "auto") : "auto";
export const CURSOR_POINT: string = hasDom ? cursorCss(drawHandCursor, 14, 3, "pointer") : "pointer";

/** Abonne une scène aux changements de viewport (resize, rotation) et se désabonne
 *  automatiquement à son arrêt — sinon une scène morte continuerait à se re-layouter. */
export function onSceneResize(scene: Phaser.Scene, fn: (v: Viewport) => void): void {
  const off: () => void = onViewportChange(fn);
  // Noms d'évènements en littéraux, PAS `Phaser.Scenes.Events.*` : y toucher en
  // tant que valeur force le chargement de Phaser, qui lit `window` à l'import —
  // et casse les tests unitaires purs de components/ sous Vitest (cf .ai/pitfalls.md).
  scene.events.once("shutdown", off);
  scene.events.once("destroy", off);
}

/** À appeler dans chaque create() de scène : caméra centrée sur la zone de jeu
 *  800×600 (toujours entièrement visible) + curseur gantelet. Le zoom suit le
 *  viewport et se remet à jour tout seul au resize (ADR-010). */
export function setupCamera(scene: Phaser.Scene): void {
  const apply = (v: Viewport) => {
    scene.cameras.main.setZoom(v.zoom).centerOn(WORLD_W / 2, WORLD_H / 2);
  };
  apply(viewport());
  onSceneResize(scene, apply);
  scene.input.setDefaultCursor(CURSOR_DEFAULT);
}

/** Charge les éléments d'UI (le cache Phaser rend l'appel idempotent entre scènes). */
export function preloadUi(scene: Phaser.Scene): void {
  scene.load.image("ui_btn", `${P}/btn-grey.png`);
  scene.load.image("ui_btn_gold", `${P}/btn-yellow.png`);
  scene.load.image("ui_panel", `${P}/panel-grey.png`);
  preloadUiSkin(scene); // parchemin Tiny Swords, recomposé en nine-slice (uiSkin.ts)
  scene.load.image("ui_divider", `${P}/divider.png`);
  // Icônes de sorts (game-icons.net, CC BY 3.0 — crédit dans assets/README.md)
  scene.load.svg("icon_ww", "assets/icons/tornado.svg", { width: 64, height: 64 });
  scene.load.svg("icon_rally", "assets/icons/flying-flag.svg", { width: 64, height: 64 });
  scene.load.svg("icon_spell", "assets/icons/arrow-cluster.svg", { width: 64, height: 64 });
}

// uiPanel/uiButton ont déménagé vers render/components/ (registre de widgets, ADR-007).
