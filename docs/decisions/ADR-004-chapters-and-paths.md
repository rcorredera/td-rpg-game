# ADR-004 — Chapitres comme contenu, cartes multi-chemins

## Statut
Accepté (2026-06-10)

## Contexte
Le mode Histoire doit grandir vers ~10 chapitres (le 10e : boss multi-phases), avec des
cartes pouvant avoir **plusieurs sources d'arrivée** et des **portails de Faille**
temporaires (annoncés une vague à l'avance, actifs une vague). Les Failles infinies
sont un mode séparé, pas un chapitre.

## Décision
1. `ContentPack.map`/`waves` disparaissent au profit de `chapters: ChapterDef[]`.
   Un chapitre est `playable: true` (avec `map` + `waves`) ou `playable: false`
   (déclaré, affiché « Bientôt »). Ajouter un chapitre = pur ajout de content (ADR-003).
2. `MapDef.paths: PathDef[]` remplace le chemin unique. Chaque `WaveSpawn` porte un
   `pathIndex` (défaut 0). Convention : **tous les chemins finissent au château**
   (fin du chemin 0 = position du château).
3. `PathDef.portal: true` marque un chemin de Faille : le rendu ne l'affiche que
   lorsqu'il est actif ou annoncé pour la vague suivante. La sim ne fait aucune
   distinction — un portail est un chemin comme un autre, la temporalité est
   entièrement pilotée par les vagues qui l'utilisent.
4. La progression (`profile.chaptersWon`) et l'archivage (`BestRun.chapter`)
   référencent les chapitres par index.

## Conséquences
- Le boss multi-phases (ch.10) nécessitera une extension sim dédiée (phases,
  respawn renforcé) — hors de cet ADR, voir GDD §Boss final.
- Les cartes restent en coordonnées logiques 800×600 ; des cartes plus grandes
  (scroll/zoom) sont une décision ouverte au GDD.
- Le lore (noms, textes de chapitres) vit dans le content et sera alimenté par
  `docs/LORE.md` (fichier de contexte fourni par le product owner).
