# ADR-056 — `npm run lint` remis au vert et câblé en CI

## Statut
Accepté (2026-08-20).

## Contexte

L'ADR-033 a rendu le typage explicite obligatoire et fourni `npm run lint` pour le vérifier, mais
en concluant : « Pas encore câblé en CI ». Constaté aujourd'hui : **le lint était rouge sur `main`**
— 8 erreurs `@typescript-eslint/typedef` et une directive `eslint-disable` devenue inutile. Aucune
n'était récente ; personne ne les avait vues parce que rien ne les regardait.

C'est le mode de défaillance ordinaire d'une règle non automatisée : elle ne se dégrade pas d'un
coup, elle s'effrite. Une règle que seul un humain discipliné applique finit par n'être appliquée
que là où quelqu'un a regardé.

## Décision

**Les 9 signalements sont corrigés à leur cause, pas éteints par des `eslint-disable`.** Deux
familles, deux traitements différents :

- **`fitSquare` rendait un type anonyme `{ w: number; h: number }`** utilisé à cinq endroits (le
  rendu des entités et quatre assertions de test). `.ai/conventions.md` dit qu'un type anonyme
  servant plus d'une fois devient une interface nommée : c'est désormais **`SpriteFit`**, exportée
  par `render/assets/sprites.ts`. Les quatre `const` fautives portent ce nom, et le typage cesse
  d'être recopié à chaque appel.
- **`colorRemap.test.ts` déclarait ses fixtures en `as const`** (`DARK`, `LIGHT`, `range`) pour
  obtenir des tuples en lecture seule. Les types visés existaient déjà : `Rgb` et
  `readonly [number, number]`. Les annoter est plus explicite que `as const` ET satisfait la règle
  — l'exception « `as const` » d'ADR-033 n'avait donc pas lieu de s'appliquer ici. `const T` reçoit
  son `Rgba`.
- La directive `eslint-disable-next-line no-var` de `platform/buildInfo.ts` ne supprimait plus
  aucune erreur (la déclaration ambiante ne déclenche plus `no-var`) : retirée.

**`npm run lint` entre dans le job `build` de la CI**, avant `npm test`. Placé en premier parce
qu'il échoue en quelques secondes là où la suite met une minute : un retour d'erreur de typage
n'a pas à attendre les tests.

## Conséquences

- La contrainte d'ADR-033 devient exécutoire. Toute PR qui l'enfreint est rouge avant relecture.
- `docs/ARCHITECTURE.md` : la mention « Pas encore câblé en CI » disparaît.
- Aucune règle ESLint n'a été assouplie pour arriver au vert. C'était l'écueil à éviter : mettre
  une règle en CI en la relâchant d'abord revient à graver l'érosion qu'on prétendait arrêter.

## Alternatives écartées

- **`eslint-disable` sur les 8 erreurs, puis câblage en CI** : le résultat aurait été vert sans que
  rien ne s'améliore, et aurait donné l'exemple à suivre pour les suivantes.
- **Relâcher `typedef`** (par exemple `variableDeclarationIgnoreFunction` étendu aux appels) :
  écarté — la règle est explicitement demandée par le projet (ADR-033), et les 8 cas se corrigeaient
  en nommant un type, ce que les conventions réclamaient déjà par ailleurs.
- **Un job CI séparé pour le lint** : écarté pour l'instant — un seul job garde la lecture des
  vérifications simple, et le lint est trop rapide pour justifier sa propre machine.
