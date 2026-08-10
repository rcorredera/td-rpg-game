# ADR-009 — RENDER_SCALE : framebuffer ajusté à l'affichage réel (fin du flou Scale.FIT)

## Statut
Accepté (2026-08-10). Nuance la contrainte "DPR entier" d'ADR-005.

## Contexte
Le texte (et le rendu en général) était signalé flou. Diagnostic confirmé en mesurant le canvas
dans le navigateur : `Phaser.Scale.FIT` étire le canvas **par CSS** pour remplir la fenêtre, sans
jamais changer sa résolution interne (`canvas.width/height`). Le framebuffer restait fixé à
`800×DPR` / `600×DPR` (`DPR` = `devicePixelRatio` plafonné à 2) — sur un écran desktop classique,
la fenêtre dépasse largement `800×2`/`600×2` px, donc le canvas est étiré bien au-delà de sa
résolution native. Mesure en session : fenêtre `2004×1270`, `devicePixelRatio:1` → canvas interne
`800×600` affiché en CSS à `1693×1270` (étirement ×2,1). Le travail existant sur la netteté du
texte (`Text.setResolution(DPR*1.5)`, `main.ts`) rasterise chaque `Text` plus finement mais ne
change rien à la taille finale du framebuffer — donc l'étirement CSS floutait quand même le résultat.

## Décision
`render/ui.ts` : `DPR` renommé `RENDER_SCALE`, calculé pour que le framebuffer corresponde à la
taille **réellement affichée** (fenêtre × `devicePixelRatio`, contenue en 4:3 — la même logique de
containment que `Scale.FIT` applique déjà en CSS), plafonné à 3 pour borner la mémoire sur les très
grands/denses écrans :

```ts
export const RENDER_SCALE = (() => {
  if (typeof window === "undefined") return 1;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = window.innerWidth * dpr;
  const targetH = window.innerHeight * dpr;
  return Math.min(3, Math.max(1, Math.min(targetW / 800, targetH / 600)));
})();
```

`main.ts` (taille du `Phaser.Game`, résolution du texte) et `setupCamera()` (zoom caméra) utilisent
`RENDER_SCALE` à la place de `DPR`. Calculé une fois au boot, comme l'était `DPR` — pas de nouvelle
réactivité au resize.

## Conséquences
- Rendu net sur desktop (vérifié : ratio d'étirement canvas/CSS passe de ×2,1 à ×1) et sur mobile
  (vérifié en 375×812 : le canvas est même légèrement sous-échantillonné, donc net aussi).
- **Limite connue, pas une régression** : un resize ou une rotation d'écran en cours de session ne
  redemande pas une résolution plus fine tant que la page n'est pas rechargée (déjà le cas avec
  `DPR` avant ce fix — aucun listener resize n'existait).
- **Nuance ADR-005** : ADR-005 imposait `DPR` entier pour rester compatible avec un futur skin pixel
  art (échelles fractionnaires = flou de seams). `RENDER_SCALE` n'est plus forcément entier (ex.
  2,1). Sans impact aujourd'hui — le skin actif (Kenney TD) est vectoriel (`pixelArt:false`) — mais
  un futur retour à un skin pixel art (Tiny Dungeon, conservé dans le repo) devra réintroduire un
  arrondi entier de `RENDER_SCALE` avant de basculer `pixelArt:true`.
- N'affecte pas `core/`/`meta/`/`content/` : changement de rendu pur, coordonnées logiques 800×600
  inchangées pour toutes les scènes.
