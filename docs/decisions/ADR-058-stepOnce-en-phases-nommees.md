# ADR-058 — `stepOnce` découpé en phases nommées

## Statut
Accepté (2026-08-20).

## Contexte

`stepOnce` — le pas de simulation, appelé 60 fois par seconde et responsable de tout ce qui se
passe dans une partie — faisait **182 lignes** d'un seul bloc. Six phases s'y succédaient, repérées
par des commentaires numérotés (`// 1. Spawns`, `// 2. Héros`, …) et rien d'autre.

Trois conséquences concrètes :

- **L'ordre des phases, qui est une décision de gameplay, n'était pas visible.** Que les tours
  tirent APRÈS le déplacement des ennemis n'est pas un détail : tirer avant ferait viser la
  position du tick précédent. Cette décision se lisait en repérant deux commentaires distants de
  70 lignes.
- **Le couplage entre phases passait par des variables locales partagées.** `blockedUid`, calculé
  phase 3 et consommé phase 4, était une `let` déclarée au milieu de la fonction : rien ne disait
  qu'elle traversait une frontière.
- **La sortie anticipée était invisible.** Un `return` nu au fond de la boucle de déplacement
  (phase 4) interrompt le tick entier quand un boss atteint le château — donc les tours ne tirent
  pas et la fin de vague n'est pas évaluée. Ce comportement est voulu (ADR-024) et se déduisait de
  la position exacte d'un `return` dans 182 lignes.

## Décision

Six fonctions nommées, une par phase, et `stepOnce` réduit à leur enchaînement :

```ts
function stepOnce(...): void {
  spawnDueEnemies(s, c, ch);
  stepHero(s, c, dt);
  const blockedUid: number | null = resolveMelee(s, c, dt, events);
  if (!advanceEnemies(s, c, ch, dt, lengthsByPath, blockedUid, events)) return;
  fireTowers(s, c, ch, dt, events);
  resolveEndOfWave(s, ch, events);
}
```

**Le couplage devient explicite par les signatures**, pas par des variables partagées :
`resolveMelee` REND l'`uid` de l'ennemi bloqué, `advanceEnemies` le REÇOIT ; `advanceEnemies` rend
`false` quand le run est perdu, et le `if (!…) return` dit à sa place ce qu'un `return` enfoui
disait mal.

`applyFrostAura` est extraite en plus : dans la boucle des tours, l'aura de givre n'est pas une
variante du tir mais une mécanique DISTINCTE — ni cadence, ni cible, ni projectile — et elle
occupait 23 des 77 lignes de la phase de tir.

Aucune fonction ne dépasse désormais 59 lignes (`fireTowers`), contre 182.

## Conséquences

- **Comportement rigoureusement inchangé, prouvé et non supposé.** Une trace déterministe a été
  capturée avant et après : le joueur artificiel sur les 20 chapitres × 3 politiques × 3 niveaux de
  forge, PLUS le flux d'événements tick par tick de chaque chapitre (2 544 lignes, 2 230 événements
  de combat). Les deux traces sont identiques au hash près.
- **Le harnais a lui-même été validé par mutation** : en inversant simplement `fireTowers` et
  `advanceEnemies` dans `stepOnce`, 4 733 lignes de trace divergent. Une trace qui ne bouge pas
  quand on casse le code ne prouve rien — c'est la leçon retenue de la campagne d'intégrité du
  content.
- Le harnais était temporaire et n'est pas versionné : il dépend de `node:fs` et de `process`, que
  le projet n'expose pas au typecheck (`balance/cli.ts` documente pourquoi). Le filet permanent
  reste le test de déterminisme et les tests miroirs du banc d'essai.

## Alternatives écartées

- **Laisser les commentaires numérotés** : ils décrivaient déjà correctement les phases. Mais un
  commentaire ne contraint rien — il n'empêche ni de lire une variable d'une autre phase, ni de
  déplacer trois lignes d'une section à l'autre.
- **Une classe `Simulation` avec les phases en méthodes et l'état en champs** : écarté —
  `.ai/conventions.md` interdit les classes dans `core/` (l'état doit rester sérialisable pour une
  future sauvegarde de run), et transformer `blockedUid` en champ d'instance rendrait le couplage
  MOINS visible, pas plus.
- **Découper aussi `fireTowers`** (sélection des cibles / application des dégâts) : écarté pour
  l'instant. Les 59 lignes restantes forment un enchaînement unique — trouver les cibles, calculer
  la cadence, appliquer — dont chaque étape dépend des locales de la précédente. Les séparer
  demanderait de faire transiter cinq valeurs sans gagner en lisibilité.
