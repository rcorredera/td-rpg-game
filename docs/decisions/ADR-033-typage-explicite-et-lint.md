# ADR-033 — Typage explicite obligatoire + ESLint

## Contexte

Le projet est en TypeScript strict (`strict` + `noUncheckedIndexedAccess`), mais s'appuyait sur
l'inférence pour la quasi-totalité des déclarations locales (`const x = ...`) — conforme aux
recommandations habituelles de l'écosystème, mais jugé insuffisamment explicite par le PO : une
lecture du code doit pouvoir s'appuyer sur le type écrit, pas sur ce que le compilateur aurait pu
déduire.

Un audit du typage a par ailleurs relevé deux défauts concrets, indépendants de la question de
l'annotation :
- `GameScene.ts` indexait ses maps de HUD (`hudTexts`/`hudPlates`/`hudIcons`) par chaînes libres
  (`Record<string, ...>`), contrairement au reste du projet (`View`/`ShopTab`/`RowState`/`SkillId`
  dans `MenuScene.ts`/`profile.ts`, `TileKind` dans `sprites.ts`) — une clé mal orthographiée ne
  cassait rien à la compilation.
- Un cast `(s as { hit?: boolean })` contournait le système de types pour muter un champ non
  déclaré sur son type réel, au lieu de le déclarer sur l'interface (`ShotFx.hit?: boolean`).

## Décision

1. **ESLint** (`eslint.config.js`, flat config) avec `typescript-eslint`, ajouté en dev-dependency.
   `npm run lint`, pas encore câblé en CI (voir Conséquences).
2. **`@typescript-eslint/typedef`** avec `variableDeclaration: true`,
   `variableDeclarationIgnoreFunction: true` : toute `const`/`let` doit porter un type explicite,
   sauf valeur de fonction (son propre type porte déjà params/retour). C'est une règle dépréciée
   côté `typescript-eslint` (l'équipe recommande l'inférence) — activée ici sur demande explicite
   du projet, en connaissance de cause.
3. **Exceptions documentées, pas de contournement silencieux** : `as const` et `satisfies` gardent
   volontairement un type plus précis que ce qu'une annotation explicite pourrait exprimer
   (littéral plutôt que large) — les forcer à s'annoter reviendrait à les réélargir, régression
   pure. Chaque cas porte un `// eslint-disable-next-line @typescript-eslint/typedef -- ...` avec
   la raison, jamais un silence sans justification.
4. **`@typescript-eslint/no-explicit-any`**, **`no-unused-vars`**, **`consistent-type-assertions`**
   (`objectLiteralTypeAssertions: "never"` — interdit le pattern `as { champ?: T }` qui a motivé le
   correctif `ShotFx.hit`), **`prefer-const`**, **`no-var`**.

## Conséquences

- **~1600 déclarations retypées** dans tout `src/`, en plusieurs passes outillées (script Node
  utilisant l'API compilateur TypeScript pour lire le type inféré et l'écrire en clair), chacune
  vérifiée par `tsc --noEmit` + `npm test` avant la suivante :
  1. Primitifs (`number`/`string`/`boolean`) à partir du type inféré.
  2. Types déjà nommés (interfaces/classes/génériques) — la sérialisation `import("chemin").Type`
     du compilateur est résolue vers le nom court déjà importé (ou l'import est ajouté).
  3. Correction des cas où le type inféré d'une `const` est un LITTÉRAL étroit (`3` au lieu de
     `number`) plutôt que son type large — la première passe automatique produisait ce défaut,
     visible notamment sur des couleurs hex réaffichées en décimal illisible.
  4. Le reste (formes anonymes dupliquées, types de retour de petites fonctions) a été traité à la
     main, en **nommant l'interface plutôt qu'en recopiant la forme** — c'est ce qui a produit des
     types nouveaux dans `core/types.ts` (`SlowEffect`, `PendingSpawn`, `SkillTrack<T>`) et dans
     `render/` (`HudKey`, `FxEffect`, `ShotFx`, `SlotMenuEntry`, `CastleBarBox`, `RowColors`,
     `TabPosition<T>`, `MenuZone`, `LevelGridZone`, `SafeInsets`, `SheetPixels`,
     `ScrollBarGeometry`, `WaveUnit`).
- Les fermetures-méthodes de `GameScene.buildHud()` (`mkBtn`, `wirePress`, `place`, `plateKey`...)
  sont devenues des méthodes privées nommées (`mkHudButton`, `wireHudPress`, `placeHudButton`...)
  prenant un `HudBuildCtx` explicite plutôt que de capturer implicitement `cy`/`skin`/`btnH`/`iconS`
  depuis la fermeture englobante.
- Une fonction morte trouvée au passage (`distToSeg` dans `GameScene.ts`, jamais appelée) : supprimée.
- **CI non modifiée** : le lint n'est pas encore un gate obligatoire. À câbler dans
  `.github/workflows/ci.yml` une fois le style validé en pratique sur quelques PR.
- Règle pour la suite : tout nouveau `const`/`let` porte son type ; tout type de plus d'un usage
  ou correspondant à un concept du domaine se nomme au lieu de se recopier en ligne.
