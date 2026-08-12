# ADR-025 — Des menus qui occupent l'écran

**Statut** : accepté · **Date** : 2026-08-12

## Contexte

Constat de playtest : « l'UI des menus fait pas très jeu mobile ».

Mesuré au format cible (paysage mobile, 844×390 CSS, soit ~1 300 unités logiques de
large) :

- le Campement empilait **cinq cartes de 540 unités** dans une colonne centrée, soit
  **44 % de la largeur occupée** — les deux tiers latéraux restaient noirs ;
- les cinq entrées avaient **le même poids visuel** : « Histoire », la seule action qui
  fait avancer le jeu, pesait autant que « Chroniques » ;
- l'icône de chaque carte faisait 30 unités, à côté d'un titre et d'une phrase — la
  mise en page d'une **liste de réglages**, pas d'un jeu ;
- la grille des chapitres était bornée à 700 unités, laissant là aussi un tiers de
  l'écran inutilisé ;
- les dix vignettes de chapitre étaient **identiques**, un numéro et un nom.

## Décision

**Deux rangs de tuiles.** Une tuile PRINCIPALE (Histoire, avec sa jauge de progression)
et des tuiles SECONDAIRES en grille. La disposition vient de `hubLayout` — module
**pur et testé** —, qui passe en deux colonnes dès que la largeur le permet et retombe
en colonne unique en dessous de 900 unités.

**Un format de tuile, pas de rangée.** `uiTile` pose une grande icône au-dessus du
titre : c'est elle qui se lit en premier sur un écran tenu à bout de bras. Les
sous-titres deviennent courts — une tuile porte un **état** (« 4 / 10 découverts »),
pas une description ; le détail appartient à l'écran qu'elle ouvre.

**Les vignettes de chapitre montrent leur lieu.** Chacune affiche en fond la texture de
sol de son biome (ADR-023), fortement assombrie. Dix cases numérotées ne disent rien de
ce qui attend le joueur ; un aperçu les rend reconnaissables d'un coup d'œil. Les
chapitres verrouillés gardent leur décor caché — le lieu fait partie de ce qu'on
découvre.

La grille des chapitres passe de 700 à 1 180 unités de large.

`uiNavCard` est supprimé : le hub était son seul usage, comme l'annonçait son propre
en-tête.

## Conséquences

Les tests portent sur ce qui était cassé, et non sur des valeurs de pixels : la
disposition **occupe au moins 90 %** de la zone utile, la tuile principale a **plus de
surface** qu'une secondaire, deux tuiles ne se **chevauchent jamais** (balayé sur
quatre largeurs et quatre effectifs), et rien ne **sort de la zone**.

### Deux bugs introduits puis corrigés

- **`setInteractive({})` ne définit aucune zone de clic** et fait planter Phaser au
  premier pointeur (`input.hitAreaCallback is not a function`). Sans option de curseur,
  il faut l'appeler sans argument.
- **Le clic traversait d'un écran à l'autre.** La tuile agissait sur `pointerdown`
  quand la grille des chapitres agit sur `pointerup` : appuyer sur « Histoire »
  ouvrait l'écran *et* lançait aussitôt le chapitre placé sous le doigt. Le projet
  documentait déjà ce piège pour les zones défilantes ; il vaut pour **toute**
  navigation. `uiTile` agit désormais au relâchement, avec abandon au-delà d'un seuil
  de glissement.

Un masque géométrique arrondi a par ailleurs dû être abandonné pour l'aperçu de biome :
il travaille en coordonnées **monde** alors que la grille vit dans un conteneur
défilant, et masquait donc tout. Un rectangle en retrait de 7 unités donne le même
résultat visuel, le cadre arrondi restant net par-dessus.

## Alternatives écartées

- **Élargir les cartes existantes.** Corrige le gâchis de largeur mais pas la
  hiérarchie plate ni le format « liste ». Cinq rangées très larges auraient même
  aggravé l'impression d'application.
- **Illustrer chaque chapitre à la main.** Dix images à produire et maintenir, alors
  que les textures de biome existent déjà et sont générées à la demande.
- **Une barre de navigation en pied d'écran**, réflexe des applications mobiles. Écarté
  : le Campement n'a que cinq destinations et doit se lire comme un lieu, pas comme une
  application — et une barre mangerait de la hauteur, la dimension la plus rare en
  paysage.
