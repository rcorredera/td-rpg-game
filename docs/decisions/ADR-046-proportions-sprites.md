# ADR-046 — Proportions natives des sprites préservées (`fitSquare`)

## Statut
Accepté (2026-08-19)

## Contexte
Le joueur signale des créatures visiblement étirées dans le menu (Bestiaire). En
combat comme dans le Bestiaire, l'affichage d'un ennemi forçait `setDisplaySize(size,
size)` — un carré fixe. C'était sans risque tant que le skin était le SVG maison
(ADR-016), toujours dessiné sur un canevas carré 128×128 : ratio natif 1:1 partout.

Depuis ADR-043/044/045, le bestiaire est presque entièrement composé de sprites
importés (CraftPix, IA) rognés à leur silhouette réelle — donc à un ratio natif
variable : une chauve-souris ailes déployées fait ~2:1 (large), un gobelin casqué
plutôt 0.6:1 (haut). Forcer un carré écrase les larges et étire les hauts.

## Décision
- Nouvelle fonction pure `fitSquare(nativeW, nativeH, target)` dans `render/sprites.ts`
  (même fichier que le registre de skin, ADR-005) : renvoie `{w, h}` qui calent le
  plus grand côté sur `target` et suivent le même ratio sur l'autre — jamais
  l'inverse, qui déborderait la case.
- Appliquée aux deux endroits qui affichaient un ennemi à taille fixe :
  - `render/game/entities.ts` (`placeEnemy`, champ de bataille) — calcule `fitW`/`fitH`
    à partir de `s.frame.width`/`s.frame.height` (dimensions natives de la texture,
    pas du sprite déjà déformé la frame précédente) avant d'appliquer le squash/étire
    de l'animation procédurale (ADR-017) par-dessus.
  - `render/menu/helpers.ts` (`lorePage`, portrait du Bestiaire) — même calcul sur
    `img.width`/`img.height`, lus AVANT le premier `setDisplaySize` (sinon ils
    refléteraient déjà une déformation).
- Les tours, le héros, le Bastion et les dalles restent en `setDisplaySize(size,
  size)` tel quel : leurs textures (SVG maison, ADR-016) sont toujours dessinées
  carrées, rien à corriger là.

## Conséquences
- Toute créature du bestiaire garde sa silhouette telle que dessinée, quel que soit
  son ratio natif — la hiérarchie de taille (ADR-016, "un golem doit se voir massif")
  reste portée par le plus grand côté, donc intacte.
- `sprites.test.ts` couvre `fitSquare` directement (carré déjà carré, large, haut,
  dimensions invalides) — pas besoin d'une scène Phaser pour vérifier la géométrie,
  c'est une fonction pure.
- Si un futur sprite (tour, décor) devient un import à ratio variable, le même
  helper s'applique — pas de nouvelle géométrie à inventer.

## Alternatives écartées
- **Rogner/repadder chaque sprite importé à un canevas carré avant de l'enregistrer**
  — écarté : ajoute une étape manuelle par asset (fragile, oubliable) là où
  `fitSquare` résout le problème une fois, au rendu, pour tout le bestiaire présent
  ET futur.
- **Garder le carré mais centrer par letterboxing (barres vides)** — écarté : gaspille
  l'espace visuel sans bénéfice, la hiérarchie de taille (le plus grand côté) est ce
  qui doit rester lisible, pas une boîte englobante uniforme.
