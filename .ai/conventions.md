# Conventions

## Code
- TypeScript strict + noUncheckedIndexedAccess : assumer les `!` uniquement après garde explicite ou invariant documenté.
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
- Commits : Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`).

## Definition of Done — à CHAQUE modification, dans le même livrable
1. **Code** qui build (`npm run build`) ;
2. **Tests** : tout nouveau comportement de `core/` ou `meta/` arrive avec ses tests ; les tests
   existants passent (`npm test`). Le rendu (`render/`) n'est pas testé unitairement — vérification visuelle.
3. **Docs à jour** :
   - gameplay/équilibrage → `docs/GDD.md` ;
   - choix structurant → nouvel ADR dans `docs/decisions/` + `docs/ARCHITECTURE.md` si la structure bouge ;
   - piège découvert → `.ai/pitfalls.md` ;
   - état du projet qui évolue (modes, monnaies, attentes) → `.ai/context.md`.

Un changement sans ses tests et sa doc n'est PAS terminé.
