// ============================================================
// render/components/layout.ts — Empilement vertical sans recalcul
// manuel : chaque écran demande "la prochaine hauteur H" et reçoit
// le Y centré à utiliser, au lieu de deviner des offsets en dur.
// ============================================================

export interface LayoutCursor {
  /** Réserve `height` de hauteur (+ `gap` après), retourne le Y centré à utiliser pour cet élément. */
  next(height: number, gap?: number): number;
  /** Y courant (bas du dernier élément posé, avant le prochain gap). */
  readonly y: number;
}

/** Empile des éléments verticalement à partir de `startY` (le haut du premier élément). */
export function layoutCursor(startY: number): LayoutCursor {
  let y: number = startY;
  return {
    next(height: number, gap = 8): number {
      const centerY: number = y + height / 2;
      y += height + gap;
      return centerY;
    },
    get y() { return y; },
  };
}
