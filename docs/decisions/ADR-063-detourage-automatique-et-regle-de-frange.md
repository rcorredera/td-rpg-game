# ADR-063 — Détourage automatique, et la frange se juge par contraste

## Statut
Accepté (2026-08-20)

## Contexte

ADR-061 a outillé le nettoyage des sprites, mais laissait le **détourage** au PO, sous
Photoshop. Cette étape s'est révélée être à la fois la plus pénible et la plus
dommageable :

- Une sélection dure supprime l'anticrénelage et rend les pixels de frange **totalement
  opaques** — la reprise « plus propre » du scorpion était pire que la première (1 067 →
  3 552 pixels clairs en bordure).
- Elle demande un aller-retour manuel par sprite, sur une série de trente.

À la livraison suivante, le PO a déposé **des JPEG bruts**, non détourés. Mesure faite :
le fond est un blanc uniforme à 253-255 occupant environ la moitié de l'image, et chaque
sujet porte un contour noir fermé — les deux conditions d'un détourage par remplissage.

Un second défaut est apparu en traitant ce lot. La règle de décapage d'ADR-061 — « tout
pixel clair touchant le vide est un résidu » — **rongeait le dessin** des créatures aux
teintes pâles. Le profil passe par passe ne laisse aucun doute :

| Sprite | Pixels retirés à chaque passe |
|---|---|
| orc | **2 189** → 19 → 1 |
| brute | **3 737** → 76 → 7 → 4 → 4 → 2 → 1 |
| troll | 3 298 → 634 → 542 → 511 → 486 → 465 → **443…** |
| chef de guerre | 3 245 → 749 → 676 → 669 → **656…** |

Les sprites sains s'épuisent dès la deuxième passe. Le troll (peau gris-bleu) et le chef
de guerre (fourrure et lame claires) tiennent un **plateau constant qui ne décroît
jamais** : chaque passe découvre une nouvelle couche de dessin clair et la mange. À douze
passes, le troll perdait 2,5 % de sa surface, entièrement prise sur sa silhouette.

Le plafond de passes masquait le problème sans le corriger : il ne faisait que borner les
dégâts.

## Décision

### Le détourage entre dans l'outil, Photoshop en sort

`floodBackground` retire le fond par **remplissage depuis les bords de l'image**.

Depuis les bords, et non « tout pixel clair » : les zones claires ENFERMÉES dans le dessin
— un reflet d'armure, un œil, une dent — ne sont pas atteintes et survivent. C'est le
piège classique du détourage par couleur, et le projet l'avait déjà payé une fois
(ADR-050 : « la passe des poches enfermées mangeait les reflets »).

Le seuil est volontairement haut (236). La compression JPEG dégrade le blanc au contact
du contour noir ; descendre le seuil ferait mordre le remplissage dans le dessin. Ce qui
reste de ce dégradé est ôté ensuite par le décapage de frange, dont c'est exactement le
rôle : **les deux étapes se complètent** au lieu de se concurrencer.

Sur une image déjà détourée, l'opération ne trouve aucun fond clair et ne fait rien. Elle
n'a donc pas besoin d'être conditionnée à un drapeau.

### La frange se juge par CONTRASTE, pas par clarté absolue

Être clair ne suffit pas à faire un résidu. Une frange est un **dégradé vers le fond** :
elle est donc toujours plus claire que ce qu'elle borde. De la peau pâle, non.

`isFringe` compare le pixel à ce qui se trouve juste **derrière** lui, du côté opposé au
vide. Plus clair que tout ce qui est derrière → frange. Aussi sombre ou plus → c'est le
dessin, et l'érosion s'arrête là.

Effet mesuré : le troll passe de 8 432 à 2 842 pixels retirés, le chef de guerre de 10 282
à 2 712 — soit l'ordre de grandeur des sprites sains. Le plateau disparaît, tous les
sprites convergent vers 1-2 pixels par passe.

Un cas échappe à cette règle : un halo **uniforme** à la couleur du fond, où chaque couche
ressemble à la suivante et où aucune n'est donc « plus claire que ce qu'elle borde ».
C'est ce que produit une sélection dure. `floodBackground` l'ôte en amont dans la chaîne,
mais `isFringe` traite aussi ce cas à part, pour rester correcte utilisée seule.

### Le plafond de passes cesse d'être une protection

Ce n'est plus le compteur qui borne l'érosion mais la règle elle-même. Le plafond passe de
8 à 24 : il ne protège plus de rien — un plafond bas tronquait juste la fin de la frange —
et ne sert que de garde-fou contre une entrée inattendue.

### Le JPEG est refusé avec la marche à suivre

Décoder du JPEG demanderait une bibliothèque entière pour un outil qui tourne à la main
quelques dizaines de fois. `png.ts` détecte la signature JPEG et renvoie la commande de
conversion, plutôt que de constater platement l'échec. La conversion est un changement de
conteneur, **sans détourage** : le fond blanc reste, et l'outil s'en charge.

## Conséquences

- Le PO ne détoure plus rien. La chaîne complète est : générer → convertir en PNG →
  `npm run sprite`. Photoshop disparaît du circuit.
- Sept sprites intégrés d'un coup — orc, troll, ogre, brute, chevalier noir, golem, chef
  de guerre — tous détourés automatiquement, 0 pixel clair résiduel sur cinq d'entre eux.
- Le troll et le chef de guerre en conservent 149 et 182 : ce sont leurs propres teintes
  claires en bordure de silhouette, pas des résidus. L'alerte est un faux positif assumé —
  elle demande un œil, elle ne bloque pas.
- **Le golem d'acier est retenu, pas celui de pierre.** Le nom affiché est « Golem de fer »
  et son lore dit « les flèches s'y ébrèchent » ; la version de pierre contredirait les
  deux. C'est le même travers que le `defId` `rat` corrigé par ADR-061 — l'image doit
  suivre le nom, ou le nom doit changer, jamais les deux se contredire.
- Le scorpion **n'est pas repris** depuis son JPEG : celui-ci contient encore le dard
  orphelin dupliqué par Gemini, que le PO avait retiré à la main. L'outil l'a détecté
  (fragment de 5 973 px) et signalé au lieu de le supprimer en silence — c'est le
  comportement voulu, un membre légitimement détaché ne doit pas disparaître tout seul.

## Alternatives écartées

**Continuer à détourer sous Photoshop.** C'est la source du problème, pas sa solution : la
sélection dure supprime l'anticrénelage et rend la frange opaque. Le PO n'a pas à arbitrer
au pixel près une propriété que le code peut déduire.

**Décoder le JPEG dans l'outil.** Huffman, DCT, sous-échantillonnage chromatique : une
bibliothèque entière, ou une dépendance, pour éviter une commande de conversion.

**Garder la règle de clarté absolue et baisser le plafond de passes.** Ça borne les dégâts
sans corriger la cause : les créatures pâles continueraient de perdre leur bordure, juste
un peu moins.

**Détourer par « tout pixel proche du blanc ».** Mange les reflets, les yeux et les dents
enfermés dans le dessin. Déjà écarté par ADR-050, pour la même raison.
