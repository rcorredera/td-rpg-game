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
public/assets/  Packs Kenney CC0 (TD + UI) — voir README.md du dossier. Re-skin sprites à venir.
```

## Frontière core / render (ADR-001)

`core/sim.ts` expose : `createRun(content, profile, chapterIndex)`, `tick(state, content, dt)`, et des **commandes** (`buildTower`, `upgradeTower`, `sellTower`, `moveHero`, `castWhirlwind`, `castRally`, `castAccountSpell`, `startNextWave`). Le tick consomme un pas de temps fixe (1/60s) via un accumulateur (`timeAcc` — indispensable aux écrans 120Hz, voir pitfalls) ; la vitesse x2 multiplie le nombre de pas, pas le dt → simulation identique quelle que soit la vitesse (testé : test de déterminisme). Les cartes ont plusieurs chemins (`MapDef.paths`, dont des portails) ; chaque spawn/ennemi porte son `pathIndex` (ADR-004). La sim émet des `SimEvent` (tirs, morts, explosions) que le rendu consomme pour les fx ; elle ne sait pas qu'un rendu existe.

Conséquences : testable sans navigateur, et si un jour il faut un serveur autoritaire (leaderboards de Failles), la sim tourne côté serveur telle quelle.

## Persistence (ADR-002)

Le profil passe par l'interface `SaveAdapter` (`meta/save.ts`). Implémentation v0 : localStorage avec validation/fallback sur profil neuf si corruption. Un swap vers cloud save ne touche que ce fichier.

## Content as data (ADR-003)

Toutes les valeurs d'équilibrage vivent dans `src/content/index.ts`, typées par `ContentPack`. Règle absolue : aucune stat en dur dans `core/` ou `render/`. Rééquilibrer = modifier le content, sans toucher à la logique.

## UI chrome / composants (ADR-007)

`render/components/` : registre unique de widgets (panneau, bouton, modale, onglets, rangée de
liste, carte de navigation, en-tête de section, chip) — API purement Phaser/données brutes, jamais
de type `meta`/`content`/`core`. `layoutCursor` (`components/layout.ts`) empile verticalement une
liste d'éléments de hauteurs variables sans recalcul manuel d'offset par écran — à utiliser dès
qu'un écran empile des rangées/cartes sous un en-tête ou des onglets (évite la classe de bug
« chevauchement onglets/premier élément »). `render/theme.ts` reste la source unique de couleurs
(`TEXT` couleurs de texte, `ACCENT` teintes de bordure, en plus des tokens existants). `render/ui.ts`
ne porte plus que le chrome (échelle de rendu, polices, curseurs, caméra, préchargement).

`render/icons.ts` (ADR-012) : registre des icônes d'UI — les écrans nomment un **rôle**
(`story`, `armory`…), jamais un fichier ni un emoji. SVG monochromes maison, teintés au rendu, ce
qui permet de faire porter un état par la couleur (verrouillé, Faille, base en péril). Aucun emoji
dans l'UI : leur rendu dépend de l'OS et leurs couleurs cassent la palette.

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

## Commandes

```
npm install     # première fois
npm run dev     # serveur de dev Vite
npm test        # tests du core (Vitest)
npm run build   # typecheck + build prod
```
