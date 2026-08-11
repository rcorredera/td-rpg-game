# ADR-013 — Grille de niveaux et listes défilantes

## Statut
Accepté (2026-08-11). Complète ADR-011 (cibles tactiles) et achève la migration des écrans du
campement sur le kit d'ADR-007.

## Contexte
Trois problèmes remontés depuis un mobile réel (Android, paysage), captures à l'appui :

1. **En-tête du Bestiaire illisible** — le titre passait sous les onglets et le bouton retour les
   chevauchait. Cause directe : `MenuScene.backButton()` et `tabsY/tabsH = 32` posaient des
   positions et hauteurs **en dur**, alors qu'ADR-011 fait grandir les boutons avec le plancher
   tactile. Autrement dit, une omission de cette ADR : la règle « empiler d'après les dimensions
   effectives » avait été appliquée au campement et au HUD, pas aux sous-écrans.
2. **Aucun défilement** — tout contenu dépassant la hauteur disponible était simplement inatteignable.
3. **Format de liste inadapté** — question posée par le PO : « le mode liste est peut-être pas
   adapté, plus un truc grille ? »

## Décision

**Le format suit le contenu, et tout écran à contenu variable défile.**

- **Grille pour les chapitres** (`components/levelGrid.ts`). Ce sont des items courts (numéro, nom,
  étoiles) et nombreux (10, appelés à croître). En paysage, une liste verticale gâche la largeur et
  déborde ; une grille 5×2 les montre tous d'un coup. `gridLayout()` est **pure** et testée : elle
  ne crée jamais plus de colonnes que de tuiles (3 chapitres ne laissent pas deux trous à droite)
  et répartit la largeur restante, gouttières comprises.
- **Liste pour le Bestiaire, la Boutique et les Chroniques** : leurs entrées portent descriptions et
  stats multi-lignes, qu'une grille rendrait illisibles. Elles gagnent en revanche le défilement.
- **`components/scrollList.ts`** : fenêtre défilante au glisser et à la molette, avec indicateur.
  `clampScroll()` est pure et testée, y compris le cas « le contenu rétrécit sous la position
  courante » (changement d'onglet), qui laisserait sinon une fenêtre vide.
- **`uiSectionHeader` renvoie son `bottom`**, et `MenuScene.header()/tabs()` renvoient le Y du bas
  de ce qu'ils posent. Les sous-écrans empilent à partir de là — plus aucune constante verticale.
- **Le clic part au relâchement** (`uiButton`), avec abandon au-delà de `DRAG_SLOP = 10`. Sans ça,
  un défilement commencé sur un bouton déclenchait son action avant même que le doigt bouge —
  défaut rédhibitoire dans une liste tactile.
- Boutique migrée sur `uiListRow`, ce qui apporte enfin l'état **« inabordable »** spécifié au GDD
  et jamais rendu : coût en rouge, cadre atténué, achat inerte tant que la monnaie manque.

## Conséquences

- Le Bestiaire n'est plus borné par ce qui « tient » à l'écran : ajouter des créatures ne casse plus
  rien (c'était le risque signalé depuis plusieurs itérations).
- La grille s'adapte au nombre de chapitres sans retouche.
- `MenuScene.backButton()` et l'ancienne `row()` positionnelle disparaissent : tous les sous-écrans
  passent par le kit.
- **Le piège des évènements Phaser a mordu à nouveau** : `Phaser.GameObjects.Events.DESTROY` utilisé
  comme *valeur* dans `scrollList.ts` a rechargé Phaser et cassé les tests purs — exactement le
  pitfall consigné lors d'ADR-010. Les littéraux (`"destroy"`) restent la seule forme sûre dans un
  module que `components/` importe.
- Limite connue : les boutons du HUD de `GameScene` déclenchent toujours à l'appui (ils ne sont pas
  dans une zone défilante, et un HUD de jeu gagne à réagir immédiatement).
- `clampScroll` normalise `-0` en `0` : sans effet à l'affichage, mais `Object.is` les distingue et
  toute comparaison stricte échouerait.

## Alternatives écartées
- **Tout passer en grille** : illisible pour le Bestiaire, dont chaque entrée porte lore et stats.
- **Tout garder en liste avec défilement** : marche, mais laisse la largeur inutilisée en paysage
  et impose de faire défiler pour voir des niveaux qui tiendraient tous à l'écran.
- **Pagination plutôt que défilement** : ajoute des contrôles et un état à gérer, pour un contenu
  qui n'a pas de découpage naturel en pages.
