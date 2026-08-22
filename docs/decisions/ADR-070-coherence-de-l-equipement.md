# ADR-070 — L'équipement ne change pas de main : retirer la pose, ou la retourner

## Statut
Accepté (2026-08-21)

## Contexte

Le PO, après ADR-069 : « pour le gobelin, utiliser les bons sprites — le bouclier
change de main quand il se déplace ».

ADR-069 avait retourné la pose de profil que le générateur avait dessinée à
l'envers. J'y avais annoncé l'effet de bord — le retournement échange l'épée et
le bouclier — en le jugeant invisible à 46 px. Il ne l'est pas : ce qui saute aux
yeux, ce n'est pas la position de l'équipement sur une image fixe, c'est le
CHANGEMENT d'une image à la suivante. L'œil ne mesure pas, il détecte le
mouvement, et un bouclier qui saute d'un bras à l'autre trois fois par seconde
est un mouvement.

L'inspection case par case, étendue cette fois à toutes les rangées et aux deux
créatures, a montré que le défaut était plus large que la seule pose d'ADR-069 :

| planche | rangée | poses fautives | nature |
|---|---|---|---|
| gobelin | face | 1 | équipement inversé |
| gobelin | profil | 2 | **autre flanc** du personnage |
| gobelin | dos | 1 | équipement inversé |
| orc | dos | 0 et 1 | équipement inversé |

## Décision

Deux remèdes, choisis selon la nature du défaut.

**Équipement inversé → retourner la pose (`--mirror`).** Le générateur a dessiné
le personnage en miroir ; la symétrie le remet d'aplomb, équipement compris. En
vue de face ou de dos, un retournement est de toute façon visuellement neutre.

**Autre flanc → retirer la pose (`--drop`), nouveau.** La pose de profil fautive
du gobelin ne montre pas le personnage retourné mais son AUTRE côté : celui où le
bouclier est devant. Aucune symétrie ne répare cela — le miroir l'oriente
correctement tout en laissant le mauvais flanc face à la caméra. Il faut donc
renoncer à la pose.

`--drop` retire l'index de TOUTES les rangées à la fois : elles doivent porter le
même nombre de poses, sans quoi le rangement direction-major (ADR-067) se décale
et chaque direction irait puiser dans la suivante.

Le gobelin passe donc à **3 poses par direction**, l'orc reste à 4.

## Conséquences

- Un cycle de trois poses reste parfaitement lisible : appui, passage, appui.
  Quatre poses dont une clignote ne le sont pas.
- Les index de `--mirror` s'entendent **après** `--drop` : le retrait précède le
  rangement, et c'est le rangement qui retourne. Documenté dans l'aide du CLI.
- La règle de vérification d'ADR-068/069 gagne un second critère. Il ne suffit
  plus de regarder l'ORIENTATION de chaque case ; il faut aussi vérifier que
  l'équipement reste du même côté d'une pose à l'autre, rangée par rangée. C'est
  le contrôle qui manquait aux deux passes précédentes.
- L'orc reprend une planche complète à trois directions (`orc_marche_v2`), là où
  il n'avait qu'un profil.

## Alternatives écartées

**Retourner la pose de profil fautive du gobelin (ce que faisait ADR-069).**
C'est ce qui a produit le défaut signalé. Le miroir corrige une orientation, pas
un point de vue.

**Dupliquer une pose saine à la place de la fautive.** Le cycle garderait quatre
cases mais l'une d'elles apparaîtrait deux fois de suite : le pas marquerait un
temps d'arrêt à chaque tour, ce qui est un autre défaut de rythme pour le même
prix en octets.

**Régénérer les planches jusqu'à ce qu'elles soient propres.** Le générateur ne
garantit rien à l'essai suivant — trois planches sur trois ont eu au moins une
case fautive, à des endroits différents à chaque fois. Corriger vaut mieux
qu'espérer.
