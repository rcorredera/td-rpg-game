# ADR-030 — L'habillage des panneaux vient du pack, pas d'une teinte

**Statut** : accepté · **Date** : 2026-08-13

## Contexte

Retour de playtest après ADR-029 : « les tuiles n'ont pas du tout la même
thématique que les boutons ». Constat juste, et la cause n'était pas dans le
code de composition — elle était dans le CHOIX DE PLANCHE.

Le pack Tiny Swords fournit deux planches de panneau. On avait branché
`paper-regular.png` — le parchemin crème — partout, et on le teignait vers
l'ardoise des thèmes (ADR-026). Or `setTint` MULTIPLIE : le parchemin y perdait
toute sa matière et ne gardait que la forme de son bord. Les boutons, eux,
gardent leur art natif. D'où deux factures visuelles dans un même écran.

`paper-special.png`, jamais utilisée, est une ardoise sombre à volutes dorées
aux angles — c'est-à-dire, littéralement, l'identité du jeu (or sur ardoise). Elle
n'a besoin d'aucune teinte, exactement comme les boutons.

Inventaire de ce que le pack offre et de ce qu'on en faisait :

| planche | ce que c'est | usage avant |
|---|---|---|
| `paper-regular` | parchemin crème | tous les panneaux, teinté en sombre |
| `paper-special` | **ardoise + volutes dorées** | aucun |
| `ribbons-small` / `-big` | rubans, 5 couleurs dont celles des boutons | aucun |
| `banner` | parchemin roulé | aucun |
| `bar-big-base` / `-fill` | jauge en bois cerclé | aucun |

## Décision

**Le panneau ouvragé du pack devient l'habillage de tous les panneaux**
(`ts_panel` → `paper-special.png`, marge 22). `paper-regular` reste en réserve
pour de futures pages de lore, où un parchemin a du sens.

Trois conséquences mécaniques, chacune corrigée à sa racine :

1. **La mesure de profondeur d'angle était fausse.** `cornerDetailDepth`
   s'arrêtait au PREMIER pixel de remplissage rencontré en diagonale et rendait 3
   sur cette planche — alors que la volute est posée PLUS LOIN dans la pièce,
   entre 9 et 17 px de l'angle. Le plan aurait rogné en plein milieu de
   l'ornement. Elle rend désormais la position du DERNIER pixel différent du
   remplissage. Un ornement d'angle n'est pas forcément collé à l'angle.

2. **Une base sombre ne se teinte pas avec une couleur sombre.** Le thème ne
   redéfinit plus la clarté du panneau — le pack la porte — il en nuance la
   dominante via `skinTint`, un multiplicateur CLAIR (`0xffd9ae` pour Braise,
   `0xe8f0ff` pour Nocturne, `0xe6ccff` pour Arcane). `renderedPanel()` donne la
   couleur réellement affichée, et c'est elle que les garanties de contraste
   jugent désormais : les juger sur `panel` reviendrait à garantir la lisibilité
   d'une couleur que plus aucun écran n'affiche.

3. **Un cadre ouvragé impose une taille minimale.** Deux marges de 22 ne tiennent
   pas dans une rangée de 30. `fitInsets` (pur, testé) les ramène
   proportionnellement à ce que l'élément peut loger, et les rangées du menu de
   tour passent de 30/44/58 à 48/64/78 — ce qui les remet du même coup au-dessus
   du plancher tactile d'ADR-011, qu'elles violaient depuis toujours.

**Plus aucun liseré vectoriel par-dessus l'habillage**, y compris les liserés
d'ÉTAT qu'ADR-029 avait épargnés : sur le panneau ouvragé, l'anneau vert
« conquis » de la grille des chapitres doublait le cadre doré de façon très
visible. L'état reste porté par le contenu (étoiles, nom masqué, prix en rouge)
et par la teinte éteinte du panneau verrouillé.

**L'emblème des tuiles est plafonné en PROPORTION** (`w × 0,5`, `h × 0,42`) en
plus de sa résolution, et reçoit une ombre portée. Une silhouette monochrome
(ADR-012) occupant 55 % de la hauteur d'une tuile ouvragée lisait comme un aplat
de remplissage ; c'est le cadre qui donne sa présence à la tuile, pas l'icône.
L'aperçu de biome ajouté par ADR-029 sur la tuile principale disparaît par la
même occasion : il comblait un vide que le cadre comble mieux.

## Conséquences

- Panneaux, tuiles, rangées de liste, vignettes, menu de tour et fenêtres modales
  passent d'un aplat teinté à l'ardoise ouvragée du pack, d'un seul changement de
  planche.
- Le thème d'ADR-026 conserve le fond, les marbrures, les accents et les textes ;
  il ne décide plus de la clarté des panneaux. C'est une réduction de portée
  assumée : le pack apporte sa matière, le thème sa dominante.
- Deux défauts préexistants remontés au passage par le nouveau cadre, et corrigés :
  la largeur du menu de tour était figée à 230 alors que sa plus longue ligne
  mesure 275 (elle en dérive désormais), et ses rangées étaient sous le plancher
  tactile.
- Encore inutilisés : rubans (titres), bannière (lore), jauge en bois. Ce sont les
  candidats naturels de la prochaine passe.
