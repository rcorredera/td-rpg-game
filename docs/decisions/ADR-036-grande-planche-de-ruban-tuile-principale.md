# ADR-036 — Grande planche de ruban pour la tuile principale, mesure non carrée

## Statut
Accepté (2026-08-14). Étend ADR-031 (rubans de titre) et la mesure du pack introduite par
ADR-032.

## Contexte

La tuile « Histoire » (Bastion) porte, comme toutes les tuiles, un ruban de titre du pack —
mais à sa taille native de PETIT ruban (`ribbons-small.png`), alors qu'elle est nettement plus
grande que les tuiles secondaires. Le pack fournit une variante `ribbons-big.png`, dans la
réserve depuis ADR-032/README, jamais branchée.

Mesurée (rangée « arrondie » du ton teal, même choix qu'ADR-031) : les ailes de fanion de cette
planche font **~98×59**, contre 61×54 pour la petite. Le code qui mesure les bandes à trois
tranches (`opaqueBounds`, `uiSkin.ts`) prélève dans une fenêtre CARRÉE — vrai pour toutes les
planches branchées jusqu'ici, où la pièce et le pas de grille coïncident. Cette planche-là a un
pas de 128 en largeur ET en hauteur, mais un contenu de 98×59 : une fenêtre carrée à 98
empièterait de 34 px sur la rangée de couleur suivante, faussant la mesure — exactement la
famille de piège qu'ADR-032 avait déjà nommée (« une planche 3×3 a des gouttières »), ici sur
l'AUTRE axe.

## Décision

**`opaqueBounds` prend une fenêtre `sizeW`×`sizeH`**, pas un `size` unique. Les planches déjà
branchées restent carrées (elles passent `sizeW === sizeH`), rétrocompatibles sans y toucher.
`StripSheet` gagne un champ optionnel `cellH` (largeur = `cell` existant, hauteur = `cellH` si
fourni, sinon `cell`) — extension minimale, pas de renommage des planches existantes.

**Nouvelle entrée `ts_ribbon_big`** (`ribbons-big.png`, cols `[0, 192, 320]`, `cell: 128`,
`cellH: 64`) — colonnes propres à cette planche (elle fait 448 de large contre 320 pour la
petite, pas les mêmes offsets).

**`uiRibbonKey(scene, tone, big)`** devient le point d'entrée unique de résolution de clé,
appelé À LA FOIS par `tile.ts` (pour dimensionner le bloc de titre AVANT de dessiner) et par
`uiRibbon` (pour dessiner). `big` n'est honoré que pour le ton `"normal"` — seule variante
déclinée en grand ; les tons `"rift"`/`"off"` retombent sur la petite planche. `uiRibbonHeight`
prend désormais la clé en paramètre plutôt que de lire `UI_SKIN_RIBBON` en dur.

## Conséquences

- La tuile Bastion peut désormais utiliser `ribbons-big.png` sans redéfinir la géométrie du
  module de mesure — les deux planches partagent le même code, seule la config diffère.
- **La clé doit être résolue AVANT de mesurer** (`uiRibbonKey` appelé en premier dans `tile.ts`,
  puis `uiRibbonHeight(scene, key)`) : mesurer sur la PETITE planche puis dessiner la GRANDE
  aurait reproduit le défaut qu'ADR-032 avait déjà corrigé une fois pour les vignettes de
  chapitre (deux calculs de hauteur qui ne se parlent pas).
- Vérifié en pilotant `window.__game` (capture d'écran indisponible en session, ADR-034) : la
  texture composée `ts_ribbon_big` (203×59) ne présente aucun artefact de gouttière ; sur
  l'écran d'accueil, un seul objet l'utilise (la tuile Histoire), les quatre tuiles secondaires
  gardent `ts_ribbon`/`ts_ribbon_off` ; les bornes mesurées (ruban, emblème, titre, tuile) ne se
  chevauchent pas hors du chevauchement voulu (le titre se pose SUR le ruban).
- Pas de nouveau test unitaire : `opaqueBounds` est une fonction de scan de pixels DOM
  (`Uint8ClampedArray` d'une image chargée), non exportée, dans la même famille que
  `cornerDetailDepth` — le rendu (`render/`) n'est pas testé unitairement (ADR-034), la
  vérification se fait sur la texture composée réellement produite.

## Alternatives écartées

- **Redéfinir `cell` comme un couple `{w, h}` sur TOUTES les entrées `StripSheet`** : plus
  cohérent nominalement, mais casse inutilement cinq entrées déjà correctes pour une seule qui
  en a besoin — étendre par un champ optionnel est le changement minimal qui couvre le cas réel.
- **Recomposer `ribbons-big.png` à la taille de la petite planche** : jetterait le travail de
  l'artiste sur la grande variante, l'objectif même de la brancher.
