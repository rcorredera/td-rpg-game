// ============================================================
// render/viewport.ts — Viewport adaptatif (ADR-010).
//
// Le jeu raisonne toujours en unités logiques : la ZONE DE JEU fait 960×540
// (WORLD_W/WORLD_H, 16:9 — ADR-027) et reste intégralement visible sur tout écran. Ce qui
// change, c'est que l'écran réel est presque toujours PLUS GRAND que cette
// zone dans un sens : ce débord ("bleed") n'est plus du noir perdu — le fond
// s'y étend et le HUD s'y ancre.
//
// `computeViewport` est PURE (aucun import de valeur, `import type` seulement) :
// testable sans DOM ni Phaser, comme les composants de render/components/.
// ============================================================

import type Phaser from "phaser";
import { BATTLEFIELD } from "../core/types";

/** Zone de jeu garantie visible, en unités logiques : c'est le champ de bataille
 *  du core (source unique), pas une constante de rendu parallèle. */
export const WORLD_W = BATTLEFIELD.w;
export const WORLD_H = BATTLEFIELD.h;

/** Plafond de densité : au-delà, le framebuffer coûte plus qu'il n'apporte. */
export const MAX_DPR = 2;

/** Plancher d'ergonomie tactile, en pixels CSS (44 px : Apple HIG ; Material dit 48 dp).
 *  Exprimé en pixels RÉELS, pas en unités logiques — c'est le doigt qui décide, pas le repère
 *  du jeu. `Viewport.touchMin` fait la conversion pour l'écran courant. */
export const TOUCH_MIN_CSS = 44;

/** Plancher de lisibilité du texte, en pixels CSS RÉELS. Même raisonnement que
 *  `TOUCH_MIN_CSS` : une taille écrite en unités logiques ne vaut pas cette taille
 *  à l'écran. Sur un mobile paysage, 1 unité logique ≈ 0,6 px — un texte « 12px »
 *  y était rendu à ~7 px, illisible (retour utilisateur sur appareil réel). */
export const TEXT_MIN_CSS = 13;

/** Hauteur logique (unités BATTLEFIELD) sous laquelle le HUD bas peut recouvrir
 *  le champ de bataille sur le pire appareil plausible (mobile paysage étroit) :
 *  le HUD s'ancre aux bords RÉELS de l'écran (ADR-010) et son plancher tactile
 *  grimpe fort sur petit écran (`touchSize`), poussant `hudTop` aussi bas que
 *  ~410-455 en unités logiques sur un panel de mobiles courants. Aucun waypoint
 *  ni aucun emplacement de tour ne doit être posé sous cette limite (ADR-028) :
 *  la sim ne connaît pas le HUD, seul le content peut s'en garder. */
export const PLAY_SAFE_BOTTOM = 400;

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
  /** Rectangle visible en unités logiques — englobe toujours WORLD_W×WORLD_H. */
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
  /** Pixels CSS par unité logique — pont entre le repère du jeu et l'ergonomie réelle. */
  cssPerLogical: number;
  /** Taille minimale d'une cible tactile, EN UNITÉS LOGIQUES, pour atteindre
   *  `TOUCH_MIN_CSS` à l'écran. Varie fortement selon l'appareil : ~26 sur un grand
   *  écran de bureau, ~73 sur un mobile paysage. Les composants s'en servent comme
   *  plancher — c'est ce qui empêche d'écrire une hauteur trop petite à la main. */
  touchMin: number;
  /** Écran plus haut que large : proposer de tourner l'appareil (paysage cible). */
  portrait: boolean;
}

/**
 * Calcule le viewport à partir de la taille d'écran CSS, de la densité et des encoches.
 *
 * Contrat : la zone WORLD_W×WORLD_H est toujours entièrement contenue (« contain »), donc
 * `width >= WORLD_W` et `height >= WORLD_H`, l'un des deux étant exactement égal.
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
  const cssPerLogical = w / width;
  return {
    canvasW, canvasH, cssW: w, cssH: h, zoom,
    left, top, right: left + width, bottom: top + height, width, height,
    cssPerLogical,
    touchMin: TOUCH_MIN_CSS / cssPerLogical,
    safeLeft: left + insets.left * k,
    safeTop: top + insets.top * k,
    safeRight: left + width - insets.right * k,
    safeBottom: top + height - insets.bottom * k,
    portrait: h > w,
  };
}

// ---- Runtime (navigateur) -------------------------------------------------

/** Viewport courant. Valeur de repli tant que `attachViewport` n'a pas tourné
 *  (tests unitaires, import précoce) : exactement le cadrage WORLD_W×WORLD_H. */
let current: Viewport = computeViewport(WORLD_W, WORLD_H, 1);

export function viewport(): Viewport {
  return current;
}

/** Hauteur/largeur effective d'un élément interactif : jamais sous le plancher tactile
 *  de l'écran courant. À utiliser dans TOUT composant cliquable plutôt qu'une valeur
 *  écrite à la main — sur mobile, 40 unités logiques ne font que ~24 px sous le doigt. */
export function touchSize(desired: number): number {
  return Math.max(desired, current.touchMin);
}

/** Taille de police minimale, en unités logiques, pour rester lisible sur l'écran
 *  courant. ~8 sur un grand écran (aucune contrainte), ~22 sur un mobile paysage. */
export function minFontSize(): number {
  return TEXT_MIN_CSS / Math.max(0.0001, current.cssPerLogical);
}

/** Taille de corps de référence : l'échelle typographique est calée dessus. */
const BODY_SIZE = 12;

/**
 * Adapte une taille de police à l'écran courant.
 *
 * Un simple plancher ne suffirait pas : il ramènerait un titre (19) et son
 * sous-titre (12) à la MÊME taille sur mobile, aplatissant toute la hiérarchie.
 * On remonte donc l'échelle entière, en compressant les grandes tailles
 * (exposant < 1) pour qu'un titre ne devienne pas démesuré.
 *
 * Sur grand écran, `desired` gagne toujours : aucun effet.
 */
export function scaleFont(desired: number): number {
  const min = minFontSize();
  const scaled = min * Math.pow(Math.max(0.01, desired) / BODY_SIZE, 0.6);
  return Math.max(desired, min, scaled);
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
    // INDISPENSABLE : Phaser met en cache la position et la taille écran du canvas
    // pour convertir les coordonnées de pointeur. Changer son style CSS sans le
    // prévenir laisse ces bornes périmées — les clics tombent à côté et le jeu
    // paraît gelé jusqu'à un rechargement. Mesuré : canvas réel 900×420, bornes
    // Phaser restées à 780×360, displayScale à 1,15 au lieu de 1.
    game.scale.refresh();
    listeners.forEach((fn) => fn(v));
  };

  // Debounce sur une frame : une rotation émet une rafale de `resize`, et
  // reconstruire le HUD à chaque évènement fait clignoter l'écran.
  // Repli sur setTimeout : requestAnimationFrame est SUSPENDU quand l'onglet est
  // en arrière-plan, or une rotation d'écran peut survenir dans cet état — sans
  // repli, le viewport resterait périmé au retour au premier plan.
  let pendingRaf = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (pendingRaf) cancelAnimationFrame(pendingRaf);
    if (pendingTimer !== undefined) clearTimeout(pendingTimer);
    const run = () => {
      if (pendingRaf) { cancelAnimationFrame(pendingRaf); pendingRaf = 0; }
      if (pendingTimer !== undefined) { clearTimeout(pendingTimer); pendingTimer = undefined; }
      apply();
    };
    pendingRaf = requestAnimationFrame(run);
    pendingTimer = setTimeout(run, 250);
  };

  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  apply();
}
