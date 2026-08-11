# ADR-019 — Le tracé visuel ne ment pas sur la position logique

**Statut** : accepté · **Date** : 2026-08-11

## Contexte

Constat de playtest : « les mobs ne suivent pas vraiment les paths, des fois ils
cutent. Ce qui est un peu con si les tourelles se fient aux coordonnées de mob pour
les toucher. »

Diagnostic confirmé par la mesure. Le rendu dessinait les chemins avec une spline de
Catmull-Rom (`Phaser.Curves.Spline`), là où la simulation fait avancer les ennemis sur
les **segments droits** reliant les waypoints. Une spline passe par ses points de
contrôle mais s'écarte librement entre eux : **64,7 px d'écart maximal** mesurés dans
le navigateur sur le chemin du layout « Faille », pour une route large de 46 px.

Une unité pile sur son chemin logique apparaissait donc jusqu'à trois demi-largeurs
en dehors de sa route. Le décalage n'était pas cosmétique : les tours ciblent la
position réelle, le joueur lit la position affichée. Décider où poser une tour
devenait un pari.

Le lissage était délibéré — le commentaire d'origine annonçait « la sim suit toujours
les segments linéaires » — mais personne n'avait mesuré l'écart que cela produisait.

La même passe a révélé un second défaut, sur les cartes elles-mêmes. Le layout
« Tenailles » (chapitres 3, 5, 7, 9) avait une seconde voie **27 % plus courte** que
la principale et couverte par **3 emplacements sur 6** : les ennemis y arrivaient plus
vite sur la portion la moins défendable. C'est ce qui expliquait la fuite systématique
en vague 4 relevée par le banc d'essai (ADR-018) — la première vague à emprunter cette
voie. Le layout « Faille », lui, partait à droite jusqu'à x=560 pour **revenir** à
x=180 : un demi-tour complet sur une carte large de 800.

## Décision

**Règle** : l'écart entre le tracé dessiné et le chemin que suit la simulation ne
dépasse jamais une **demi-largeur de route**. En deçà, une unité sur son chemin
logique reste toujours visuellement sur sa route.

`render/path.ts` (pur, zéro Phaser) remplace la spline par un **arrondi de coins à
rayon borné** : chaque angle devient une Bézier quadratique dont les extrémités sont
posées sur les segments d'origine, à un rayon du coin — et jamais au-delà de la moitié
d'un segment, faute de quoi deux coins voisins se replieraient l'un sur l'autre. Une
spline s'écarte arbitrairement ; un arrondi reste par construction dans le triangle du
coin qu'il adoucit. Écart mesuré après correction : **5,8 px** pour une limite de 23.

`PATH_WIDTH` devient la source unique de la largeur de route : `terrain.ts` la dessine,
le tracé s'en sert comme rayon, les tests comme borne. Séparée en deux constantes, la
garantie serait vraie dans le test et fausse à l'écran.

Les deux layouts sont redessinés. « Tenailles » fait converger ses deux voies à
mi-carte — longueurs à 2 % l'une de l'autre, **6 emplacements sur 6** couvrant
chacune. « Faille » perd son demi-tour ; son portail conserve un raccourci de ~29 %,
assumé, c'est l'intérêt d'une Faille.

### Garanties vérifiées

Trois propriétés de carte deviennent des tests, sur **chaque voie de chaque chapitre** :

- l'écart tracé/simulation reste sous la demi-largeur ;
- au moins deux tiers des emplacements atteignent chaque voie, à portée de la tour de
  base au niveau 1 — une voie hors de portée n'est pas « plus difficile », elle est
  indéfendable ;
- deux voies permanentes d'une même carte ne diffèrent pas de plus de 25 % en longueur
  (un portail de Faille, raccourci assumé, en est exclu).

Prouvé par mutation : réinjecter l'ancien layout « Tenailles » fait échouer deux de ces
tests, en nommant le chapitre 3 et en chiffrant l'écart. Chaque test est doublé d'une
contre-épreuve qui vérifie que la mesure sait aussi refuser.

## Conséquences

Une future carte mal dessinée est refusée par la CI, avec un message qui dit quelle
voie et de combien. C'est le genre de défaut qu'on ne voit pas en jouant — on
l'attribue à un mauvais réglage de vague — et qui coûte des heures de rééquilibrage
sur la mauvaise cause.

Le tracé arrondi est légèrement moins lisse qu'une spline. C'est le prix de
l'honnêteté visuelle, et à 5,8 px la différence ne se voit pas.

`slotCoverage` rejoint `balance/datasheet.ts` : la couverture est une propriété
analysable de la carte, au même titre que la fenêtre de tir.

## Alternatives écartées

- **Faire suivre la spline à la simulation.** Aligne les deux, mais fait entrer une
  courbe dans `core/` (ADR-001), change toutes les longueurs de chemin — donc tout
  l'équilibrage — et rend `posOnPath` nettement plus coûteux, pour un gain purement
  esthétique.
- **Dessiner les segments bruts, sans arrondi.** Exact par construction, et c'était
  l'option de repli. Les angles vifs à 90° rendaient les virages secs ; l'arrondi borné
  donne le même niveau d'exactitude avec un meilleur rendu.
- **Élargir la route jusqu'à contenir la spline.** Il aurait fallu 130 px de large
  pour absorber 64,7 px d'écart : la carte devient un couloir et les emplacements de
  tour n'ont plus de place.
