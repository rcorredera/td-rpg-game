# ADR-073 — Un gabarit de poses dessiné, plutôt qu'un prompt qui les décrit

## Statut
Accepté (2026-08-25)

## Contexte

Le PO, après cinq planches générées et autant de refus : « est-ce qu'on pourrait
pas générer un sprite générique, sans détail d'implémentation mais avec les
jambes, les bras, les positions, quitte à le faire en SVG d'abord pour servir de
contexte à l'IA qui va générer ».

Le prompt a été durci quatre fois (ADR-068 à 072) : angles chiffrés, balancier
décrit pose par pose, interdiction de tourner, points de vérification finaux. Le
générateur continue de rendre la même jambe devant sur quatre cases, ou un
personnage qui pivote progressivement d'une case à l'autre.

Décrire une pose et l'obtenir sont deux choses différentes.

## Décision

Dessiner les poses, et les joindre au prompt comme image de référence.

`pose.ts` définit **un seul squelette** dans l'espace, et trois PROJECTIONS —
face, profil, dos. Les trois rangées montrent alors le même mouvement par
construction, et non parce qu'on l'a demandé : c'est la différence entre une
contrainte et un souhait.

Le côté droit du corps est le côté gauche décalé d'un demi-cycle. L'alternance
des appuis — le défaut qui a coulé les cinq planches — devient impossible à
rater sans réécrire la définition même du cycle.

`mannequin.ts` le rasterise en capsules grises, sans visage, sans équipement,
sans couleur d'espèce. Ce n'est pas un sprite mais un GABARIT : tout détail qu'on
y mettrait serait un détail que le générateur recopierait au lieu d'inventer le
monstre.

Trois choix de rendu portent seuls l'information utile :

- **Les os sont peints du plus lointain au plus proche.** C'est ce qui fait
  qu'une jambe en masque une autre, donc qu'on voit laquelle est devant.
- **Le membre le plus éloigné est assombri.** Sans ce contraste, deux jambes de
  la même teinte vues de profil sont indiscernables — précisément l'information
  qui manquait aux planches générées.
- **Un nez, et rien d'autre au visage.** Sans lui, les rangées de face et de dos
  sont exactement le même dessin. Il se voit au centre du visage de face,
  dépasse de profil, disparaît de dos : trois informations pour un seul trait.

## Conséquences

### Le gabarit a corrigé l'outil qui devait le juger

Passé dans `npm run sprite -- --strip`, le gabarit s'est fait refuser par le
contrôle de cycle d'ADR-072. Deux défauts de ce contrôle, qu'aucune planche
générée n'avait pu révéler :

**Le doublon se cherchait entre toutes les paires.** Or vue de profil, une marche
saine a la même SILHOUETTE à ses deux poses de contact — seules l'occlusion et
l'ombre disent quelle jambe est devant. Le critère ne porte donc plus que sur les
poses VOISINES du cycle, bouclage compris.

**Le seuil d'alternance était unique.** Vues de face, les jambes se déplacent en
PROFONDEUR et ne changent presque pas la silhouette : le gabarit y mesure 23 %,
contre plus de 40 % de profil. Exiger le seuil du profil sur une vue frontale
revenait à demander l'impossible. Seuil distinct, adossé à cette mesure.

Avoir une référence dont la justesse ne dépend pas du jugement, c'est ce qui a
permis de distinguer « la planche est mauvaise » de « la mesure est mauvaise ».

### Le gabarit a aussi corrigé son propre auteur

Le test du balancier a relevé qu'aux poses de passage, mes bras accompagnaient la
jambe du même côté au lieu de la contrer. Défaut invisible sur une image fixe,
qui aurait donné un balancier juste aux contacts et faux entre les deux.

### Reste

- Le gabarit est produit par `npm run mannequin -- <destination>`, à joindre au
  prompt comme image.
- Il traverse la chaîne de découpage sans un avertissement : 3 × 4 cases, écart
  au sol de 0 px. Il sert donc aussi de banc d'essai pour l'outillage lui-même.
- Aucune garantie que le générateur suive le gabarit. C'est un essai, et il
  vaut d'être fait avant d'ajouter une sixième couche de consignes textuelles.

## Alternatives écartées

**Durcir le prompt une cinquième fois.** Les quatre premières ont chacune
supprimé le défaut visé et laissé passer le suivant. Le texte a atteint sa limite
comme moyen de spécifier une pose.

**Un SVG plutôt qu'un PNG**, comme le suggérait le PO. Le SVG demanderait une
rasterisation par un tiers pour être joint à un prompt, alors que le projet
possède déjà son encodeur PNG et son modèle RGBA. Le dessin est fait de capsules
et de disques : les primitives tiennent en trente lignes.

**Générer une rangée à la fois**, trois images au lieu d'une. Chaque image serait
un problème plus simple, mais la constance du personnage — couleurs, proportions,
équipement — deviendrait beaucoup plus dure à tenir d'une image à l'autre. À
garder en réserve si le gabarit ne suffit pas.
