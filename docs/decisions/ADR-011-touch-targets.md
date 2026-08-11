# ADR-011 — Cibles tactiles garanties par les composants

## Statut
Accepté (2026-08-11). Complète ADR-010 (viewport adaptatif) et ADR-007 (registre de composants).

## Contexte
ADR-010 a réglé la taille de l'écran, pas l'ergonomie de ce qu'on y touche. Le piège restant est
une **confusion d'unités** : le jeu positionne tout en unités logiques (repère 800×600), mais un
doigt se mesure en pixels réels, et le facteur entre les deux varie fortement d'un appareil à
l'autre.

Mesuré en session : sur un mobile paysage 780×360 (dpr 2), **1 unité logique ne vaut que 0,6 px
CSS**. Un bouton écrit `h: 40` — parfaitement confortable sur un grand écran, où le même 40 vaut
~69 px — n'y faisait que **24 px** sous le doigt, très en dessous du plancher d'ergonomie (44 px
Apple HIG, 48 dp Material).

Le défaut n'était donc pas « une hauteur mal choisie » mais l'absence de traduction entre les deux
repères : aucune valeur écrite à la main ne peut être juste sur tous les écrans à la fois.

## Décision

**Le plancher tactile est exprimé en pixels réels et traduit par le viewport ; les composants
l'appliquent, les écrans n'ont pas à y penser.**

- `render/viewport.ts` expose `TOUCH_MIN_CSS = 44` (pixels réels) et calcule pour chaque écran
  `cssPerLogical` puis `touchMin` — le même plancher, exprimé en unités logiques. Il vaut ~26 sur
  un grand écran de bureau (aucune contrainte) et ~73 sur un mobile paysage.
- `touchSize(desired)` renvoie `max(desired, touchMin)`. **Tout composant cliquable passe par là** :
  `uiButton` (hauteur *et* largeur), `uiNavCard`, `uiListRow`, et les boutons du HUD de `GameScene`.
- Les composants renvoient désormais leurs **dimensions effectives** (`uiButton.w/h`,
  `uiNavCard.h`, `uiListRow.h`). Les écrans empilent d'après ces valeurs — via `layoutCursor` — et
  non d'après la valeur demandée : sur mobile, un pas d'espacement en dur provoquerait des
  chevauchements.
- Un conteneur doit pouvoir loger ce qu'il contient : `uiListRow` prend en compte le plancher de
  son propre bouton d'action, et la barre de HUD dérive sa hauteur de ses boutons (`max(70, …)`)
  au lieu de l'imposer.

## Conséquences

- **Contrat vérifié à l'écran**, pas seulement en théorie : sur 780×360, la plus petite cible du
  campement mesure exactement 44 px (73,3 unités × 0,6), et les 6 cibles du HUD sont toutes ≥ 44 px.
- **Aucune régression sur grand écran** : `touchMin` (~26) reste sous les tailles existantes (36-40),
  donc les valeurs demandées gagnent — campement et HUD de bureau sont pixel pour pixel identiques.
- Le test porte sur la **propriété**, pas sur des nombres : `touchMin × cssPerLogical === TOUCH_MIN_CSS`
  pour une série d'appareils réels, plus le fait que le plancher *monte* quand l'écran rapetisse.
  Figer « 73 » dans un test n'aurait rien prouvé et aurait cassé au moindre ajustement.
- Sur mobile, l'UI occupe légitimement plus de place (barre de HUD ~95 unités au lieu de 70) : c'est
  le prix d'une cible atteignable, pas un défaut de mise en page.
- Écrans encore sur les helpers historiques de `MenuScene` (`box`/`row`/`backButton` — Boutique,
  Chroniques, intérieur du Bestiaire) : ils héritent du plancher **partout où ils passent par
  `uiButton`**, mais leurs pas d'espacement restent écrits en dur. À reprendre avec leur migration
  sur le kit, déjà prévue au plan UI.

## Alternatives écartées
- **Un plancher en unités logiques** (ex. « jamais moins de 44 unités ») : ne veut rien dire — c'est
  précisément la confusion d'unités à l'origine du problème.
- **Corriger les tailles écran par écran** : rejoue le même arbitrage à chaque appel, et le prochain
  écran ajouté repartira d'une valeur en dur. Le plancher doit vivre dans le composant.
- **Agrandir uniquement les zones interactives** (zone de tap plus grande que le visuel) : la cible
  devient atteignable mais invisible, ce qui déplace le problème sur la lisibilité.
