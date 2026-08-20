# ADR-055 — `render/` découpé en sous-dossiers par couche

## Statut
Accepté (2026-08-20).

## Contexte

`render/` avait déjà commencé à se ranger — `components/` (ADR-007), puis `game/` et `menu/`
(ADR-034) — mais **30 fichiers étaient restés à la racine**, soit près de 3 000 lignes sans
regroupement : les tokens de couleur (`theme.ts`, `palette.ts`), la géométrie nine-slice
(`uiSkin.ts` + `nineSlicePlan.ts` + `nineSliceFlatten.ts`, ~900 lignes à eux trois), les registres
d'assets (`sprites.ts`, `icons.ts`, `assets.ts`), la géométrie pure du champ (`castle.ts`,
`path.ts`), et les services transverses (`viewport.ts`, `audio.ts`) cohabitaient dans une liste
plate où seul le nom de fichier disait à quelle couche on avait affaire.

Symptôme le plus net : `render/terrain.ts` et `render/game/terrain.ts` coexistaient, deux fichiers
homonymes de couches DIFFÉRENTES. Le premier est une fabrique de textures (dessin canvas d'une
dalle d'herbe répétable, ADR-016) ; le second monte le décor de la scène et le redessine par frame
en fonction du `RunState` (ADR-034). Le second importe le premier — mais rien dans l'arborescence
ne le disait.

## Décision

La racine de `render/` ne garde plus que les **points d'entrée Phaser** — `GameScene.ts`,
`MenuScene.ts`, `EntityLayer.ts`, et `layoutLiterals.test.ts` qui garde justement ces scènes. Tout
le reste descend d'un cran, par COUCHE et non par sujet :

| Dossier | Rôle | Contenu |
|---|---|---|
| `theme/` | tokens visuels et helpers d'écran | `theme.ts`, `uiTheme.ts`, `palette.ts`, `ui.ts`, `icons.ts` |
| `skin/` | habillage nine-slice du pack (ADR-029/036) | `uiSkin.ts`, `nineSlicePlan.ts`, `nineSliceFlatten.ts`, `skinSwap.test.ts` |
| `assets/` | « rôle → texture/frame », y compris les textures GÉNÉRÉES | `assets.ts`, `sprites.ts`, `colorRemap.ts`, `animation.ts`, `biomes.ts`, `terrain.ts`, `backdrop.ts` |
| `world/` | géométrie PURE du champ de bataille | `castle.ts`, `path.ts`, `projectiles.ts` |
| `platform/` | services transverses écran/son/build | `viewport.ts`, `audio.ts`, `buildInfo.ts`, `typography.test.ts` |
| `components/`, `game/`, `menu/` | inchangés (ADR-007, ADR-034) | — |

Le critère de `assets/` est **« ce module produit ou résout une texture »**, pas « ce module est
pur » : `terrain.ts` et `backdrop.ts` importent Phaser pour enregistrer leurs textures, et
rejoignent quand même `sprites.ts` parce qu'ils répondent à la même question. `world/` est réservé
aux modules géométriques SANS Phaser — ceux que `balance/datasheet.test.ts` importe déjà pour ne
pas recopier une règle (ADR-030).

L'homonymie disparaît par la couche : `assets/terrain.ts` fabrique la dalle, `game/terrain.ts`
monte le décor.

## Conséquences

- Aucune logique touchée : déplacements + réécriture de chemins d'import. Les 259 tests passent
  sans modification de leur contenu, et le build est identique.
- Les tests gardiens qui lisent la SOURCE continuent de fonctionner tels quels :
  `skinSwap.test.ts` et `assets.integrity.test.ts` balaient `import.meta.glob("/src/render/**/*.ts")`,
  déjà récursif. Seule la liste de dérogations de `skinSwap.test.ts` a suivi le fichier concerné
  (`/src/render/skin/uiSkin.ts`) — c'est le prix d'un chemin ABSOLU en dur dans un test.
- Couplage externe confirmé minime : hors de `render/`, seuls `main.ts` (scènes + viewport) et
  `balance/datasheet.test.ts` (viewport + castle) importent le dossier.
- Les ADR ANTÉRIEURS ne sont pas réécrits : ce sont des documents datés. Les chemins qu'ils citent
  se relisent à travers le tableau ci-dessus. Seuls les documents VIVANTS (`ARCHITECTURE.md`,
  `GDD.md`, `CLAUDE.md`, `.ai/`) ont été mis à jour.

## Alternatives écartées

- **Un `index.ts` (barrel) par nouveau dossier**, comme `components/index.ts` : écarté. Ce barrel-là
  a une raison d'être — il expose un REGISTRE de widgets dont les écrans consomment une dizaine
  d'entrées d'un coup. Les nouveaux dossiers sont des couches, pas des registres : leurs modules
  s'importent un par un et nommément. Un barrel y serait une indirection sans lecteur, et
  `export *` entre couches qui se référencent (skin → theme → …) invite les cycles d'import.
- **Découper par ÉCRAN** (`render/battle/`, `render/campement/`) : écarté — `theme.ts`,
  `viewport.ts` ou `sprites.ts` servent les deux, et le découpage par écran existe déjà un cran
  plus bas avec `game/` et `menu/`.
- **Laisser la racine plate et se contenter de renommer `render/terrain.ts`** : traite le symptôme
  le plus visible, pas les 30 fichiers.
