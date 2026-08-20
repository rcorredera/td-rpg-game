# ADR-057 — `content/` découpé par nature de donnée

## Statut
Accepté (2026-08-20).

## Contexte

`src/content/index.ts` faisait **970 lignes**, le plus gros fichier du projet, et mélangeait quatre
choses qui n'ont ni le même rythme de modification ni le même lecteur :

- la **géométrie** des cartes des chapitres 2 à 20 (300 lignes de waypoints et d'emplacements) ;
- la **logique** de génération des vagues (`rosterFor`, `makeWaves`, `makeChapter`, 180 lignes de
  code, pas de données) ;
- deux **catalogues** — tours et créatures — soit près de 280 lignes de stats ;
- le reste du `ContentPack` : chapitres, héros, économie, déblocages, récompenses, notation.

ADR-003 impose que toute valeur d'équilibrage vive dans `src/content/`. Rien n'imposait qu'elle
vive dans un SEUL fichier — c'est arrivé par accumulation. La conséquence pratique : rééquilibrer
une tour obligeait à naviguer dans 970 lignes dont 480 n'avaient aucun rapport, et une fonction de
génération de vagues se retrouvait à quelques lignes d'un littéral de PV.

## Décision

Cinq fichiers dans `src/content/`, découpés par **nature de donnée** :

| Fichier | Contenu | Nature |
|---|---|---|
| `maps.ts` | `CH2_MAP` … `CH20_MAP` | géométrie |
| `waves.ts` | `makeWaves`, `makeChapter`, rosters | logique |
| `towers.ts` | `TOWERS` | catalogue |
| `enemies.ts` | `ENEMIES` | catalogue |
| `index.ts` | assemblage du `ContentPack`, chapitres, héros, économie, déblocages, récompenses, notation | assemblage |

`index.ts` passe de 970 à **228 lignes** et redevient lisible d'un bloc : on y voit la forme du
`ContentPack` sans avoir à traverser ses catalogues.

Deux choses restent délibérément dans `index.ts` :

- **La carte du chapitre 1**, écrite à la main, reste avec son chapitre. Elle est le seul contenu
  non généré du jeu ; la séparer de son lore et de ses vagues aurait coûté plus qu'elle ne rapporte.
- **`scaling`, `economy`, `rewards`, `rating`** : quelques lignes chacun, transverses à tout le
  contenu. Leur donner un fichier chacun aurait remplacé un fichier trop gros par sept trop petits.

Le point d'entrée ne change pas : tout le projet importe toujours `CONTENT` depuis `content/index`,
et `rosterFor` reste privé à `waves.ts`.

## Conséquences

- **Aucune valeur d'équilibrage modifiée.** Vérifié, pas supposé : une comparaison
  `JSON.stringify(CONTENT)` entre la version de `main` et la version découpée rend une égalité
  stricte — structure ET ordre des clés. La comparaison a elle-même été validée par mutation (un
  `damage: 40` changé en `41` la fait échouer), pour qu'elle ne soit pas une tautologie.
- Les 272 tests passent sans qu'aucun ait été modifié, `index.ts` restant le point d'entrée.
- `content/integrity.test.ts` continue de garder l'ensemble : il
  importe `CONTENT`, donc il couvre le découpage sans changer d'une ligne.

## Alternatives écartées

- **Un fichier par chapitre** (`ch01.ts` … `ch20.ts`) : écarté. Les chapitres 2-20 sont GÉNÉRÉS —
  il n'y a rien à écrire par chapitre à part sa carte, son nom et son lore. Vingt fichiers de trois
  lignes rendraient la courbe de difficulté illisible, alors qu'elle se lit aujourd'hui d'un coup
  d'œil dans les tables indexées par chapitre.
- **Sortir aussi `economy`/`rewards`/`rating`** dans un `balance.ts` : écarté pour l'instant —
  quelques lignes chacun, et ils se lisent ensemble avec les chapitres qu'ils indexent.
- **Un barrel `content/index.ts` qui ne ferait que ré-exporter**, l'assemblage partant ailleurs :
  écarté — `CONTENT` est LE point d'entrée connu de tout le projet (`core`, `meta`, `render`,
  `balance`) ; le déplacer pour gagner en symétrie ferait toucher des dizaines d'imports sans rien
  apporter au lecteur.
