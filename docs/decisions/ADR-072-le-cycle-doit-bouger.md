# ADR-072 — Une planche doit prouver qu'elle marche

## Statut
Accepté (2026-08-22)

## Contexte

Le PO, sur l'orc : « droite vers gauche et gauche vers droite, les jambes ont la
même position ». Puis, plus largement : « il faut qu'on retravaille notre prompt
et qu'on soit plus rigoureux sur le check du rendu ».

Mesure, écart entre poses d'une même rangée, calculé sur les jambes seules :

| planche | rangée | écart min | écart max | verdict |
|---|---|---|---|---|
| orc, planche d'origine | profil | 12 % | **66 %** | marche vraiment |
| orc, planche v2 | profil | 9 % | 22 % | glisse |
| orc, planche v2 | face | 17 % | 35 % | glisse |
| gobelin | profil | **1 %** | 16 % | deux poses identiques |
| gobelin | face | 5 % | 15 % | deux poses identiques |

Le générateur redessine la même pose de jambes en ne faisant varier que les bras
et l'arme. La planche passe alors tous les contrôles existants — découpage,
orientation, équipement, détourage — et le défaut n'apparaît qu'en jeu.

Il a été signalé par le PO deux fois de suite. Mon inspection case par case ne
l'avait pas vu : je regardais chaque case isolément, alors que le défaut n'existe
QU'ENTRE les cases.

## Décision

Mesurer, plutôt que regarder.

`cycle.ts` compare les poses d'une même rangée deux à deux et rend, pour chaque
rangée, sa paire la plus ressemblante et sa paire la plus éloignée. Le CLI
avertit dans deux cas :

- **doublon** — la paire la plus proche est sous 8 % : deux cases sont la même
  image, et le cycle compte une pose de moins qu'annoncé ;
- **cycle plat** — la paire la plus éloignée est sous 40 % : aucune alternance
  d'appui, la créature glissera.

La comparaison ne porte que sur les **60 % inférieurs** de la case. La marche se
lit dans les jambes ; inclure le buste noierait le signal sous les bras et
l'arme, qui bougent précisément là où les jambes ne bougent pas. C'est le
mécanisme même par lequel ces planches donnaient le change.

L'écart est rapporté à l'encre de l'UNION des deux poses, non à la surface de la
case : une case est surtout du vide, et diviser par sa surface écraserait toutes
les mesures vers zéro sans rien séparer.

Le prompt de génération est repris en conséquence : quatre poses décrites une à
une (contact, passage, contact inverse, passage inverse), amplitude chiffrée —
aux contacts, l'écart des talons vaut la moitié de la hauteur du personnage — et
interdiction explicite de redessiner deux fois la même position de jambes.

## Conséquences

- Un avertissement de cycle veut dire **régénérer**, pas rattraper : aucun
  réglage de l'outil ne fabrique une pose que le dessin ne contient pas. C'est
  le premier défaut de la série qui ne se corrige pas en aval.
- Les seuils sont adossés aux mesures ci-dessus et séparent les deux familles
  sans les frôler : 40 % laisse passer une planche à 66 % et retient tout ce qui
  plafonne à 26 %.
- Une rangée d'une seule pose ne déclenche rien : il n'y a pas de paire à
  comparer, et l'absence de cycle n'y est pas un défaut.
- Le document des prompts contenait deux sections dupliquées, dont l'une tronquée
  à la génération. Retirées au passage.

## Alternatives écartées

**Comparer les cases entières.** Mesuré : les bras et l'arme bougent assez pour
faire passer une rangée immobile au-dessus de n'importe quel seuil utile. C'est
exactement l'illusion à percer.

**Se fier à l'inspection visuelle.** Elle a laissé passer le défaut deux fois, y
compris après que j'aie durci deux fois la procédure de contrôle (ADR-068, 069).
Un défaut qui vit dans l'écart entre deux images ne se voit pas en regardant les
images une par une.

**Mesurer l'écartement des pieds plutôt que l'écart entre poses.** Essayé :
l'orc v2 donne 136, 140, 141, 138 — un signal exploitable, mais qui ne dit rien
d'un cycle où les deux appuis auraient le même écartement avec les jambes
inversées, ce qui est le cas normal. La comparaison deux à deux tranche les deux
situations avec une seule mesure.
