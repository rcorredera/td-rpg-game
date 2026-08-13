# ADR-029 — Une pièce étirée est constante, une tuile remplit sa boîte

**Statut** : accepté · **Date** : 2026-08-13

## Contexte

Après l'adoption du pack Tiny Swords (ADR-026 pour les thèmes, `render/uiSkin.ts`
et `render/nineSlicePlan.ts` pour la recomposition des planches), les tuiles des
menus restaient visiblement en dessous des boutons : traînées claires sur le bord
des panneaux, et surfaces creuses au Campement comme sur l'écran Histoire.

Deux défauts distincts, mesurés séparément.

**1. Le grain de la planche part en traînées.** Un nine-slice n'étire que cinq de
ses neuf pièces : la colonne du milieu en largeur, la rangée du milieu en hauteur,
le centre dans les deux sens. Tout écart le long d'un axe étiré est donc multiplié
par le facteur d'étirement. Mesuré sur les textures réellement composées en jeu :

| pièce étirée | profils distincts attendus | `ts_panel` (parchemin) | `ts_btn` (bouton) |
|---|---|---|---|
| bande gauche / droite (étirée en Y) | 1 profil de ligne | **8 sur 8 lignes** | 1 |
| bande haute / basse (étirée en X) | 1 profil de colonne | 2 | 3 |
| centre (étiré en X et Y) | 1 couleur | **2** | 1 |

À l'écran, la bande gauche du parchemin donnait une traînée claire de ~120 unités
de haut sur le bord de chaque tuile, et la seconde couleur du centre une barre
verticale de ~40 unités de large. La planche des boutons étant presque uniforme,
seuls les panneaux et les tuiles étaient touchés — d'où l'impression de deux jeux
différents dans le même écran.

**2. Le contenu des tuiles a une taille fixe dans une boîte variable.** `uiTile`
plafonnait son icône à 96 (26 sur les tuiles secondaires) et `uiLevelGrid` figeait
sa cellule à la hauteur plancher tactile, alors que les deux reçoivent une boîte
calculée d'après l'écran. Tout l'écart partait en vide. Mesuré en 960×540 :

- tuile « Histoire » : 150 unités de contenu dans 350 de tuile — **100 de vide en
  haut ET en bas**, soit 57 % de la surface ;
- jauge d'avancement ancrée au bas de la tuile, donc **82 unités sous le texte** ;
- écran Histoire : 10 vignettes de 74 dans ~380 unités libres — **40 % de l'écran
  vide sous la grille**, alors que ces vignettes portent l'aperçu du biome.

## Décision

**Une pièce étirée est constante le long de son axe d'étirement.** Le plan de
découpe (`render/nineSlicePlan.ts`) déclare désormais l'axe d'étirement de chacune
des neuf pièces, et `render/nineSliceFlatten.ts` — pur, sans Phaser ni canvas —
réduit chaque pièce étirée à sa couleur DOMINANTE le long de cet axe : par ligne
pour une bande horizontale, par colonne pour une bande verticale, globale pour le
centre. Les quatre coins ne sont jamais touchés, c'est là que vit tout le dessin.

Dominante et non moyenne ni médiane : les deux inventent une couleur absente de la
planche. La dominante rend toujours un pixel réellement posé par l'artiste, et une
moucheture minoritaire ne peut pas l'emporter sur le remplissage.

Le grain n'est pas perdu par principe — il se remet en **pavage** (`tileSprite`),
jamais en étirement.

**Le contenu d'une tuile remplit la boîte qu'on lui donne.**
`render/components/tileContent.ts` — pur — répartit icône, titre, sous-titre et
pied : marges et écarts proportionnels à la tuile (bornés), puis l'icône absorbe
toute la place restante jusqu'à sa résolution native. La jauge appartient au BLOC
et n'est plus ancrée au bas de la tuile : « bloc centré » et « pied en bas » sont
deux règles concurrentes qui ne peuvent pas tenir ensemble, il n'en reste qu'une.

`gridLayout` (`components/levelGrid.ts`) reçoit une hauteur disponible facultative
et y étale ses cellules, bornées à `MAX_ASPECT` (0,85) de leur largeur pour qu'une
vignette de chapitre ne bascule pas en portrait.

`ICON_RASTER_PX` passe de 128 à 192 et devient exportée : c'est un plafond
d'AFFICHAGE, pas un détail de chargement. À 128, la tuile principale gardait 43 %
de vide qu'aucun autre réglage ne pouvait combler.

Enfin, `uiTile` accepte une texture de fond, traitée comme les vignettes de
chapitre (pavage en retrait, alpha 0,4). Le Campement y met le biome du prochain
chapitre : une grande tuile qui ne porte qu'une icône et deux lignes se creuse, et
l'aperçu du lieu dit au passage où mène la tuile.

## Conséquences

- Les panneaux, tuiles, rangées de liste, vignettes et fenêtres modales du jeu
  entier s'assainissent d'un coup : la correction porte sur la composition des
  textures, pas sur chaque écran.
- Mesuré après correction, sur les textures composées en jeu : **1 profil pour les
  cinq pièces étirées** de `ts_panel` comme de `ts_btn`. Occupation des tuiles
  secondaires du Campement : 57 % → **82 %** ; tuile principale : 43 % → **75 %**
  (le reste est porté par l'aperçu de biome) ; grille des chapitres : plus de vide
  résiduel sous elle en 960×540 comme en 844×390.
- Coût mémoire de la rastérisation à 192 : 7 icônes × 192² × 4 o ≈ 1 Mo.
- Trois modules purs, testés par propriétés et prouvés par mutation :
  `nineSliceFlatten` (5 tests), `tileContent` (5 tests), `gridLayout` (7 tests).
  Les propriétés visent la FAMILLE de défauts, pas le cas observé : « toute pièce
  étirée est constante le long de son axe », « rien ne dépasse de la tuile »,
  « l'icône grandit avec la tuile jusqu'à sa résolution native », « jamais une
  cellule plus haute que large ».
- Un habillage teintable reste soumis à la remarque d'ADR-026 : `setTint` MULTIPLIE,
  et les trois thèmes emploient des panneaux sombres — le parchemin apporte sa
  forme de bordure, pas sa matière. Aplatir les bandes ne change pas ce point ; ça
  supprime seulement les traînées qui le masquaient.
