// ============================================================
// render/ui.ts — Chrome d'UI partagé, basé sur le pack Kenney UI
// (CC0, public/assets/kenney-ui). Boutons nine-slice + panneaux.
// Les gris Kenney sont teintés pour rester dans la palette médiévale.
// ============================================================

import Phaser from "phaser";
import { UI_TINT } from "./theme";

export { UI_TINT } from "./theme";

const P = "assets/kenney-ui/PNG";

/** Densité de rendu : le canvas est rendu à DPR× la taille logique (texte net sur écrans Retina).
 *  Les scènes compensent via cameras.main.setZoom(DPR) — les coordonnées restent en 800×600. */
export const DPR = Math.min(Math.round(window.devicePixelRatio || 1), 2);

/** Polices embarquées (public/fonts, OFL) — chargées dans main.ts avant le boot Phaser.
 *  Cinzel : capitales gravées (titres, boutons, chiffres). Alegreya : textes courants. */
export const FONT_DISPLAY = '"Cinzel", "Times New Roman", serif';
export const FONT_BODY = '"Alegreya", Georgia, serif';

// ---- Curseurs ------------------------------------------------------------
// Les PNG de curseurs des packs (30px, dessinés petit) sont flous à l'écran.
// On dessine les nôtres sur un canvas hors-écran : vectoriel → net à tout DPR,
// servi en image-set 2x quand le navigateur le supporte.

function goldGradient(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
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
  const cv = document.createElement("canvas");
  cv.width = cv.height = 32 * scale;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  ctx.scale(scale, scale);
  draw(ctx);
  return cv.toDataURL("image/png");
}

/** Valeur CSS `cursor` : image-set 1x/2x si supporté (sondé), sinon url() simple. */
function cursorCss(draw: (ctx: CanvasRenderingContext2D) => void, hx: number, hy: number, fallback: string): string {
  const x1 = renderCursorPng(draw, 1);
  const x2 = renderCursorPng(draw, 2);
  if (!x1) return fallback;
  const probe = document.createElement("span");
  for (const fn of ["image-set", "-webkit-image-set"]) {
    const v = `${fn}(url("${x2}") 2x, url("${x1}") 1x) ${hx} ${hy}, ${fallback}`;
    probe.style.cursor = v;
    if (probe.style.cursor) return v;
  }
  return `url("${x1}") ${hx} ${hy}, ${fallback}`;
}

export const CURSOR_DEFAULT = cursorCss(drawArrowCursor, 5, 3, "auto");
export const CURSOR_POINT = cursorCss(drawHandCursor, 14, 3, "pointer");

/** À appeler dans chaque create() de scène : caméra logique 800×600 + curseur gantelet. */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(DPR).centerOn(400, 300);
  scene.input.setDefaultCursor(CURSOR_DEFAULT);
}

/** Charge les éléments d'UI (le cache Phaser rend l'appel idempotent entre scènes). */
export function preloadUi(scene: Phaser.Scene): void {
  scene.load.image("ui_btn", `${P}/Grey/Default/button_rectangle_depth_gradient.png`);
  scene.load.image("ui_btn_gold", `${P}/Yellow/Default/button_rectangle_depth_gradient.png`);
  scene.load.image("ui_panel", `${P}/Grey/Default/button_rectangle_flat.png`);
  scene.load.image("ui_divider", `${P}/Extra/Default/divider_edges.png`);
  // Icônes de sorts (game-icons.net, CC BY 3.0 — crédit dans assets/README.md)
  scene.load.svg("icon_ww", "assets/icons/tornado.svg", { width: 64, height: 64 });
  scene.load.svg("icon_rally", "assets/icons/flying-flag.svg", { width: 64, height: 64 });
  scene.load.svg("icon_spell", "assets/icons/arrow-cluster.svg", { width: 64, height: 64 });
}

/** Panneau nine-slice teinté (remplace les rectangles plats). */
export function uiPanel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number,
  tint: number = UI_TINT.panel, alpha = 1,
): Phaser.GameObjects.NineSlice {
  const p = scene.add.nineslice(x, y, "ui_panel", undefined, w, h, 14, 14, 14, 14);
  p.setTint(tint).setAlpha(alpha);
  return p;
}

export interface UiButtonOpts {
  w: number;
  h?: number;
  /** true = bouton d'action principal (jaune Kenney, texte sombre). */
  gold?: boolean;
  fontSize?: number;
  color?: string;
  disabled?: boolean;
}

export interface UiButton {
  container: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.NineSlice;
  txt: Phaser.GameObjects.Text;
}

/** Bouton nine-slice avec hover (desktop) et stopPropagation (ne déclenche pas le tap de scène). */
export function uiButton(
  scene: Phaser.Scene, x: number, y: number, label: string,
  opts: UiButtonOpts, cb?: () => void,
): UiButton {
  const h = opts.h ?? 36;
  const c = scene.add.container(x, y);
  const img = scene.add.nineslice(0, 0, opts.gold ? "ui_btn_gold" : "ui_btn", undefined, opts.w, h, 14, 14, 14, 16);
  if (!opts.gold) img.setTint(UI_TINT.btn);
  const txt = scene.add.text(0, -2, label, {
    fontSize: `${opts.fontSize ?? 15}px`,
    color: opts.color ?? (opts.gold ? "#3a2c12" : "#f0e6d2"),
    fontFamily: FONT_DISPLAY,
  }).setOrigin(0.5);
  c.add([img, txt]);
  if (opts.disabled || !cb) {
    c.setAlpha(0.55);
    return { container: c, img, txt };
  }
  img.setInteractive({ cursor: CURSOR_POINT });
  const hoverTint = opts.gold ? 0xfff2cf : 0xa68c64;
  img.on("pointerover", () => { c.setScale(1.04); img.setTint(hoverTint); });
  img.on("pointerout", () => { c.setScale(1); img.setTint(opts.gold ? 0xffffff : UI_TINT.btn); });
  img.on("pointerup", () => c.setScale(1.04));
  img.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev?: Phaser.Types.Input.EventData) => {
    ev?.stopPropagation?.();
    c.setScale(0.96);
    cb();
  });
  return { container: c, img, txt };
}
