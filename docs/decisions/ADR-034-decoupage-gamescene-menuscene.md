# ADR-034 — Découpage de GameScene et MenuScene en modules

## Contexte

`GameScene.ts` (1379 lignes) et `MenuScene.ts` (672 lignes) concentraient chacun toutes les
responsabilités de leur scène Phaser : lifecycle, HUD, menu contextuel de slot, FX/projectiles et
rendu des tours/ennemis/héros pour `GameScene` ; lifecycle, bandeau de titre, monnaies et sept
écrans (Home, Story, Rifts, Shop, Bestiary, Chronicles) pour `MenuScene`. `render/components/`
suit depuis longtemps le principe inverse (ADR-007) : géométrie et logique extraites en petits
modules, testés quand ils sont purs. Cette asymétrie rendait les deux scènes difficiles à
parcourir — une fonctionnalité HUD perdue au milieu du rendu des tours — et à faire évoluer sans
relire l'ensemble du fichier.

## Décision

1. **`render/menu/`** : chaque écran du Campement devient une fonction `buildXxx(ctx: MenuCtx)`
   dans son propre fichier (`homeView.ts`, `storyView.ts`, `riftsView.ts`, `shopView.ts`,
   `bestiaryView.ts`, `chroniclesView.ts`) ; les constructions partagées (panneau, en-tête,
   onglets, liste défilante, fiche de lore, rangée de boutique) vivent dans `menu/helpers.ts`, les
   constantes de style dans `menu/theme.ts`. `MenuCtx` (`menu/types.ts`) remplace `this` : la
   scène, le panel courant (recréé à chaque `showView`), `profileSvc`, et les deux points d'entrée
   que seule `MenuScene` possède (`navigate`, `refreshCurrencies`). `MenuScene.ts` ne garde que le
   lifecycle, le bandeau de titre, les monnaies et le dispatch de vue.
2. **`render/game/`** : `terrain.ts` (décor statique, jauge du Bastion, chemins de Faille),
   `hud.ts` (barre d'actions du run), `modals.ts` (confirmation de sortie, écran de fin de run),
   `slotMenu.ts` (menu contextuel construire/améliorer/vendre), `entities.ts` (placement et
   overlay des tours, ennemis, héros), `fx.ts` (effets transitoires et projectiles en vol),
   `types.ts`/`constants.ts` (types et constantes partagés). `GameScene.ts` ne garde que le
   lifecycle, l'input et l'orchestration de la boucle update/draw.
3. Chaque module reçoit la scène en paramètre explicite (`scene: Phaser.Scene`) plutôt que de
   capturer `this` — cohérent avec `render/components/` (ADR-007), où tous les composants prennent
   déjà `scene` en premier argument.

## Conséquences

- 1379 + 672 = 2051 lignes réparties en deux scènes fines (331 + 180 lignes) et 16 modules de 24 à
  349 lignes chacun.
- Aucune régression de comportement visée : le rendu (`render/`) n'est pas testé unitairement
  (`.ai/conventions.md`), et la vérification visuelle habituelle (capture d'écran) était
  indisponible dans cette session. À la place, chaque module a été exercé en runtime via le hook
  `window.__game` (ARCHITECTURE.md « Debug ») : les six écrans et tous leurs onglets côté
  Campement, et côté run — construction/amélioration/vente de tour, déclenchement des deux sorts,
  plusieurs vagues de combat, confirmation de sortie, écran de fin de run — sans aucune erreur
  console.
- Un bug d'ORDRE DE DESSIN a été repéré pendant l'extraction : le flash rouge d'impact du Bastion
  se dessinait, dans le `draw()` d'origine, AVANT la jauge de PV (donc recouvert par elle). Une
  première version de `drawCastleBar` l'avait replacé APRÈS par erreur — corrigée avant la fin du
  découpage. Leçon : un déplacement de code qui semble mécanique peut inverser un ordre de dessin
  sur un même `Graphics` ; à vérifier explicitement à chaque extraction de bloc de rendu.
- `render/game/hud.ts` (349 lignes) et `render/game/entities.ts` (279 lignes) restent les plus gros
  modules du lot : chacun garde une seule responsabilité cohérente (la barre d'actions ; le
  placement/overlay des entités), pas un assemblage de fonctions sans rapport — pas de découpage
  supplémentaire forcé pour la seule taille.
- Règle pour la suite : une scène qui dépasse ~400-500 lignes ou mélange plusieurs responsabilités
  (HUD, FX, menu contextuel, écrans multiples) se découpe selon ce même principe — modules recevant
  `scene: Phaser.Scene` en paramètre, regroupés par responsabilité, jamais par type Phaser
  (« tous les `Graphics` ensemble »).
