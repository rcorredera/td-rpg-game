# ADR-071 — Les poches de fond enfermées se recensent toujours, se bouchent sur demande

## Statut
Accepté (2026-08-21)

## Contexte

Le PO, sur les deux planches de marche : « il y a des ajustements de nettoyage de
fond blanc avec les bras et le ventre quand ils tiennent une arme ».

Le détourage retire le fond par REMPLISSAGE depuis les bords de l'image
(`floodBackground`). Le creux entre un bras et le torse, refermé par l'arme que
la créature tient devant elle, n'est relié à aucun bord : le remplissage ne
l'atteint jamais et il reste blanc opaque en jeu.

Le remède évident — « effacer tout pixel clair » — est celui que
`floodBackground` refuse explicitement, et pour une bonne raison : c'est le piège
d'ADR-050, où la passe des poches enfermées mangeait les reflets. Un reflet
d'armure, un œil, une dent sont les mêmes composantes pour l'algorithme.

## Décision

Séparer le RECENSEMENT du BOUCHAGE.

`findHoles` recense les composantes claires que le remplissage n'a pas atteintes
et **ne mute rien**. Le CLI l'exécute toujours et rapporte le compte ; sans
`--fill-holes`, il avertit que ces zones resteront blanches en jeu.

`fillHoles` ne bouche que les poches qu'on lui donne, sur demande explicite.
L'opérateur regarde d'abord — une carte des poches coloriées se produit en
quelques lignes — puis tranche.

Mesuré sur les deux planches avant décision : 67 poches pour l'orc, 40 pour le
gobelin, toutes situées dans un creux de bras ou dans l'échancrure d'un croissant
de hache. Aucune sur un casque, une lame ou un œil. Le bouchage était donc sûr
ICI, et c'est l'inspection qui l'a établi, pas l'algorithme.

## Conséquences

- Le bouchage se place **avant** `stripFringe` : ouvrir une poche découvre le
  dégradé JPEG qui la bordait, et c'est au décapage de l'ôter. Dans l'autre
  ordre, il resterait un liseré clair au creux de chaque aisselle — le défaut
  d'origine déplacé de quelques pixels.
- Une poche se rebouche depuis une GRAINE, pas depuis sa boîte englobante : deux
  échancrures d'un même fer de hache se chevauchent en boîte sans se toucher en
  pixels, et boucher par boîte emporterait la seconde sans qu'elle ait été
  recensée ni décidée.
- Le CLI avertit au-delà de 2000 px pour une poche bouchée. Les aisselles
  plafonnent à ~400 px sur une source de 1024 ; bien au-delà, c'est probablement
  une surface claire DESSINÉE, et la boucher ferait un trou.
- Chiffres après passage : 952 px bouchés sur le gobelin, 1984 sur l'orc.

## Alternatives écartées

**Boucher d'office toute poche enfermée.** C'est exactement ADR-050. Le projet a
déjà payé cette erreur une fois ; la répéter parce que deux planches s'y prêtent
serait confondre un échantillon avec une règle.

**Distinguer le fond du reflet par un critère automatique.** Mesuré : luma et
chromaticité des poches sont indiscernables de celles d'un reflet d'acier
(237-255, chroma ≤ 11 dans les deux cas), et le contour immédiat d'une poche est
la frange claire du JPEG, pas le trait noir — la bordure médiane vaut ~190 des
deux côtés. Aucun des critères essayés ne sépare les deux familles.

**Retoucher les sources à la main.** C'est ce que faisait le PO au départ, et
c'est ce que l'outillage existe pour éviter (ADR-061).
