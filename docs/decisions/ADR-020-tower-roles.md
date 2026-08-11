# ADR-020 — Faire du choix de tour une décision

**Statut** : accepté · **Date** : 2026-08-11

## Contexte

Le GDD annonce un « triangle de rôles » entre les trois tours. Le banc d'essai
(ADR-018) a montré qu'il n'existait que dans l'intention :

| Composition | Victoires | PV château cumulés |
|---|---|---|
| Archerie seule | **9/10** | 152 |
| Catapulte seule | 0/10 | 0 |
| Tour de givre seule | 0/10 | 0 |
| Les trois | **5/10** | 82 |

Spammer des archeries battait le mélange des trois tours. Rendement : archerie
0,20 dégâts par pièce d'or **et** seule à toucher le ciel ; catapulte 0,08, sol
uniquement ; givre 0,045. Choisir sa tour n'était pas une décision, c'était un piège.

Ce point bloquait le chantier de contenu. La demande initiale était d'ajouter des
types d'ennemis pour créer de la stratégie — essaims pour les tours à zone, volants,
gros sacs de points de vie. Mais **un ennemi « anti-X » ne crée de la stratégie que
si la tour censée le contrer vaut la peine d'être construite.** Un essaim n'aurait
rien changé : le joueur aurait posé des archeries et gagné quand même. Les nouveaux
types auraient ajouté de la difficulté, pas de la décision.

## Décision

Réparer les rôles avant d'ajouter des ennemis. Chaque tour devient la meilleure
dans son domaine et franchement mauvaise ailleurs.

- **Archerie — le socle polyvalent.** Elle touche tout, donc elle paie sa
  polyvalence : son rendement baisse (dégâts 12/20/32 → 11/18/28, cadence
  1,4/1,6/1,8 → 1,4/1,5/1,7). Elle reste la réponse aux cibles isolées et au ciel.
- **Catapulte — la reine des groupes.** Rayon d'effet 55 → **85**, dégâts en hausse,
  coûts en baisse (110/140/190 → 100/120/160). À 55, son rayon ne couvrait même pas
  l'espacement entre deux ennemis : elle payait un prix de tour à zone pour n'en
  toucher qu'un.
- **Tour de givre — le multiplicateur.** Son ralentissement s'applique désormais en
  **zone** (rayon 70) et mord plus fort (0,55 → 0,45 sur 2,2 s). Freiner *un* ennemi
  d'une vague de cinquante ne changeait aucune issue.

### Le levier décisif n'était pas dans les tours

Renforcer la catapulte et le givre ne suffisait pas : l'écart entre le mélange et
l'archerie seule restait à +1 victoire, quel que soit le réglage. Un balayage a
identifié la vraie cause — **l'espacement des vagues** :

| Espacement des spawns | Archerie seule | Mélange | Écart |
|---|---|---|---|
| ×1,00 (avant) | 7/10 | 8/10 | +1 |
| **×0,70** | **4/10** | **8/10** | **+4** |
| ×0,50 | 1/10 | 7/10 | +6 |

À effectif égal, une vague plus **serrée** pèse infiniment plus lourd sur une défense
mono-cible. Avec des ennemis espacés de 75 px, chaque tour tire sur une cible à la
fois et le mono-cible suffit toujours. C'est le resserrement, pas le nombre, qui
donne son rôle à l'AoE. Les intervalles passent donc à ×0,7 — sauf les quatre
premières vagues du chapitre 1, seule école du joueur et seul moment où il n'a pas
encore la Tour de givre.

### Deux corrections qu'imposait la précédente

- **Mini-boss allégés** (jusqu'à ×12 → ×7 de points de vie). Un boss est une cible
  *isolée* : les tours à zone n'y peuvent rien. Ces multiplicateurs n'étaient
  soutenables que par une archerie dominante — celle-là même qu'on venait de retirer.
  Mesuré : toutes les défaites tombaient à 9 vagues sur 10, sur le boss final.
- **8 emplacements au lieu de 6** sur les cartes des chapitres 2-10. La difficulté
  monte de chapitre en chapitre, la défense était plafonnée partout à 6 : l'or
  s'accumulait sans emploi (1 800 à 3 800 pièces mesurées) et il n'y avait plus de
  décision économique passé la mi-partie. Le chapitre 1 en garde 6, pour l'apprentissage.

## Conséquences

| Composition | Victoires | PV château | Étoiles |
|---|---|---|---|
| **Les trois** | **10/10** | **170** | **19** |
| Archerie seule | 7/10 | 68 | 10 |
| Tour de givre seule | 1/10 | 5 | 1 |
| Catapulte seule | 0/10 | 0 | 0 |

Diversifier protège deux fois et demie mieux le château. Sur les trois politiques du
banc, 25 victoires sur 30 runs, et aucune ne domine (étalement 9/10, mixte 9/10,
concentration 7/10) : couvrir reste nécessaire, concentrer reste puni.

**Le chantier de contenu est débloqué** : un essaim favorise maintenant réellement les
tours à zone, un volant impose réellement l'anti-aérien.

### Garantie

Deux tests vérifient que le mélange gagne plus souvent **et** protège mieux que
chaque tour seule, et qu'aucune tour ne suffit à finir le jeu. **Prouvé par
mutation** : rendre à l'archerie son ancien rendement les fait échouer en la nommant.

Limite assumée : la mutation du seul rayon de la catapulte (85 → 55) ne les fait
*pas* échouer. C'est cohérent avec la mesure — le rayon n'est pas le facteur
décisif, le rendement relatif et la densité le sont. La garantie porte sur le
résultat de design, pas sur chaque valeur prise isolément.

## Alternatives écartées

- **Ajouter les types d'ennemis d'abord.** C'était la demande initiale. Sans rôles
  différenciés, ils n'auraient produit que de la difficulté.
- **Renforcer catapulte et givre sans toucher à l'archerie.** Testé : l'écart plafonne
  à +1. Tant qu'une tour est la meilleure partout, en renforcer d'autres ne fait que
  déplacer le curseur de difficulté.
- **Une quatrième tour** (l'idée d'une tour « psychique » contre des fantômes). Un
  quatrième rôle sur une base où trois ne fonctionnaient pas aurait aggravé le
  déséquilibre. À reconsidérer maintenant que le socle tient.
