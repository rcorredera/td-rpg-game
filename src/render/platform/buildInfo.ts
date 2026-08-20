// ============================================================
// render/platform/buildInfo.ts — Étiquette de build affichée en coin d'écran.
//
// But UNIQUE : lever le doute sur le cache. Un hash figé sur une version
// mise en cache reste visible même après un F5 qui n'a rien changé — la
// question « est-ce que j'ai la dernière version ? » se lit à l'écran au
// lieu de se deviner (cf. .ai/pitfalls.md, session ADR-043).
//
// `__BUILD_ID__` est injecté par `vite.config.ts` (`define`) — hash court
// du commit + heure, ou "dev" si git est indisponible.
// ============================================================

declare global {
  // eslint-disable-next-line no-var -- déclaration ambiante Vite, pas une variable de module.
  const __BUILD_ID__: string;
}

/** Étiquette compacte, prête à poser en texte discret. */
export function buildLabel(id: string = __BUILD_ID__): string {
  return `build ${id}`;
}
