# ADR-007 — Registre de composants UI (`render/components/`)

## Statut
Accepté (2026-08-10)

## Contexte
Le chrome d'UI (`render/ui.ts`) n'exposait que 2 primitives réutilisables (`uiPanel`, `uiButton`).
Tout le reste — cartes, rangées de liste, onglets, modales — était reconstruit à la main, par écran,
dans `MenuScene.ts` et `GameScene.ts` (helpers privés type `box()`/`row()`/`backButton()`, blocs
inline dupliqués). Les couleurs suivaient le même sort : `theme.ts` centralisait déjà les teintes du
monde de jeu (`C`, `STATUS`, `UI_TINT`), mais `MenuScene.ts` définissait ses propres constantes de
texte et des littéraux hex en dur, sans lien avec `theme.ts`. Résultat : UI incohérente entre écrans,
coûteuse à faire évoluer, et un point de départ jugé "pas moderne" par le product owner — d'où la
décision de reconstruire le menu sur un socle de composants avant de retoucher son visuel.

## Décision
1. **`render/components/` est le seul registre de widgets UI.** Chaque composant (`uiPanel`,
   `uiFramedPanel`, `uiButton`, `uiModal`, `uiTabBar`, `uiListRow`, `uiNavCard`, `uiSectionHeader`,
   `uiChip`) est une fonction pure côté API : primitives Phaser en entrée/sortie, jamais de type
   `meta`/`content`/`core` (extension du principe de séparation de l'ADR-001). Seules les scènes
   traduisent les données métier (`ProfileService`, `CONTENT`, …) en `opts` de composant.
2. **`theme.ts` reste la source unique de couleurs**, étendu avec `TEXT` (couleurs de texte CSS) et
   `ACCENT` (teintes de bordure en nombre), qui absorbent les constantes locales dupliquées de
   `MenuScene`/`GameScene`. `render/ui.ts` redevient un fichier de "chrome" pur : DPR, polices,
   curseurs, caméra logique, préchargement — plus aucun composant n'y vit.
3. **Logique pure séparée du rendu Phaser** dans les fichiers de composant qui le permettent :
   `layoutTabs()` (centrage des onglets, `tabBar.ts`) et `rowColors()` (état → teintes, `listRow.ts`)
   sont exportées et testées en Vitest sans instancier de scène Phaser.
4. **`render/ui.ts` doit rester important sans navigateur** : `DPR`/`CURSOR_DEFAULT`/`CURSOR_POINT`
   sont calculés derrière des gardes `typeof window/document !== "undefined"`. Nécessaire car les
   composants importent `ui.ts` pour `FONT_DISPLAY`/`CURSOR_POINT`, et les tests purs (§3) importent
   transitivement ces composants — sans garde, Vitest (Node, sans DOM) plantait à l'import.

## Conséquences
- Migration du menu écran par écran (PR2-4) sans changement de données/gameplay : seule la
  construction visuelle change, les callbacks vers `ProfileService`/`sim` restent identiques.
- `GameScene.ts` n'est **pas** migré dans cette passe, mais `uiModal` (via `depth`/`build`) et le
  câblage hover/press de `uiButton` sont conçus pour couvrir plus tard `openQuitConfirm()` et
  `endRun()` sans réécriture du composant lui-même.
- Comme documenté dans `.ai/conventions.md`, `render/` reste hors du périmètre de test unitaire
  (vérification visuelle) — seule la logique pure extraite des composants (§3) et les tokens de
  `theme.ts` (garde-fou de format, `theme.test.ts`) sont couverts par Vitest.
- Un reskin de palette futur = éditer `theme.ts` uniquement ; un changement de layout de composant =
  éditer un seul fichier sous `render/components/`, jamais les scènes qui l'utilisent.
