# ADR-015 — Échelle typographique réelle, plein écran, et bornes de pointeur au resize

## Statut
Accepté (2026-08-11). Corrige un bug d'ADR-010 et étend le raisonnement d'ADR-011 au texte.

## Contexte
Trois retours d'un test sur appareil réel :

1. **« Pas lisible du tout »**. C'est le **même défaut d'unités qu'ADR-011**, appliqué au texte au
   lieu des cibles tactiles : les tailles sont écrites en unités logiques, qui ne valent pas la même
   chose selon l'écran. Sur un mobile paysage (1 unité ≈ 0,6 px), un texte déclaré `12px` était
   rendu à **~7 px réels**. J'avais corrigé les zones tapables sans voir que le texte souffrait
   exactement du même problème.
2. **« Pas full screen »**. Exact : en onglet mobile, la barre d'URL confisque une bonne part de la
   hauteur, et rien n'était prévu pour la récupérer.
3. **« Après un changement d'orientation, ce n'est pas cliquable, je dois F5 »**. Bug réel
   introduit par ADR-010.

## Décision

### Bug de pointeur au resize (le plus grave)
`attachViewport` redimensionnait le framebuffer et le style CSS du canvas, mais n'appelait jamais
`game.scale.refresh()`. Phaser **met en cache la position et la taille écran du canvas** pour
convertir les coordonnées de pointeur : ces bornes restaient périmées, donc tous les clics tombaient
à côté jusqu'à un rechargement. Mesuré en session : canvas réel `900×420`, bornes Phaser restées à
`780×360`, `displayScale` à 1,15 au lieu de 1. `refresh()` réaligne les trois.

Le debounce gagne aussi un **repli `setTimeout`** : `requestAnimationFrame` est suspendu quand
l'onglet est en arrière-plan, or une rotation peut survenir dans cet état.

### Échelle typographique
`scaleFont(desired)` (`render/viewport.ts`) recale l'échelle sur des **pixels réels**
(`TEXT_MIN_CSS = 13`), appliqué au point de création de chaque `Text` (`main.ts`), là où la
résolution était déjà réglée — plutôt qu'à cinquante appels dispersés, qu'on oublierait.

Un simple plancher ne suffisait pas : essayé, il ramenait un titre (19) et son sous-titre (12) à la
**même taille**, aplatissant toute la hiérarchie. `scaleFont` remonte donc l'échelle entière en
**compressant les grandes tailles** (exposant 0,6), pour qu'un titre grandisse sans devenir
démesuré. Sur grand écran, la taille demandée gagne toujours : aucun effet.

**Conséquence assumée : agrandir le texte casse tout layout au pas fixe.** Les débordements
constatés à l'écran ont été corrigés à la source, chaque conteneur se dimensionnant d'après son
contenu réel :
- `uiButton` s'élargit pour loger son libellé, et renvoie sa largeur effective ;
- `uiNavCard` et `uiLevelGrid` empilent leurs textes d'après leurs hauteurs mesurées ;
- `MenuScene.tabs()` crée les boutons **puis** les positionne d'après leur largeur réelle ;
- les chips de monnaie s'écartent d'après leur largeur ;
- le HUD met en cascade or → base → vague **à chaque frame**, les valeurs changeant en jeu
  (« 160 » puis « 1160 »).

### Plein écran
Manifest PWA (`display: fullscreen`, `orientation: landscape`) pour une installation depuis l'écran
d'accueil, plus une bascule ⛶ au campement. Le passage en plein écran **exige un geste
utilisateur** : il ne peut pas être déclenché au chargement, d'où le bouton.

## Conséquences
- Tout texte atteint au moins 13 px réels, hiérarchie préservée — vérifié à l'écran.
- Aucun changement sur grand écran (le plancher y vaut ~8 unités, sous les tailles courantes).
- Les clics survivent aux rotations et redimensionnements, sans rechargement.
- Les tests portent sur les **propriétés** (jamais rétrécir, préserver l'ordre des tailles,
  compresser les grandes) plutôt que sur des valeurs figées, qui casseraient au moindre ajustement.
- Dette : le plancher confond les tailles 11 et 12, deux niveaux de texte secondaire. Sans
  conséquence visible, mais l'échelle gagnerait à être réduite à quelques crans nommés.

## Alternatives écartées
- **Agrandir les tailles à la main écran par écran** : rejoue l'arbitrage à chaque texte, et le
  prochain ajouté repartira d'une valeur trop petite.
- **Zoomer la caméra sur mobile** : agrandirait aussi la carte, donc réduirait le champ de vision
  tactique — inacceptable pour un TD.
- **Forcer le plein écran au chargement** : interdit par les navigateurs sans geste utilisateur.
