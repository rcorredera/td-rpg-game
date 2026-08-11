# ADR-023 — Le décor d'un chapitre doit dire son nom

**Statut** : accepté · **Date** : 2026-08-11

## Contexte

Constat de playtest, formulé sans détour : « le visuel doit représenter le nom du
niveau, là y'a un niveau glacial mais c'est tout vert ».

« Le Col du Gel », « Les Carrières », « Les Tertres » s'affichaient tous sur la même
prairie verte. Le nom promettait un lieu, l'écran en montrait un seul. Un chapitre qui
ne se reconnaît pas d'un coup d'œil n'est pas un chapitre : c'est la même carte avec
d'autres vagues — et l'ADR-019 venait justement de corriger le fait que les dix
chapitres partageaient deux tracés.

`terrain.ts` codait la prairie en dur : couleur de fond, nuances, touffes et route,
toutes littérales dans la fonction de dessin.

## Décision

Un **biome par chapitre**, avec une répartition stricte des rôles :

- le **content nomme** un biome (`biome: "frost"`) et ne choisit aucune couleur ;
- **`render/biomes.ts` décide** à quoi ce biome ressemble.

Un futur skin peut ainsi tout redéfinir sans toucher au contenu (ADR-005), et le
content reste ce qu'il doit être : des données de jeu, pas des valeurs de rendu.

Dix biomes, un par chapitre : prairie, cendres, marécage, forêt, carrières, glace,
tertres, ruines, toundra, terre gâtée.

### Ce qu'un biome change

Pas seulement une teinte. Un biome porte **la forme de son motif de surface** —
`grass` (brins dressés), `rock` (éclats anguleux), `flake` (points épars), `reed`
(traits couchés). Recolorer des brins d'herbe en blanc donne une prairie pâle, pas de
la neige : c'est la forme qui dit la matière.

Il porte aussi **sa route**. Un sentier de terre battue traversant un col gelé trahit
immédiatement que le décor n'a pas été pensé pour le lieu.

La texture de sol est générée **par biome** (`terrain_frost`, `terrain_ash`…) et mise
en cache sous cette clé.

### Garanties

Cinq tests, dont deux qui portent sur le design plutôt que sur le code :

- chaque chapitre jouable déclare un biome **connu** ;
- **deux chapitres consécutifs n'ont jamais le même décor** — sinon on croit rejouer
  le même niveau ;
- chaque biome a un sol **et** une route distincts ;
- un biome inconnu retombe sur la prairie au lieu de faire un écran noir ;
- **tous les biomes restent désaturés** (saturation < 0,55). C'est la règle de palette
  du projet : plus une couleur est saturée, plus elle porte du sens. Un sol vif
  rendrait les créatures illisibles quel que soit leur propre coloris — et c'est
  exactement le défaut qui avait fait rejeter l'herbe fluo du pack d'origine.

## Conséquences

Vérifié à l'écran : « Le Col du Gel » est bleu-gris sous des flocons avec une route de
glace, « Le Roi-Charogne » est en terre gâtée rouge-brun, « La Forêt Murmurante » en
vert sombre dense. Les trois se distinguent au premier regard.

Le coût est une texture de sol par biome au lieu d'une seule — négligeable : elles sont
générées à la demande, seul le chapitre joué est en mémoire.

Ce que cet ADR **ne fait pas** : les dix chapitres partagent toujours deux tracés
(ADR-019). Le décor les distingue désormais, la topologie non. C'est le second volet du
chantier, et il reste entier.

## Alternatives écartées

- **Teinter la prairie par chapitre.** C'est ce que le projet avait déjà tenté ailleurs
  et qui a coûté cher : `setTint` multiplie, il assombrit sans jamais désaturer
  (`.ai/pitfalls.md`). Une prairie teintée en bleu reste une prairie bleue, pas de la
  glace — le motif la trahit.
- **Mettre les couleurs dans le content.** Plus direct, mais ça fait entrer des valeurs
  de rendu dans les données de jeu et interdit à un skin de les revoir globalement.
- **Des images de fond dessinées à la main, une par chapitre.** Dix illustrations à
  produire et à maintenir, contre dix entrées de palette — et le sol doit rester
  pavable puisque l'écran déborde du champ de bataille (ADR-010).
