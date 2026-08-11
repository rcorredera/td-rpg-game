# ADR-010 — Viewport adaptatif : le jeu remplit l'écran (socle mobile)

## Statut
Accepté (2026-08-11). Remplace le cadrage figé d'ADR-009 (`RENDER_SCALE` disparaît), qui reste
valable sur son diagnostic (le flou vient de l'étirement CSS, pas de la rasterisation du texte).

## Contexte
Le jeu était un rectangle 4:3 de 800×600 posé au milieu de l'écran. Mesure en session sur un
format mobile courant (375×812, `devicePixelRatio` 2) : canvas affiché en CSS à **375×281, soit
35 % de la surface de l'écran** — 65 % de bandes noires. Conséquences en cascade :

- Cibles tactiles écrasées : une carte de menu de 56 px logiques tombait à ~26 px physiques, très
  en dessous des minimums d'ergonomie tactile (44 px iOS / 48 dp Material).
- Aucune prise en compte des encoches et barres gestuelles (`env(safe-area-inset-*)`).
- `RENDER_SCALE` était calculé **une seule fois au boot** : une rotation ou un redimensionnement ne
  redemandait jamais une résolution adaptée (limite déjà notée dans ADR-009).

Aucun travail de finition visuelle ne pouvait compenser ça : c'est la fondation du rendu.

## Décision

**Le framebuffer couvre la fenêtre entière, à la densité réelle du device**, et la zone de jeu
800×600 reste garantie visible. `src/render/viewport.ts` porte tout le calcul.

- `computeViewport(cssW, cssH, dpr, insets)` est une fonction **pure** (aucun import de valeur,
  `import type` uniquement) : testable sans DOM ni Phaser, comme les composants de
  `render/components/`. Elle renvoie la taille du framebuffer, le zoom caméra, le rectangle visible
  en unités logiques et les bords amputés des encoches.
- **Contrat de containment** : la zone 800×600 tient toujours entièrement à l'écran
  (`zoom = min(canvasW/800, canvasH/600)`), donc `width >= 800` et `height >= 600`. Le surplus est
  un **débord** (« bleed ») exploitable : le fond s'y étend, le HUD s'y ancre.
- Les coordonnées logiques ne changent pas : `core/` et les cartes ignorent totalement l'écran.
- `Phaser.Scale.NONE` : `attachViewport()` pilote lui-même la taille du canvas et son étirement CSS,
  au boot **et à chaque `resize`/`orientationchange`** (débounce sur une frame — une rotation émet
  une rafale d'évènements). Les scènes s'abonnent via `onSceneResize()` (`render/ui.ts`), qui se
  désabonne automatiquement à l'arrêt de la scène.
- Réancrage par scène : `MenuScene` se rebâtit à neuf (aucun état volatil) ; `GameScene` **ne
  redémarre pas** — un run ne se rejoue pas — et se contente de reconstruire le décor étendu et le
  HUD.
- Le HUD s'ancre aux bords sûrs : état du run à gauche, actions et sorts à droite (sous le pouce).
- Orientation : le jeu cible le **paysage**. Une invite « Tournez votre appareil » en CSS pur
  (`@media (orientation: portrait) and (pointer: coarse)`) se superpose sur mobile portrait, sans
  passer par Phaser et sans interrompre le run qui tourne dessous. Une fenêtre de bureau étroite
  n'est jamais bloquée (`pointer: coarse`).

## Conséquences

- **100 % de l'écran utilisé**, vérifié en session sur desktop (2004×1030), mobile paysage
  (740×360) et mobile portrait (375×812).
- **Netteté structurelle** : le canvas est étiré en CSS exactement à `1 / devicePixelRatio`
  (mesuré : rapport de 2 pour un dpr de 2, soit 1 pixel de canvas par pixel physique). Le flou
  d'ADR-009 ne peut plus réapparaître par construction, alors qu'il dépendait avant d'un calcul
  ponctuel au boot.
- La résolution des `Text` suit le zoom courant, lu **à la création** de chaque texte : les écrans
  reconstruits après une rotation repartent au bon facteur.
- Densité plafonnée à `MAX_DPR = 2` : au-delà, le coût mémoire du framebuffer dépasse le gain visuel.
- Le débord est désormais visible : tout écran doit habiller sa vue entière (`viewport().width/height`)
  et non plus 800×600. Un fond dimensionné en dur laisserait du noir sur les côtés.
- Limite assumée : le décor de `GameScene` est reconstruit à chaque resize (le décor dispersé est
  déterministe, donc identique — pas de saut visuel). Sans impact en jeu, une rotation étant rare.
- N'affecte ni `core/`, ni `meta/`, ni `content/`.

## Alternatives écartées
- **Portrait natif (9:16)** : meilleure prise en main à une main, mais impose de redessiner toutes
  les cartes du GDD et réduit fortement la lisibilité tactique d'un TD.
- **Double orientation** (menus en portrait, combat en paysage) : le plus confortable pour le
  joueur, mais double le travail de layout sur chaque écran et alourdit durablement la maintenance.
- **`Phaser.Scale.RESIZE`** : redimensionne le canvas à la taille du parent en pixels CSS, sans
  tenir compte de `devicePixelRatio` — donc flou sur tout écran HiDPI, exactement le problème
  qu'ADR-009 venait de corriger.
