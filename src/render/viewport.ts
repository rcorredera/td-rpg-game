// ============================================================
// render/viewport.ts — Viewport adaptatif (ADR-010).
//
// Le jeu raisonne toujours en unités logiques : la ZONE DE JEU fait 800×600
// (WORLD_W/WORLD_H) et reste intégralement visible sur tout écran. Ce qui
// change, c'est que l'écran réel est presque toujours PLUS GRAND que cette
// zone dans un sens : ce débord ("bleed") n'est plus du noir perdu — le fond
// s'y étend et le HUD s'y ancre.
//
// `computeViewport` est PURE (aucun import de valeur, `import type` seulement) :
// testable sans DOM ni Phaser, comme les composants de render/components/.
// ============================================================

import type Phaser from "phaser";

/** Zone de jeu garantie visible, en unités logiques. Les cartes, slots et
 *  chemins vivent dans ce rectangle — inchangé depuis l'origine du projet. */
export const WORLD_W = 800;
export const WORLD_H = 600;

/** Plafond de densité : au-delà, le framebuffer coûte plus qu'il n'apporte. */
export const MAX_DPR = 2;

/** Encoches / barres système, en pixels CSS (env(safe-area-inset-*)). */
export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface Viewport {
  /** Taille du framebuffer Phaser, en pixels physiques. */
  canvasW: number;
  canvasH: number;
  /** Taille d'affichage CSS, en pixels logiques navigateur. */
  cssW: number;
  cssH: number;
  /** Zoom caméra : pixels de framebuffer par unité logique. */
  zoom: number;
  /** Rectangle visible en unités logiques — englobe toujours 800×600. */
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  /** Mêmes bords, amputés des encoches système : c'est ici qu'on ancre l'UI. */
  safeLeft: number;
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  /** Écran plus haut que large : proposer de tourner l'appareil (paysage cible). */
  portrait: boolean;
}

/**
 * Calcule le viewport à partir de la taille d'écran CSS, de la densité et des encoches.
 *
 * Contrat : la zone 800×600 est toujours entièrement contenue (« contain »), donc
 * `width >= 800` et `height >= 600`, l'un des deux étant exactement égal.
 */
export function computeViewport(
  cssW: number,
  cssH: number,
  dpr: number,
  insets: SafeInsets = NO_INSETS,
): Viewport {
  const w = Math.max(1, cssW);
  const h = Math.max(1, cssH);
  const d = Math.min(Math.max(dpr || 1, 1), MAX_DPR);
  const canvasW = Math.round(w * d);
  const canvasH = Math.round(h * d);

  // « Contain » : le facteur limitant décide, la zone de jeu ne sort jamais de l'écran.
  const zoom = Math.min(canvasW / WORLD_W, canvasH / WORLD_H);
  const width = canvasW / zoom;
  const height = canvasH / zoom;
  const left = WORLD_W / 2 - width / 2;
  const top = WORLD_H / 2 - height / 2;

  // Les encoches sont exprimées en px CSS : converties en unités logiques.
  const k = d / zoom;
  return {
    canvasW, canvasH, cssW: w, cssH: h, zoom,
    left, top, right: left + width, bottom: top + height, width, height,
    safeLeft: left + insets.left * k,
    safeTop: top + insets.top * k,
    safeRight: left + width - insets.right * k,
    safeBottom: top + height - insets.bottom * k,
    portrait: h > w,
  };
}

// ---- Runtime (navigateur) -------------------------------------------------

/** Viewport courant. Valeur de repli tant que `attachViewport` n'a pas tourné
 *  (tests unitaires, import précoce) : exactement l'ancien cadrage 800×600. */
let current: Viewport = computeViewport(WORLD_W, WORLD_H, 1);

export function viewport(): Viewport {
  return current;
}

type Listener = (v: Viewport) => void;
const listeners = new Set<Listener>();

/** S'abonne aux changements de viewport (resize, rotation). Retourne le désabonnement. */
export function onViewportChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Lit les `env(safe-area-inset-*)` via une sonde CSS hors-écran.
 *  Renvoie des zéros hors navigateur ou si le navigateur ignore `env()`. */
export function readSafeInsets(): SafeInsets {
  if (typeof document === "undefined") return NO_INSETS;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;" +
    "padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);" +
    "padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const px = (v: string) => {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const insets: SafeInsets = {
    top: px(cs.paddingTop), right: px(cs.paddingRight),
    bottom: px(cs.paddingBottom), left: px(cs.paddingLeft),
  };
  probe.remove();
  return insets;
}

/** Viewport initial, avant la création du `Phaser.Game` (dimensionne le framebuffer). */
export function initialViewport(): Viewport {
  if (typeof window === "undefined") return current;
  current = computeViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio, readSafeInsets());
  return current;
}

/**
 * Branche le viewport sur le Game : redimensionne le framebuffer à chaque
 * resize/rotation et notifie les scènes abonnées.
 *
 * Le canvas est étiré en CSS à la taille exacte de la fenêtre pendant que son
 * framebuffer suit la densité réelle : 1 pixel de canvas = 1 pixel physique,
 * donc aucun étirement flou (le piège d'ADR-009, ici structurellement évité).
 */
export function attachViewport(game: Phaser.Game): void {
  if (typeof window === "undefined") return;

  const apply = () => {
    const v = computeViewport(window.innerWidth, window.innerHeight, window.devicePixelRatio, readSafeInsets());
    current = v;
    game.scale.resize(v.canvasW, v.canvasH);
    const cv = game.canvas;
    if (cv) {
      cv.style.width = `${v.cssW}px`;
      cv.style.height = `${v.cssH}px`;
    }
    listeners.forEach((fn) => fn(v));
  };

  // Debounce sur une frame : une rotation émet une rafale de `resize`, et
  // reconstruire le HUD à chaque évènement fait clignoter l'écran.
  let pending = 0;
  const schedule = () => {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => { pending = 0; apply(); });
  };

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  apply();
}
