# ADR-069 — Le miroir d'une planche se décide pose par pose

## Statut
Accepté (2026-08-21)

## Contexte

Le PO signale que le gobelin « continue avec ses rollback en avançant » — après la
correction d'ADR-068, qui avait pourtant remis la planche entière à l'endroit.

Extraction de la rangée de profil de la planche PRODUITE, comme le veut la règle
posée par ADR-068 : trois poses sur quatre regardent à droite, **la troisième
regarde à gauche**. Le générateur s'était trompé sur UNE case, pas sur la rangée.

En jeu, la créature faisait donc un demi-tour d'une image par cycle — exactement
ce qui se lit comme un va-et-vient sur place. Le défaut d'ADR-068 était réel et
sa correction juste ; elle en cachait simplement un second, de même symptôme.

## Décision

`packRows` ne prend plus un ensemble de RANGÉES à retourner mais un **prédicat
`(rangée, pose) => booléen`**. `--profile-left` s'exprime alors comme un cas
particulier, et un nouveau drapeau `--mirror rangée:pose[,…]` désigne les cases
isolées.

La maille de la rangée était le mauvais grain : elle suppose qu'un générateur se
trompe de façon systématique. L'observation dit le contraire — il dessine case
par case, et se trompe case par case. Retourner la rangée aurait mis à l'envers
les trois poses saines pour en sauver une.

La planche du gobelin est régénérée avec `--mirror 1:2`.

## Conséquences

- Le retournement d'une pose échange son équipement de main. Sur une case parmi
  douze, à 46 px d'affichage, c'est invisible ; un demi-tour du personnage ne
  l'est pas. Le compromis n'est pas discutable dans ce sens.
- La règle de vérification d'ADR-068 se durcit : il ne suffit pas de regarder que
  la rangée « part dans le bon sens », il faut regarder **chaque case**. C'est
  précisément ce qui manquait la fois précédente.
- La planche de l'orc a été revérifiée case par case : ses quatre poses regardent
  toutes à droite, elle n'a pas besoin du drapeau.

## Alternatives écartées

**Supprimer la pose fautive et passer à trois poses.** Toutes les rangées
doivent porter le même compte de poses ; il faudrait donc amputer aussi la face
et le dos, où rien ne cloche, et perdre un quart du cycle pour un défaut local.

**Regénérer la planche.** Le générateur ne garantit pas de faire mieux au
deuxième essai — il a déjà produit une rangée de dos qui tient de la variante
debout plus que du cycle de marche —, et une symétrie est ici une opération
exacte, sans perte.

**Détecter automatiquement le sens de chaque case.** Écarté pour la même raison
qu'en ADR-068 : aucun critère fiable, et un heuristique se tromperait en silence.
