# ADR-017 — Animation procédurale des unités et paliers visuels de tour

## Statut
Accepté (2026-08-11). Complète ADR-016 (skin médiéval).

## Contexte
Deux manques signalés après la mise en place du skin :

1. **« Les monstres n'ont pas d'animation de déplacement ou de vol »** — les unités glissaient sur
   la carte avec un simple `sin()` sur le Y, identique pour tout le monde. Rien ne distinguait un
   marcheur d'un volant, ni une brute d'un gobelin.
2. **« On peut prévoir des skins différents par niveau d'amélioration »** — une tour de rang 3
   coûtant plusieurs centaines d'Éclats était visuellement identique à une tour de rang 1. Le
   joueur ne voyait pas ce qu'il avait payé.

## Décision

### Animation procédurale plutôt que planches d'animation
`render/animation.ts` calcule une **pose** (décalage, inclinaison, squash) en fonction du temps.
Aucune image supplémentaire à dessiner ni à maintenir, et le procédé marche pour n'importe quel
sprite — y compris ceux d'un futur pack externe.

- **Marche** : deux appuis par cycle, rebond, écrasement à l'appui et inclinaison opposée. Le
  paramètre `weight` porte la lecture — une brute rebondit peu et s'écrase beaucoup, un gobelin
  fait l'inverse. La durée du cycle suit la vitesse de l'unité.
- **Vol** : flottement lent + battement d'ailes rapide (compression horizontale). C'est le
  **décalage de rythme** entre les deux qui identifie un volant au premier regard.
- **Immobile** : respiration légère. Une unité parfaitement figée casse l'illusion de vie.
- **Déphasage par `uid`** : sans lui, une horde entière marche au pas — effet très artificiel.

Le module est **pur** : testable sans Phaser, et jamais dans la sim (ADR-001) — une pose ne change
aucun état.

### Paliers visuels de tour
`sprites.ts` associe à chaque tour une liste de **paliers** : rang 1-2, puis rang 3 et
spécialisations. Trois sprites de rang supérieur ont été dessinés (archerie à créneaux et double
bannière, trébuchet à contrepoids, tour de givre à trois cristaux). Deux spécialisations d'un même
palier se distinguent par une **teinte** dédiée.

`towerView(defId, level, specId)` honore enfin ses paramètres — la signature les anticipait depuis
ADR-005 mais les ignorait. Ajouter un palier = ajouter une entrée dans le registre.

## Conséquences
- Les unités ont du poids et un comportement lisible sans une seule image d'animation.
- L'amélioration d'une tour se voit **sur la carte**, ce qui rend la progression tangible.
- Le palier est borné aux sprites réellement disponibles : un niveau au-delà de ce qui est dessiné
  retombe sur le dernier palier au lieu de viser une texture absente (testé).
- **Deux défauts trouvés par les tests, pas à l'écran** :
  - le rebond de marche a une période de 0,5 (deux appuis par cycle), donc deux unités déphasées
    d'exactement 0,5 avaient une pose **identique** — la désynchronisation ne fonctionnait pas. Un
    balancement 1-périodique a été ajouté ;
  - le test du battement d'ailes comparait des changements de *signe* sur une valeur bâtie sur une
    valeur absolue, dont le signe ne change jamais. Il compte désormais les changements de
    *direction*. Le test était faux, pas le code.
- Limite : ce sont des transformations, pas de la vraie animation de personnage (pas de jambes qui
  bougent). Pour du « digne du dessin 3D », il faudra des planches animées — hors de portée d'un
  dessin fait main, donc lié à un éventuel pack externe.

## Alternatives écartées
- **Planches d'animation par créature** : le rendu de référence, mais plusieurs images par unité et
  par état à dessiner et maintenir — hors budget pour un skin maison.
- **Tweens Phaser par unité** : coûteux à créer/détruire au rythme des vagues, et difficiles à
  déphaser proprement. Une fonction du temps est plus simple et sans état.
- **Une teinte par niveau plutôt qu'un sprite** : lisible de près, invisible en jeu — c'est la
  silhouette qui porte la progression.
