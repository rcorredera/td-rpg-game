# ADR-031 — Les titres de tuile portent un ruban du pack

**Statut** : accepté · **Date** : 2026-08-14

## Contexte

ADR-030 a donné aux panneaux l'ardoise ouvragée du pack et listait ce qui restait
inutilisé : rubans, bannière, jauge. La jauge a été branchée avec la barre de PV
du Bastion, ce qui a introduit la bande à TROIS tranches (`planStrip`). Restaient
les rubans — et c'est la pièce qui manquait vraiment : le pack les livre dans les
**mêmes cinq couleurs que ses boutons**, mesuré identique au pixel près (teal
`rgb(65,145,157)` de part et d'autre). Un titre posé en texte nu ne raccrochait
rien ; un titre sur ruban raccroche les tuiles aux commandes.

## Décision

**Le titre d'une tuile se pose sur un ruban** (`components/ribbon.ts`), dont la
couleur suit le SENS et non le goût : teal par défaut, pourpre pour les Failles,
gris pour une entrée verrouillée.

Trois choix, chacun tranché par une mesure et non au jugé.

**La variante ARRONDIE, pas celle en pointe.** Mesurées : 130×54 contre 132×60,
avec des embouts de 61 dans les deux cas. Sur une tuile secondaire de 167, la
version en pointe ne laissait plus la place à l'emblème.

**Une marge SÛRE, distincte de la marge de découpe.** L'embout mesure 61 px de
large sur une texture de 130 — mais l'essentiel de ces 61 px est déjà le corps
plat du ruban ; seuls les premiers pixels portent l'arrondi. Dimensionner le
libellé sur la marge de découpe aurait réservé 122 px pour rien et donné des
rubans deux fois trop larges ; le faire « au jugé » aurait ramené le texte sur
l'arrondi. `uiSkin` mesure donc, sur la rangée médiane, la distance depuis chaque
bord jusqu'au retour à la couleur du corps, et l'expose via `uiSkinSafeInsets`.
C'est la même méthode que `cornerDetailDepth` pour les panneaux : une mesure sur
la donnée réelle plutôt qu'une constante choisie.

**Une réduction PROPORTIONNELLE, jamais un étirement.** Le ruban est borné à 26 %
de la hauteur de la tuile et réduit par `setScale` — un nine-slice à embouts fixes
étiré verticalement les déformerait. Le pack est du pixel art : on le réduit, on
ne l'agrandit jamais.

**La marge intérieure d'une tuile devient un plancher, pas une proportion.**
`composeTile` reçoit `minPad`, alimenté par `uiPanelPad`. La marge proportionnelle
valait 15 sur une tuile de 167 quand la volute d'angle en occupe 22 : le ruban
mordait sur le cadre.

## Conséquences

- Mesuré après, sur le Campement : marge minimale **22** sur toutes les tuiles
  (contre 15), ruban réduit à 43 sur les secondaires et natif à 54 sur la
  principale, libellé toujours à ≥ 34 unités de l'arrondi, aucun débordement.
- L'emblème des tuiles secondaires passe de 70 à 56 : le ruban prend sa part. Le
  bloc reste centré et rien ne dépasse — c'est `composeTile`, pur et testé, qui
  arbitre.
- `preloadUiSkin` charge désormais par FICHIER et non par clé : les trois rubans
  sortent de la même planche, à trois rangées différentes.
- Restent inutilisés : la bannière (`banner.png`) pour les pages de lore du
  Bestiaire, et les rangées rouge/jaune des rubans, sans emploi actuel.
