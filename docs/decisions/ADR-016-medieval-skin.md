# ADR-016 — Skin médiéval maison (maquette)

## Statut
Accepté — la maquette a été retenue et le skin médiéval maison est le skin ACTIF depuis
(voir `.ai/context.md`). Le statut « Proposé » de la rédaction initiale est conservé ci-dessous
pour mémoire : cet ADR a été écrit avant l'arbitrage.

> Proposé (2026-08-11) — **maquette soumise à validation**. Remplace le skin Kenney TD comme skin
> actif si elle est retenue. Exerce le point de swap d'ADR-005.

## Contexte
Après plusieurs passes d'exécution (format, cibles tactiles, icônes, navigation, lisibilité), le
rendu restait jugé « pas beau » et « années 80 ». Le diagnostic n'était pas dans la finition mais
dans le contenu de l'écran, et il est écrit noir sur blanc dans l'ancien registre :

```
goblin: frame 246  // éclaireur : petit char rapide (bleu)
orc:    frame 249  // blindé : char vert standard
brute:  frame 250  // char lourd (rouge)
bat:    frame 270  // drone aérien (avion vert)
HERO:   frame 247  // unité de commandement (char orange)
```

**Le jeu médiéval affichait des chars d'assaut, des drones et des tourelles sci-fi.** Le
Roi-Charogne envoyait des tanks contre un Bastion défendu par des mortiers. Le GDD l'assumait
(« Direction artistique : cartoon militaire / sci-fi CC0 »), héritage d'un prototype dont le but
était de valider le gameplay, pas le rendu.

Deux défauts s'y ajoutaient, mesurés à l'écran : les entités faisaient **~15 px** (indiscernables),
et le sol était une tuile d'herbe unie d'un vert quasi fluo qui écrasait tout.

## Décision

**Un skin médiéval entièrement dessiné pour le projet**, dans la continuité des icônes d'UI
(ADR-012) et des fonds (ADR-014) : pas de dépendance, pas de licence à suivre, style maîtrisé.

- **10 sprites SVG** (`public/assets/skin-medieval/`) : gobelin, orc, brute, chauve-souris,
  chevalier, trois tours, Bastion, dalle d'emplacement.
- **Vocabulaire graphique commun** : aplats, contour sombre épais, silhouettes trapues. Le contour
  est ce qui rend une unité lisible à petite taille sur un fond chargé.
- **Silhouette porteuse de sens** : oreilles du gobelin, carrure de la brute, ailes déployées de la
  chauve-souris (seule silhouette horizontale = « ça vole »), verticalité de l'archerie contre
  l'oblique de la catapulte, cristal de la tour de givre. On doit identifier une unité sans lire.
- **Palette dédiée** (`render/palette.ts`) avec une règle explicite : plus une couleur est saturée,
  plus elle porte du sens. Décor désaturé, une teinte par famille ennemie, or réservé au héros,
  accents vifs réservés à l'information (PV, portées, états).
- **Tailles en unités logiques, plus en facteurs d'échelle** : 46 à 62 px selon l'ennemi (×1,45 pour
  un boss), 84 px pour une tour, 140 px pour le Bastion. La hiérarchie de taille est elle-même une
  information — une brute doit se voir grosse.
- **Sol généré** (`render/terrain.ts`) : nuances, touffes, grain, dans une gamme désaturée. Les
  chemins deviennent un **tracé continu bordé** au lieu d'une tuile estampée tous les 16 px, qui
  laissait des bosses régulières visibles.
- `SpriteRef` accepte désormais une **texture autonome** (`key` seul) en plus des frames de planche
  (`key` + `frame`) — les deux coexistent, la planche servant encore aux FX.
- La composition « socle + emblème » des tours disparaît : elle n'existait que pour recycler des
  tourelles. Chaque tour est dessinée entière.

## Conséquences
- Le monde raconte enfin la même chose que le texte.
- Le point de swap d'ADR-005 est confirmé une seconde fois : le changement complet d'habillage tient
  dans `sprites.ts` + `assets.ts` + les tailles de `GameScene`. `core/`, `meta/` et `content/` ne
  bougent pas.
- `sprites.test.ts` gagne une garantie : **chaque ennemi a une texture distincte** — deux ennemis
  partageant un sprite seraient indiscernables en jeu.
- Le pack Kenney TD reste chargé pour les FX (flamme d'explosion), à reprendre dans un second temps.
- **Non traité ici, volontairement** : les animations et retours visuels (transitions d'écran,
  pulsation de monnaie, animation d'attaque), pourtant demandés. Animer un style avant qu'il soit
  validé serait du travail à refaire — ils viennent après cette maquette.
- Limite : le style est *flat à contour*, pas illustré/peint. Si le PO veut un rendu « premium »
  type Kingdom Rush, il faudra un pack externe (ADR à écrire), l'intégration restant triviale.

## Alternatives écartées
- **Garder Kenney TD en retouchant les couleurs** : aucun réglage ne transforme un char en orc.
- **Pack CC0 médiéval** (Kenney Medieval RTS, Tiny Town) : cohérent et gratuit, mais un skin pixel
  médiéval avait déjà été rejeté comme « pas giga beau », et l'assemblage de packs hétérogènes
  reproduit le problème de cohérence.
- **Pack payant** : meilleur rendu possible et intégration tout aussi simple, mais suppose un achat
  et un choix esthétique du PO. Reste ouvert si cette maquette ne convainc pas.
