# Conventions

## Code
- TypeScript strict + noUncheckedIndexedAccess : assumer les `!` uniquement après garde explicite ou invariant documenté.
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
