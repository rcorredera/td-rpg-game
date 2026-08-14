# ADR-032 — État enfoncé des boutons, affordance de défilement, et le reste du registre d'icônes

## Statut
Accepté (2026-08-14). Corrige trois défauts remontés par le PO au playtest mobile, et
complète ADR-029/030 sur la découpe des planches du pack.

## Contexte

Quatre retours d'un même passage sur mobile :

1. « quand on appuie sur un bouton il devient noir » ;
2. « il manque une indication de scroll sur mobile, c'est pas intuitif la liste » ;
3. « pour le niveau 2 et 4 le texte déborde sur les étoiles » ;
4. « le bouton pour retirer le plein écran il est pas bien centré ».

Les quatre avaient une cause mesurable, et aucun ne se voyait sur une capture au repos.

### 1. Le bouton noir — deux défauts superposés

**Le plan de découpe prélevait dans le vide.** `planNineSlice` a deux branches (ADR-029) :
coin ROGNÉ quand le dessin d'angle est court, pièce ENTIÈRE quand il la couvre. Dans la
seconde, les bandes du milieu étaient encore prélevées « en prolongement du coin » — or
le coin occupe déjà toute sa pièce, donc le prolongement tombe dans la **gouttière
transparente** qui sépare les pièces de la planche. Mesuré sur `btn-big-blue-pressed.png` :
bande prélevée à x=64, entre la colonne 0 (14→64) et la colonne 1 (128→192). La texture
enfoncée se composait en damier noir.

**Et Phaser ne recalcule pas les marges à `setTexture`.** Les deux planches ne composent
pas à la même taille : le bouton au repos donne 52×52 avec 22 de marge, sa variante
enfoncée 48×41 avec 22 et 16 — parce qu'un bouton enfoncé est dessiné plus plat. Poser
22 de marge en haut ET en bas sur 41 px de texture fait se recouvrir les tranches.

### 2. L'indicateur de défilement — dessiné hors écran

`uiScrollList` traçait sa gouttière à `x + w + 4`. Les fenêtres défilantes du campement
occupent toute la largeur visible (`v.left` / `v.width`) : l'indicateur tombait donc
4 unités **dehors**. Aucun défilement n'était signalé nulle part dans le jeu, depuis
toujours.

### 3. Le nom par-dessus les étoiles — deux règles qui ne se parlent pas

Dans la vignette de chapitre, le texte s'empilait depuis le haut sans borne, les étoiles
étaient épinglées en bas, et rien ne réservait la bande entre les deux. Mesuré sur le
chapitre 2 (« Les Faubourgs en cendres », deux lignes) : bas du nom à 33,6 pour un haut
d'étoile à 24,4, soit **9,2 unités de recouvrement**. Le plancher de cellule était en
outre calculé sur les tailles de police DEMANDÉES, alors que Phaser rend un texte ~1,25×
plus haut.

### 4. Le bouton plein écran — un glyphe du système

Il affichait « ⛶ » / « ⤡ ». Même faute que les emojis (ADR-012) : rendu par la police du
SYSTÈME. « ⤡ » n'existe pas dans Cinzel, son encre occupe le bas-gauche de sa boîte de
texte — et `setOrigin(0.5)` centre la **boîte**, pas l'encre.

## Décision

**Le plan prélève toujours DANS une pièce.** Quand la pièce est gardée entière, la bande
du milieu vient de la pièce que l'artiste a dessinée pour ça : celle du milieu de la
planche, en son centre. La contiguïté au coin reste la règle quand le coin est rogné —
c'est elle qui garantit le raccord, et elle n'est possible que là. La garantie universelle
qui couvre les deux branches est testée : *chaque découpe tombe dans une pièce, jamais
dans la gouttière*.

**`uiSkinSetTexture` est le point d'entrée unique** pour changer la texture d'un élément
habillé : il repose la texture ET ses marges, bornées par la boîte affichée **et par la
texture elle-même** (`sliceInsets`, pur). Un `setTexture` nu est interdit par un test qui
lit la source (`skinSwap.test.ts`), avec une liste explicite de dérogations.

**`scrollBar` et `scrollHints` sont purs.** Les deux rectangles de la gouttière sont
garantis à l'intérieur de la fenêtre. S'y ajoute un **chevron** posé sur le bord vers
lequel il reste du contenu, avec un léger va-et-vient : sur mobile, une gouttière de
5 unités ne fait pas comprendre qu'une liste défile, le mouvement si.

**`levelCellLayout` est pur** et place numéro, nom et étoiles d'un seul calcul, à partir
de hauteurs **mesurées sur sondes** et non de tailles demandées. Le nom est plafonné à
`NAME_LINES` (2) par `maxLines` : la garantie ne dépend donc pas de la longueur des noms
d'aujourd'hui.

**Les glyphes Unicode d'UI passent au registre** : `ICON.fullscreen`,
`ICON.fullscreenExit`, `ICON.chevronDown`.

## Conséquences

- Les états enfoncés du pack sont enfin visibles tels que dessinés, au campement comme
  dans le HUD de jeu.
- La vignette de chapitre a un plancher plus haut (~142 unités contre ~121) : la grille
  Histoire occupe davantage de la hauteur qu'on lui offre, ce qui était déjà l'intention
  d'ADR-025.
- L'étoile est calée sur la POLICE (`lineH × 0,8`) et non sur la cellule : dérivée de la
  hauteur de cellule, elle entrait dans une boucle, puisque cette hauteur dépend
  désormais de la bande d'étoiles.
- Un nom de chapitre de plus de deux lignes sera **tronqué** plutôt que de mordre les
  étoiles. C'est le compromis assumé ; les dix noms actuels tiennent.
- **Trois icônes sont DESSINÉES faute d'équivalent dans les packs.** Les quatre packs
  présents ont été inventoriés : les douze icônes de Tiny Swords sont des ressources
  (bois, or, viande, épée, bouclier, gemmes, engrenage, info, note) — aucune flèche,
  aucun chevron, aucun symbole de plein écran ; `kenney-ui` ne fournit que deux boutons,
  un séparateur et un panneau. Le registre d'ADR-012 rend le remplacement trivial : une
  ligne par icône quand des assets adaptés arriveront.

## Alternatives écartées

- **Unifier les deux branches de `planNineSlice` sur « toujours la pièce du milieu »** :
  plus simple à lire, mais la contiguïté au coin est ce qui fait raccorder le parchemin
  et le panneau ouvragé — mesuré à l'époque, le bord du remplissage sautait de 9 à 7 px
  sans elle. On garde les deux règles, avec une garantie commune qui les couvre.
- **Recomposer les planches enfoncées à la taille des planches au repos** : garderait un
  `setTexture` nu valide, mais il faudrait étirer ou compléter un dessin plus plat — donc
  jeter ce que l'artiste a dessiné pour signifier l'appui.
- **Réduire la police du nom jusqu'à ce qu'il tienne** : rejoue l'arbitrage à chaque
  vignette et casse la hiérarchie typographique d'ADR-015.
- **Un voile dégradé en bas de liste plutôt qu'un chevron** : Phaser Graphics n'a pas de
  dégradé, il faudrait une texture de plus pour une affordance moins explicite.
