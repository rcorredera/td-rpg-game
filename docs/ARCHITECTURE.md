# Architecture — Bastion

> Document vivant. Tout choix structurant passe par un ADR dans `docs/decisions/`.

## Vue d'ensemble

```
src/
  core/      Simulation pure, déterministe. ZÉRO dépendance Phaser/DOM. Testée en Vitest.
  content/   Données d'équilibrage ET de structure (tours, ennemis, CHAPITRES — carte+vagues+lore
             par chapitre, ADR-004 —, unlocks, forge, économie). Aucune stat ailleurs.
  meta/      Profil de compte (monnaies, unlocks, forge, sorts, bestiaire, chapitres conquis,
             meilleurs runs), persistence (SaveAdapter). Testée en Vitest.
  render/    Scènes Phaser. Lit l'état du core, ne le mute jamais : passe par les commandes de sim.ts.
  balance/   Banc d'essai d'équilibrage headless (ADR-018) : fiches analytiques, joueur
             artificiel, santé de la méta. `npm run balance`. Ne fait PAS partie du jeu —
             aucun module de core/render ne l'importe, et il n'entre pas dans le bundle.
public/assets/  Packs Kenney CC0 (TD + UI) — voir README.md du dossier. Re-skin sprites à venir.
```

## Frontière core / render (ADR-001)

`core/sim.ts` expose : `createRun(content, profile, chapterIndex)`, `tick(state, content, dt)`, et des **commandes** (`buildTower`, `upgradeTower`, `sellTower`, `moveHero`, `castWhirlwind`, `castRally`, `castAccountSpell`, `startNextWave`). Le tick consomme un pas de temps fixe (1/60s) via un accumulateur (`timeAcc` — indispensable aux écrans 120Hz, voir pitfalls) ; la vitesse x2 multiplie le nombre de pas, pas le dt → simulation identique quelle que soit la vitesse (testé : test de déterminisme). Les cartes ont plusieurs chemins (`MapDef.paths`, dont des portails) ; chaque spawn/ennemi porte son `pathIndex` (ADR-004). La sim émet des `SimEvent` (tirs, morts, explosions) que le rendu consomme pour les fx ; elle ne sait pas qu'un rendu existe.

Conséquences : testable sans navigateur, et si un jour il faut un serveur autoritaire (leaderboards de Failles), la sim tourne côté serveur telle quelle.

## Persistence (ADR-002)

Le profil passe par l'interface `SaveAdapter` (`meta/save.ts`). Implémentation v0 : localStorage avec validation/fallback sur profil neuf si corruption. Un swap vers cloud save ne touche que ce fichier.

## Content as data (ADR-003)

Toutes les valeurs d'équilibrage vivent dans `src/content/index.ts`, typées par `ContentPack`. Règle absolue : aucune stat en dur dans `core/` ou `render/`. Rééquilibrer = modifier le content, sans toucher à la logique.

Le barème de fin de run (`rewards`) y a rejoint le reste à l'ADR-018 : il était en dur dans `computeResult`, ce qui l'a laissé dériver pendant deux passes d'équilibrage sans que personne ne le voie. Leçon générale : une valeur d'équilibrage hors du content n'est pas seulement une entorse à la règle, c'est une valeur que plus personne ne rééquilibre.

## Banc d'essai d'équilibrage (ADR-018)

`src/balance/` exécute la simulation sans navigateur : `npm run balance`. Possible uniquement parce que `core/` est pur et déterministe (ADR-001) — c'est le bénéfice concret de cette contrainte.

`datasheet.ts` et `economy.ts` dupliquent nécessairement des formules de `sim.ts` pour les projeter sans jouer. Cette duplication n'est tenable que grâce aux **tests miroirs**, qui confrontent chaque formule à la simulation elle-même plutôt qu'à une valeur écrite à la main. Un banc d'essai qui diverge de la sim ne casse rien : il conseille des ajustements sur des chiffres faux. Toute formule ajoutée ici doit venir avec son test miroir.

## UI chrome / composants (ADR-007)

`render/components/` : registre unique de widgets (panneau, bouton, modale, onglets, rangée de
liste, carte de navigation, en-tête de section, chip) — API purement Phaser/données brutes, jamais
de type `meta`/`content`/`core`. `layoutCursor` (`components/layout.ts`) empile verticalement une
liste d'éléments de hauteurs variables sans recalcul manuel d'offset par écran — à utiliser dès
qu'un écran empile des rangées/cartes sous un en-tête ou des onglets (évite la classe de bug
« chevauchement onglets/premier élément »). `render/theme.ts` reste la source unique de couleurs
(`TEXT` couleurs de texte, `ACCENT` teintes de bordure, en plus des tokens existants). `render/ui.ts`
ne porte plus que le chrome (échelle de rendu, polices, curseurs, caméra, préchargement).

`render/components/hubLayout.ts` (ADR-025) : la DISPOSITION du Campement est calculée à part du rendu, donc testable sans Phaser — deux rangs de tuiles, bascule en deux colonnes selon la largeur réelle. Le hub occupait 44 % de la largeur en paysage mobile et donnait le même poids visuel à ses cinq entrées ; les tests portent sur ces deux défauts (occupation ≥ 90 %, tuile principale plus grande) et non sur des valeurs de pixels. Règle générale : quand une mise en page a une règle métier, extraire le calcul dans un module pur et laisser au composant le seul dessin.

`render/nineSlicePlan.ts` + `render/nineSliceFlatten.ts` (ADR-029) : toute la géométrie de l'habillage d'UI, PURE et testée par propriétés. Le premier décide où découper une planche 3×3 du pack pour en faire un nine-slice contigu ; le second garantit qu'une pièce ÉTIRÉE est constante le long de son axe d'étirement — sans quoi le grain de la planche devient une traînée large de tout le panneau. `render/uiSkin.ts` ne fait plus que mesurer la planche et peindre le plan. Règle générale : dès qu'un traitement d'image ou de découpe se vérifie « à l'œil sur une capture », c'est qu'il manque un cœur pur.

`render/components/scrollList.ts` + `render/components/levelGrid.ts` (ADR-032) : les deux ont désormais leur cœur pur — `scrollBar`/`scrollHints` d'un côté, `levelCellLayout`/`levelCellMinH` de l'autre. Le premier garantit que l'indicateur de défilement reste À L'INTÉRIEUR de sa fenêtre (il se dessinait dehors, donc le jeu ne signalait aucun défilement) ; le second place numéro, nom et étoiles d'UN seul calcul (deux règles concurrentes les faisaient se recouvrir). Règle générale : dès qu'une boîte contient plusieurs éléments placés indépendamment, c'est un module pur qui doit les placer tous.

`render/skinSwap.test.ts` (ADR-032) : interdit `setTexture` hors de `uiSkin.ts` — Phaser garde les marges de découpe de l'ancienne texture, et les planches enfoncées du pack n'ont pas la même géométrie que celles au repos. Le point d'entrée est `uiSkinSetTexture`. Test de SOURCE parce que le défaut n'apparaît qu'au toucher : aucune capture au repos ne le montre.

`render/components/button.ts` — `skinPressVisual` (ADR-035) : point d'entrée unique de l'état « enfoncé » d'un bouton habillé (texture + décalage du libellé), partagé par `uiButton` et par la barre d'actions du HUD (`render/game/hud.ts`). Avant lui, les deux avaient chacun leur propre logique de « push » — l'une composait un scale-squish par-dessus la planche déjà dessinée plus plate, l'autre non — d'où deux boutons habillés par le même pack qui ne « poussaient » pas pareil sur le même écran. Règle générale : un état visuel partagé par plusieurs composants (repos/survol/appui…) se pose dans UNE fonction que tous appellent, jamais dans des implémentations parallèles « synchronisées à la main ».

`render/castle.ts` (ADR-030) : ancrage du Bastion et de sa jauge de PV, PUR et testé. Cette géométrie était écrite trois fois — sprite, jauge, et copie en commentaire dans `balance/datasheet.test.ts` — et deux copies avaient divergé de 26 unités. Règle générale : une géométrie partagée entre le rendu et un test se met dans un module pur que les DEUX importent ; un test qui recopie la règle qu'il vérifie ne vérifie rien.

`render/components/ribbon.ts` (ADR-031) : ruban de titre du pack, bande à trois tranches. Sa largeur se dimensionne sur une marge SÛRE mesurée sur la planche (là où le corps plat commence), distincte de la marge de découpe ; sa hauteur se réduit proportionnellement, jamais par étirement.

`render/components/tileContent.ts` (ADR-029) : composition VERTICALE du contenu d'une tuile (icône, titre, sous-titre, jauge), pure et testée. Le contenu remplit la boîte qu'on lui donne, l'icône absorbant la place restante jusqu'à `ICON_RASTER_PX`. Même famille que `hubLayout` : la mise en page a une règle métier, donc elle sort du composant.

`render/icons.ts` (ADR-012) : registre des icônes d'UI — les écrans nomment un **rôle**
(`story`, `bestiary`…), jamais un fichier ni un emoji. SVG monochromes maison, teintés au rendu, ce
qui permet de faire porter un état par la couleur (verrouillé, Faille, base en péril). Aucun emoji
dans l'UI : leur rendu dépend de l'OS et leurs couleurs cassent la palette. `EMBLEM` est le registre
frère pour les rasters du pack : un rôle aussi, mais jamais teinté — l'armurerie porte le bouclier
`icon-06.png` (`ts_shield`) et les Chroniques les épées croisées `icon-05.png` (`ts_swords`), tous
deux issus de la réserve d'icônes-ressources, plutôt que les silhouettes maison d'origine.

## Scènes (ADR-034)

`render/GameScene.ts` et `render/MenuScene.ts` ne portent plus que le lifecycle Phaser, l'input, et
l'orchestration de leur boucle update/draw — leur contenu vit dans des modules dédiés, chacun
recevant la scène en paramètre explicite (`scene: Phaser.Scene`) plutôt que de capturer `this`,
comme le fait déjà `render/components/` (ADR-007).

`render/menu/` : un fichier par écran du Campement (`homeView.ts`, `storyView.ts`, `riftsView.ts`,
`shopView.ts`, `bestiaryView.ts`, `chroniclesView.ts`), chacun une fonction `buildXxx(ctx: MenuCtx)`
— `MenuCtx` (`menu/types.ts`) porte la scène, le panel courant et les points d'entrée vers l'état de
`MenuScene` (`navigate`, `refreshCurrencies`). Les constructions partagées (panneau, en-tête,
onglets, liste défilante, fiche de lore, rangée) vivent dans `menu/helpers.ts`.

`render/game/` : `terrain.ts` (décor statique, jauge du Bastion, chemins de Faille), `hud.ts`
(barre d'actions du run), `modals.ts` (confirmation de sortie, écran de fin de run), `slotMenu.ts`
(menu contextuel construire/améliorer/vendre), `entities.ts` (placement et overlay des tours,
ennemis, héros), `fx.ts` (effets transitoires et projectiles en vol).

## Mobile / viewport (ADR-010)

Cible **paysage**. `render/viewport.ts` est la source unique de vérité sur l'écran :
`computeViewport()` (pure, testée) renvoie la taille du framebuffer, le zoom caméra, le rectangle
visible en unités logiques et les bords amputés des encoches (`env(safe-area-inset-*)`).

Le framebuffer couvre la fenêtre **entière** à la densité réelle (`Scale.NONE`, piloté par
`attachViewport()`), et la zone de jeu 800×600 reste toujours entièrement visible : le surplus
d'écran est un **débord** que le fond habille et auquel le HUD s'ancre. Les coordonnées restent
logiques (800×600) — `core/` ignore l'écran.

**Cibles tactiles (ADR-011)** : le plancher d'ergonomie est exprimé en pixels RÉELS
(`TOUCH_MIN_CSS = 44`) et traduit en unités logiques par le viewport (`touchMin`, ~26 sur grand
écran, ~73 sur mobile paysage — 1 unité logique n'y vaut que 0,6 px). `touchSize(desired)` applique
ce plancher ; tout composant cliquable y passe et renvoie ses **dimensions effectives**, d'après
lesquelles les écrans empilent (via `layoutCursor`). Ne jamais écrire une hauteur de zone cliquable
en dur : elle ne peut pas être juste sur tous les écrans à la fois.

Règles pour tout nouvel écran : dimensionner les fonds sur `viewport().width/height` (jamais
800×600 en dur), ancrer l'UI de bord sur `safeLeft/safeTop/safeRight/safeBottom`, et s'abonner via
`onSceneResize()` (`render/ui.ts`) pour se réancrer au resize/rotation. Inputs uniquement
tap/pointer (le hover du campement est un bonus desktop, jamais requis). Capacitor prévu en v1 —
ne pas introduire d'API desktop-only d'ici là.

## Debug

`window.__game` (main.ts) expose l'instance Phaser : permet de piloter la sim depuis la console
(`__game.scene.getScene('game').update(0, dtMs)`) — utilisé pour la vérification visuelle automatisée
en headless, où la boucle RAF est suspendue. À retirer pour un build de distribution.

## CI / Déploiement (ADR-006, ADR-008)

`.github/workflows/ci.yml` : tests + build sur push `main` et sur toute PR. Hébergement GitHub
Pages en *project page* (`username.github.io/td-rpg-game/`, `vite.config.ts` porte
`base: "/td-rpg-game/"` par défaut). Depuis ADR-008, la branche `gh-pages` sert aussi une **preview
par PR** : `main` à la racine, chaque PR ouverte dans `/pr-<numéro>/` (lien commenté automatiquement
sur la PR), nettoyée à la fermeture. Le `base` de build est surchargé par CI via `vite build --base`
selon l'événement — pas de branche de config supplémentaire dans `vite.config.ts`.

## Typage explicite (ADR-033)

`npm run lint` (ESLint + `typescript-eslint`) exige un type écrit sur chaque `const`/`let`
(`@typescript-eslint/typedef`), au-delà de ce que `tsc --noEmit` vérifie déjà — l'inférence reste
correcte sans lint, mais le type n'est alors lisible que via l'IDE. Exceptions documentées par un
commentaire `eslint-disable-next-line` : valeur de fonction, `as const`/`satisfies` (dont
l'annotation réélargirait le type précis qu'ils gardent). Pas encore câblé en CI.

## Commandes

```
npm install     # première fois
npm run dev     # serveur de dev Vite
npm test        # tests du core (Vitest)
npm run lint    # ESLint (typage explicite, ADR-033)
npm run build   # typecheck + build prod
```
