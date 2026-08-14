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

## Suite — emblème, jauge et notes (2026-08-14)

Le ruban validé, trois éléments détonnaient encore avec lui. Inventaire de ce que
le pack pouvait réellement fournir, fait avant de coder :

| besoin | dans le pack ? | décision |
|---|---|---|
| jauge d'avancement | **oui** — `bar-big-base.png` | châsse du pack, remplissage dessiné |
| emblème « Histoire » | **oui** — `buildings/castle-blue.png` | le Bastion, raster non teinté |
| note 1-3 étoiles | **non** — rien qui note un niveau | deux icônes dessinées pour le projet |

**La jauge** reprend le partage déjà retenu pour les PV du Bastion (ADR-030) :
l'ornement vient du pack, la couleur reste au jeu. Le pack livre bien un
remplissage (`bar-big-fill.png`) mais il est rouge, et `setTint` MULTIPLIE — on ne
peut le faire virer à l'or. Le remplissage est donc dessiné dans la gorge, en
retrait de la ferrure mesurée sur la planche.

**L'emblème de la tuile principale** devient le Bastion du pack. Les icônes du
dossier `ui/` sont des ressources (bois, or, viande, épées) qui ne couvrent aucune
de nos rubriques ; le château, lui, est le symbole même du jeu et la tuile
« Histoire » est celle qui représente un LIEU. C'est un mélange assumé — pixel art
couleur sur la tuile principale, silhouettes dorées sur les quatre secondaires —
qui suit le rang des tuiles d'ADR-025. `UiTileOpts.rawIcon` marque un emblème du
pack : ni teinte, ni ombre portée, et mise à l'échelle qui préserve ses
proportions (la planche fait 320×280, la forcer au carré l'écraserait).

**Les notes de chapitre** quittent les glyphes Unicode `★`/`☆`. Ceux-ci sont rendus
par la police du système : aspect variable d'un appareil à l'autre et hors de la
palette — précisément ce qu'ADR-012 proscrit pour les emojis, sans que personne
n'ait fait le rapprochement. Deux SVG rejoignent le registre (`star`,
`starEmpty`). L'étoile non obtenue garde l'OR en transparence : teintée avec
`ACCENT.locked`, elle avait la luminance du panneau et disparaissait — le joueur
ne voyait plus qu'il en manquait, il croyait qu'il n'y en avait pas.
