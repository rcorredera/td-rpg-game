// ============================================================
// render/platform/devFlags.ts — Drapeaux d'atelier lus dans l'URL (ADR-066).
//
// Ce ne sont PAS des réglages de jeu : ils ouvrent des outils réservés au
// développement. Ils passent par l'URL et non par `import.meta.env.DEV` parce
// que c'est sur les BUILDS DE PREVIEW qu'on regarde le rendu — une garde `DEV`
// les ferait disparaître précisément là où ils servent.
//
// Un joueur ne les rencontre jamais : il faut connaître le paramètre pour
// l'écrire. Et ils n'ouvrent rien de sensible, seulement une carte d'observation.
// ============================================================

/** Lit un drapeau booléen dans la query string. Faux si l'URL est inaccessible. */
function urlFlag(name: string): boolean {
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch {
    return false;
  }
}

/** `?sandbox` : affiche l'entrée du bac à sable dans le Campement. */
export function sandboxRequested(): boolean {
  return urlFlag("sandbox");
}
