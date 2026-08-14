// ============================================================
// render/path.ts — Tracé VISUEL des chemins (pur, zéro Phaser).
//
// La simulation fait avancer les ennemis sur les segments DROITS reliant les
// waypoints (ADR-001). Le rendu doit donc dessiner une route qui ne s'éloigne
// jamais de ces segments de plus d'une demi-largeur, sinon les unités marchent
// visiblement à côté de leur route — alors que les tours, elles, visent leur
// position réelle. C'était le cas avec une spline de Catmull-Rom : 64,7 px
// d'écart mesurés sur le chemin du layout « Faille », pour une route large de 46.
//
// D'où l'arrondi de coins à rayon BORNÉ plutôt qu'une interpolation libre : une
// spline passe par les waypoints mais s'écarte arbitrairement entre eux, tandis
// qu'un arrondi reste par construction dans le triangle du coin qu'il adoucit.
// ============================================================

import type { Vec2 } from "../core/types";

/**
 * Largeur de la route en unités logiques. Source UNIQUE : `terrain.ts` la dessine,
 * le tracé s'en sert comme rayon d'arrondi et les tests comme borne d'écart. La
 * séparer en deux constantes rendrait la garantie « l'unité reste sur sa route »
 * vraie dans le test et fausse à l'écran.
 */
export const PATH_WIDTH: number = 46;

/** Points intermédiaires par coin. Au-delà, le gain visuel ne se voit plus. */
const STEPS: number = 8;

function norm(v: Vec2): Vec2 {
  const len: number = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

/**
 * Adoucit les angles d'une polyligne sans jamais s'en écarter de plus de `radius`.
 *
 * Chaque coin est remplacé par une Bézier quadratique dont les extrémités sont
 * posées sur les segments d'origine, à `radius` du coin — et jamais au-delà de la
 * moitié d'un segment, faute de quoi deux coins voisins se chevaucheraient et la
 * route se replierait sur elle-même.
 */
export function roundedPath(pts: readonly Vec2[], radius: number): Vec2[] {
  if (pts.length < 3 || radius <= 0) return pts.map(p => ({ ...p }));

  const out: Vec2[] = [{ ...pts[0]! }];
  for (let i: number = 1; i < pts.length - 1; i++) {
    const a: Vec2 = pts[i - 1]!, b: Vec2 = pts[i]!, c: Vec2 = pts[i + 1]!;
    const vIn: Vec2 = { x: b.x - a.x, y: b.y - a.y };
    const vOut: Vec2 = { x: c.x - b.x, y: c.y - b.y };
    const r: number = Math.min(radius, Math.hypot(vIn.x, vIn.y) / 2, Math.hypot(vOut.x, vOut.y) / 2);
    if (r <= 0) { out.push({ ...b }); continue; }

    const dIn: Vec2 = norm(vIn), dOut: Vec2 = norm(vOut);
    const start: Vec2 = { x: b.x - dIn.x * r, y: b.y - dIn.y * r };
    const end: Vec2 = { x: b.x + dOut.x * r, y: b.y + dOut.y * r };

    out.push(start);
    for (let s: number = 1; s < STEPS; s++) {
      const t: number = s / STEPS, u: number = 1 - t;
      out.push({
        x: u * u * start.x + 2 * u * t * b.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * b.y + t * t * end.y,
      });
    }
    out.push(end);
  }
  out.push({ ...pts[pts.length - 1]! });
  return out;
}

/** Distance d'un point au segment [a, b]. */
export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx: number = b.x - a.x, dy: number = b.y - a.y;
  const len2: number = dx * dx + dy * dy;
  const t: number = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Écart maximal d'un tracé au chemin que suit réellement la simulation.
 *
 * C'est LA mesure qui dit si la route dessinée ment au joueur : au-delà d'une
 * demi-largeur de route, une unité pile sur son chemin logique apparaît hors de
 * la route, et sa position — celle que les tours ciblent — devient illisible.
 */
export function maxDeviation(curve: readonly Vec2[], polyline: readonly Vec2[]): number {
  if (polyline.length < 2) return 0;
  let worst: number = 0;
  for (const p of curve) {
    let best: number = Infinity;
    for (let i: number = 1; i < polyline.length; i++) {
      best = Math.min(best, distanceToSegment(p, polyline[i - 1]!, polyline[i]!));
    }
    worst = Math.max(worst, best);
  }
  return worst;
}
