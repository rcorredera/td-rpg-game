# ADR-067 — Le rendu regarde les deux axes : planches à plusieurs directions

## Statut
Accepté (2026-08-21)

## Contexte

Le PO a relevé sur l'orc animé : « quand il marche de gauche à droite c'est ok, les autres
sens c'est pas ça, il tourne pas ».

Cause exacte : `facingOf` ne comparait que l'ABSCISSE (`Math.abs(x - last.x) > 0.3`). Sur un
segment vertical, x bouge à peine, donc l'orientation restait celle du segment précédent.

Ce n'était pas gênant tant que le bestiaire était dessiné de FACE — une vue frontale reste
plausible dans n'importe quelle direction, c'est une convention. La planche de marche livrée
par ADR-065 est en PROFIL, et un profil ne tient que sur l'axe pour lequel il est dessiné :
la créature descend vers le Bastion en marchant de côté.

Le PO a proposé huit poses par créature, deux par direction.

## Décision

### Trois directions dessinées, la quatrième par miroir

Face, profil droit, dos. La marche vers la GAUCHE n'est pas dessinée : c'est le retournement
du profil droit.

Le retournement inverse l'équipement — l'arme change de main entre aller à droite et aller à
gauche. C'est la convention admise depuis toujours pour l'ORIENTATION, et le jeu la pratique
déjà. Elle reste en revanche interdite pour fabriquer le pas opposé d'un même cycle
(ADR-065), où l'arme sauterait d'une main à l'autre à chaque pas.

Le gain n'est pas le confort : **à nombre de pixels constant, six poses au lieu de huit
laissent un tiers de surface en plus par pose**, et c'est la qualité de chacune qui monte.

### Une ligne de sol par direction

La planche s'organise en rangées, une par direction, chacune posée sur sa propre ligne. Le
découpage détecte donc TOUTES les lignes, sépare les rangées par ces lignes plutôt qu'en
supposant une hauteur régulière, et cale chaque pose sur la ligne de SA rangée — deux
directions dessinées à des hauteurs différentes ne doivent pas sauter une fois en jeu.

Les cases sont dimensionnées sur l'ensemble des poses, toutes rangées confondues : elles
doivent être identiques au pixel près, sinon Phaser découpe de travers.

**L'outil refuse une planche aux rangées de tailles inégales.** Le rendu indexe ses cases par
`direction * poses + pose` ; une rangée plus courte décalerait silencieusement toutes les
suivantes, et le défaut ne se verrait qu'à l'écran, tard.

### L'axe dominant décide de la direction

`facingFrom` compare |dx| à |dy| et prend le plus grand. Comparer chaque axe à son propre
seuil ferait osciller la direction à chaque frame sur un trajet en diagonale.

Sous le seuil, l'orientation ne change pas : une unité bloquée au contact du héros ne doit
pas pivoter à cause du bruit de position.

### Une planche sans rangée verticale garde son orientation

`allowVertical` dit si la planche PORTE des directions verticales. À faux, un déplacement
vertical laisse l'orientation inchangée plutôt que de demander une rangée qui n'existe pas :
une case hors planche s'affiche VIDE, sans lever d'erreur — le genre de défaut qui ne se voit
que sur un chemin particulier, longtemps après.

Une créature qui descend garde alors le profil sous lequel elle est arrivée. C'est le moins
faux des deux, et c'est ce qui laisse coexister les planches à un seul profil (l'orc de la
première livraison) et les planches complètes.

## Conséquences

- `FacingState` retient la position sur les DEUX axes et une direction nommée, au lieu d'une
  abscisse et d'un signe.
- Le registre décrit une planche par `{ directions, poses }` au lieu d'un simple nombre de
  cases : le total s'en déduit, l'inverse non.
- Le héros passe par le même mécanisme, en mode horizontal seul — il n'a qu'un sprite. Face
  à un ennemi il le regarde, sinon il suit son propre déplacement.
- Les VOLANTS restent hors de ce moule : une chauve-souris vue de dos n'a pas de sens, et son
  animation est un battement d'ailes, pas une marche. `flyPose` continue de les porter.

## Alternatives écartées

**Huit poses, deux par direction, toutes dessinées.** La proposition du PO. Elle évite que
l'arme change de main entre gauche et droite — mais c'est la convention universelle du sprite
retourné, personne ne la remarque, et elle coûte un quart de la surface de chaque pose.

**Faire tourner le sprite selon la direction.** Un personnage vu de côté qui pivote à plat
donne un corps couché, pas un corps qui se tourne.

**Rester en vue de face pour tout le bestiaire.** C'était l'option sûre — une vue frontale
marche dans les quatre directions. Mais l'alternance des jambes s'y lit mal, et c'est
précisément ce qu'on cherchait à obtenir en passant aux poses dessinées.
