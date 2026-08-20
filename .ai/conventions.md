# Conventions

## Code
- TypeScript strict + noUncheckedIndexedAccess : assumer les `!` uniquement après garde explicite ou
  invariant documenté. **Trier par PROVENANCE de l'index** (ADR-059), jamais compter les `!` :
  index borné par une boucle → l'assertion est légitime, la remplacer produirait du code mort ;
  index venu du CONTENT → l'invariant se garde au build (`content/integrity.test.ts`) ;
  index venu d'une donnée EXTERNE (profil `localStorage`, entrée réseau) → **se borne au point
  d'entrée**, jamais à chaque site d'usage. Et on BORNE, on ne réinitialise pas : écraser à la
  valeur par défaut efface une progression que le joueur a payée.
- **Typage explicite obligatoire** (ADR-033, `npm run lint`) : toute `const`/`let` porte son type
  écrit, pas seulement inféré (`@typescript-eslint/typedef`). Exceptions : valeur de fonction (son
  propre type porte déjà params/retour), et `as const`/`satisfies` (gardent un type plus précis
  qu'une annotation ne pourrait exprimer — les annoter les réélargirait). Toute exception passe par
  un `// eslint-disable-next-line @typescript-eslint/typedef -- <raison>`, jamais un silence non justifié.
- **Nommer plutôt que recopier une forme** : dès qu'un type anonyme (`{ x: number; y: number }`…)
  sert plus d'une fois ou correspond à un concept du domaine, il devient une interface nommée
  (voir `Vec2`, `SlowEffect`, `PendingSpawn` dans `core/types.ts`) — jamais une deuxième copie de
  la même forme sous un autre nom.
- Nommage : état = `XxxState`, définitions de contenu = `XxxDef`, services méta = `XxxService`.
- Pas de classe dans `core/` : fonctions pures opérant sur l'état (sérialisable → save de run possible plus tard).
- **Un refactor doit PROUVER sa neutralité, pas l'affirmer** (ADR-057/058) : déplacer de la donnée
  ou découper de la logique se valide en comparant un AVANT et un APRÈS, pas en relisant le diff.
  Pour des données, `JSON.stringify` de l'objet assemblé (l'ordre des clés compte) ; pour de la
  logique, une trace d'exécution déterministe. Et la comparaison elle-même se valide par mutation :
  si casser volontairement le code ne la fait pas échouer, elle ne prouvait rien.
- Commits : Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`).

## Definition of Done — à CHAQUE modification, dans le même livrable
1. **Code** qui build (`npm run build`) ;
2. **Tests** : tout nouveau comportement de `core/` ou `meta/` arrive avec ses tests ; les tests
   existants passent (`npm test`). **`render/` est testé lui aussi** — pas la peinture Phaser, mais
   tout CŒUR PUR qu'on en extrait : géométrie (`world/`, `skin/`), registres (`assets/sprites.ts`,
   `theme/icons.ts`, `platform/audio.ts`), calculs de mise en page (`components/hubLayout.ts`,
   `components/tileContent.ts`), et les tests de SOURCE qui gardent une forme interdite
   (`layoutLiterals.test.ts`, `skin/skinSwap.test.ts`). Règle : dès qu'un rendu se vérifie « à l'œil
   sur une capture », c'est qu'il manque un cœur pur à extraire et à tester (ADR-025/029/030/032).
   Seul le dessin proprement dit (`render/game/`, `render/menu/`, les scènes) reste en vérification
   visuelle.
3. **Docs à jour** :
   - gameplay/équilibrage → `docs/GDD.md` ;
   - choix structurant → nouvel ADR dans `docs/decisions/` + `docs/ARCHITECTURE.md` si la structure bouge ;
   - piège découvert → `.ai/pitfalls.md` ;
   - état du projet qui évolue (modes, monnaies, attentes) → `.ai/context.md`.

Un changement sans ses tests et sa doc n'est PAS terminé.
