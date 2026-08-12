# ADR-027 — Champ de bataille en 960×540 (16:9) et une carte propre par chapitre

**Statut** : accepté · **Date** : 2026-08-12

## Contexte

Le champ de bataille était en 800×600 (4:3) depuis le début du prototype. Les
chapitres 2-10 (contenu généré, en attente du lore — ADR-004) ne faisaient que
réutiliser deux `MapDef` partagés (`LAYOUT_RIFT` en alternance avec
`LAYOUT_PINCER`) : les biomes (ADR-023) donnaient à chaque chapitre son identité
visuelle, mais la topologie — le nombre et la forme des voies — restait la même
d'un chapitre sur deux. C'était une lacune connue (`.ai/context.md`, ⚠ RESTE :
« les 10 chapitres partagent toujours DEUX tracés — le décor les distingue, pas
la topologie »).

Cible visée : format mobile courant en paysage, et une vraie diversité
structurelle de niveaux avant une future passe de « vrais niveaux » liée au lore
(encore en attente côté PO).

## Décision

### 1. Canevas 960×540, 16:9

`BATTLEFIELD` (`core/types.ts`) passe de `{w:800,h:600}` à `{w:960,h:540}` —
exactement la moitié de 1920×1080, une résolution très répandue. Delta modeste
par rapport à l'ancien canevas (+20% en largeur, −10% en hauteur), pour limiter
la retouche des tailles écrites en dur (unités 46-62px, tours 84px, château
140px, GDD §Direction artistique).

`render/viewport.ts` (zoom « contain », framebuffer, zones sûres) était déjà
entièrement paramétrique sur `BATTLEFIELD` — aucun changement nécessaire là. Un
seul point dupliquait la taille en dur au lieu de s'y référer :
`render/components/modal.ts` centrait ses modales sur `(400,300)` et dimensionnait
son voile à `800×600` en littéraux ; corrigé pour dériver de `WORLD_W`/`WORLD_H`.

**Convention de bord** (inchangée dans son principe, redérivée pour le nouveau
canevas) : les chemins entrent hors champ à `x/y≈-20` et sortent côté château à
`x≈980`/`y≈560`.

### 2. Une topologie propre par chapitre, nombre de voies variable

`LAYOUT_RIFT`/`LAYOUT_PINCER` sont supprimés. Chaque chapitre 2-10 déclare
désormais sa propre `MapDef` (`CH2_MAP`…`CH10_MAP`, `content/index.ts`), avec
1 à 3 voies selon le chapitre (avant : toujours 2), en écho à son biome quand
c'est pertinent (ex. ch.6 « Col du Gel » : trois cols qui se resserrent en un
seul tronc).

`makeWaves(num, secondPath: boolean)` devient `makeWaves(num, pathCount:
number)` : le bloc qui plaçait des renforts sur `pathIndex: 1` en dur distribue
maintenant en tourniquet sur `1..pathCount-1`, pour que les chapitres à 3 voies
alternent entre leurs voies secondaires au lieu de toujours viser la même.
`makeChapter` prend directement la `MapDef` du chapitre en paramètre.

Chaque nouvelle carte respecte les trois garanties déjà testées et **prouvées
par mutation** (ADR-019/ADR-020, inchangées) :
- écart de tracé ≤ 23px (`render/path.test.ts`) ;
- couverture de slots ≥ ⌈2/3⌉ par voie, à portée d'archer niveau 1
  (`balance/datasheet.test.ts`) ;
- longueurs de voies à ±25% sauf voie `portal: true`
  (`balance/datasheet.test.ts`).

Pour les cartes à voies multiples, le patron retenu est le **tronc commun** :
les voies divergent à l'entrée (silhouette propre à chaque chapitre) puis
convergent avant le château. C'est le même principe que l'ancien
`LAYOUT_PINCER` (ADR-020) généralisé à 1-3 voies : un tronc partagé absorbe
mécaniquement l'écart de longueur entre voies, et les emplacements proches du
tronc couvrent plusieurs voies à la fois — ce qui rend les trois invariants
faciles à satisfaire même avec des entrées très écartées (ex. ch.9, trois
voies qui ne convergent que tard).

### Piège de rééquilibrage rencontré

Le ch.10 (Vouivre) a un invariant de méta testé (ADR-024) : infranchissable
sans la Forge, quelle que soit la stratégie, mais franchissable avec la méta
complète. La première géométrie du ch.10 (8 emplacements, tronc commun
généreusement couvert) le rendait gagnable en « spread » **sans** Forge — la
carte à elle seule avait fait glisser l'équilibrage. Réduire à 6 emplacements a
sur-corrigé (plus aucune stratégie ne gagnait, même avec la méta complète) ;
7 emplacements, moins concentrés sur le tronc, retrouve les deux garanties.
Conclusion générale : la géométrie d'une carte est un levier d'équilibrage à
part entière, pas seulement une contrainte géométrique — tout changement de
carte sur un chapitre à invariant de méta doit repasser `autoplay.test.ts`.

## Conséquences

- Chaque chapitre a désormais une identité structurelle propre, pas seulement
  visuelle (biome) — 1, 2 ou 3 voies selon le chapitre.
- La convention « tous les chemins finissent au château » est conservée : dans
  chaque `MapDef`, tous les `paths[].waypoints` se terminent sur le même point.
- Le nom des monstres/tours reste inchangé (placeholders, en attente du lore) —
  seule la géométrie des cartes a bougé.

## Alternatives écartées

- **Un générateur procédural de cartes.** Écarté : satisfaire simultanément les
  trois invariants géométriques ET produire une silhouette visuellement
  reconnaissable par chapitre est un problème de solveur de contraintes plus
  coûteux à construire et déboguer que neuf cartes dessinées à la main, pour un
  gain ponctuel (9 cartes, contenu encore provisoire en attente du lore).
- **Voies totalement indépendantes (sans tronc commun) pour plus de variété.**
  Tenté pour le ch.9 (trois voies larges) : au-delà d'un certain écartement
  vertical entre voies, aucune répartition d'emplacements ne peut couvrir
  chaque voie à ≥2/3 avec une portée de 130 — la contrainte de couverture
  rend le plein étalement injouable. Le tronc commun reste le patron par
  défaut ; les voies ne restent séparées que sur leur portion d'entrée.
