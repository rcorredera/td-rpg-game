# Contexte produit

Prototype v0 d'un TD médiéval (« Bastion », univers du Roi-Charogne) avec méta-progression :
valider le fun de la boucle run → monnaies → unlocks → run plus fort.

## État actuel (2026-06)
- **Modes** : Histoire (10 chapitres, déblocage séquentiel, ch.2-10 en contenu généré provisoire) ;
  Failles infinies = mode séparé, verrouillé tant que l'Histoire n'est pas achevée, à implémenter (v1).
- **Méta** : 2 monnaies — Éclats ◆ (unlocks Arsenal + Forge) et Sceaux ⚜ (sorts du héros, gagnés
  via les kills du héros). Bestiaire à découverte progressive (créatures + défenses). Chroniques (top 5 runs).
- **In-run** : 3 tours à 3 niveaux + **spécialisation niv.4** (choix binaire définitif : multishot,
  longue portée, brûlure % PV max, aura de givre) + vente (65%), héros bloqueur à 2 sorts,
  auto-vague, x2, multi-chemins et portails de Faille supportés par la sim. Étoiles 1-3 par chapitre.
- **Rendu** : **skin médiéval dessiné pour le projet** (ADR-016) — 10 sprites SVG maison dans `public/assets/skin-medieval/` (gobelin, orc, brute, chauve-souris, chevalier, 3 tours, Bastion, dalle), style aplats + contour sombre, silhouettes porteuses de sens. Palette dédiée (`render/palette.ts`), sol et chemins générés sur canvas (`render/terrain.ts`), projectiles typés par tour (`render/projectiles.ts`), animation procédurale des unités et paliers visuels de tour (ADR-017, `render/animation.ts` — marche/vol/repos calculés sur la transform, rang 3 et specs ont leur propre sprite). Le tout via la couche swappable (ADR-005) : `sprites.ts` = registre, `EntityLayer.ts` = `SpriteLayer<T>`, `assets.ts` = préchargement. Historique : skin **pixel médiéval Tiny** (rejeté « pas giga beau »), puis **Kenney TD sci-fi** — des CHARS et DRONES dans un jeu de chevaliers, remplacé pour incohérence d'univers. ⚠ Tout changement de skin doit s'accompagner du renommage du contenu (noms + lore dans `content/index.ts`).
- **Wording** : passe sci-fi faite sur les noms in-game (Éclaireur/Blindé/Char lourd/Drone ;
  Tourelle/Mortier/Canon cryo + specs). **Saga/chapitres/lore profond = en attente du fichier lore du PO.**
- **Tests** : 60 (sim + profil + save + registre de sprites + thème + composants UI purs + viewport).
  Le test de déterminisme protège ADR-001 ; `sprites.test.ts` garantit que tout ennemi/tour de
  CONTENT a un sprite ; `viewport.test.ts` garantit que la zone de jeu reste visible sur tout écran.
- **CI/hébergement** : GitHub Actions (ADR-006) — tests+build sur push/PR, déploiement GitHub Pages
  auto sur `main` (project page). Pages est actif en mode branche `gh-pages` : `main` à la racine,
  et **une preview par PR** dans `pr-<n>/`, commentée sur la PR puis nettoyée à sa fermeture (ADR-008).
- **Biomes de chapitre (ADR-023) — FAIT** : chaque chapitre a son identité visuelle (prairie, cendres,
  marécage, forêt, carrières, glace, tertres, ruines, toundra, terre gâtée). « Le Col du Gel » s'affichait
  sur la même prairie verte que tous les autres. Le content NOMME un biome, `render/biomes.ts` décide de
  son apparence (ADR-005). Un biome porte la FORME de son motif (`grass`/`rock`/`flake`/`reed`) et sa
  ROUTE, pas seulement une teinte — teinter ne suffit pas, `setTint` assombrit sans désaturer. Tests :
  biome connu par chapitre, jamais deux décors identiques consécutifs, sol+route distincts, repli sûr,
  et saturation < 0,55 (le décor ne doit pas concurrencer les unités).
  ⚠ RESTE : les 10 chapitres partagent toujours DEUX tracés — le décor les distingue, pas la topologie.
- **Bestiaire (ADR-022) — FAIT** : 4 → **10 créatures**, chacune conçue pour NEUTRALISER une tour
  et en valoriser une autre. Rat de faille (saturation → AoE), Spectre (`slowImmune` → le givre ne
  sert plus), Gargouille (volant lourd → la catapulte ne peut rien), Golem (`armor` 11 → gros coups
  ou brûlure), + 2 vrais boss : **Chef de guerre** (v5/v10) et **Vouivre** (boss VOLANT du ch.10).
  Deux mécaniques neuves dans le content : `armor` (réduction plate, plancher 25 % — la brûlure en
  % PV max l'IGNORE, ce qui donne enfin une raison de préférer Feu grégeois à Trébuchet) et
  `slowImmune`. Une créature apparaît aux ch.2-5, les suivants les mélangent ; la **3e vague** de
  chaque chapitre la présente seule. Le Bestiaire affiche les traits (`cuirassé 11`, `insensible au
  froid`). Taille d'affichage déplacée dans `sprites.ts` (`SpriteRef.size`, ADR-005) — elle était en
  ternaires dans `GameScene`. ⚠ **Propriété acquise et testée** : le ch.10 est INFRANCHISSABLE sans
  méta et franchissable avec (11/12 vagues à vide, victoire à 16 PV équipé) — la boucle
  run → monnaies → run plus fort n'est plus décorative.
- **Méta-progression (ADR-021) — FAIT** : armurerie vidée en **5 runs** au lieu de 2, puits d'Éclats
  en 14, sorts en **12 runs** au lieu de 2, et le ch.10 rapporte **×3,32** le ch.1 au lieu de ×1,11.
  Le rapport du banc affiche « aucune saturation détectée ». Les **Sceaux paient le temps de blocage**
  (`heroBlockSeconds`) et non les kills — la métrique récompensait le placement le moins efficace ;
  −1 par mort du héros pour éviter le sacrifice répété. Armurerie 3 → **6 paliers** (120 → 420 ◆),
  sorts 3 → **4 niveaux** (24 → 56 ⚜). `UnlockDef` vit désormais dans le `ContentPack` **avec ses
  effets** (`castleHp`, `startingGold`, `heroRespawnS`, `accountSpell`) : ajouter un palier ne touche
  plus à la sim. ⚠ Deux textes d'UI annonçaient encore les kills — une monnaie doit **dire** ce
  qu'elle récompense. Garanties testées, courbe prouvée par mutation.
- **Chemins & cartes (ADR-019)** : le tracé dessiné ne s'écarte plus du chemin que suit la sim
  (spline de Catmull-Rom → arrondi de coins borné, `render/path.ts` pur) — **64,7 px d'écart mesurés
  avant, 5,8 après**, pour une route de 46 de large. Les unités marchaient visiblement à côté de leur
  route alors que les tours visaient leur position réelle. Les layouts `LAYOUT_RIFT`/`LAYOUT_PINCER`
  (ch.2-10) sont redessinés : « Tenailles » convergeait mal (voie 2 à 940 px contre 1280, couverte
  par 3 emplacements sur 6 → **6/6 et longueurs à 2 %**), « Faille » faisait un demi-tour. Trois
  propriétés de carte sont désormais testées sur chaque voie de chaque chapitre (écart de tracé,
  couverture ≥ 2/3, longueurs à ±25 %), **prouvées par mutation**. `PATH_WIDTH` = source unique.
- **Banc d'essai (ADR-018)** : `npm run balance` mesure le jeu sans y jouer — fiches ennemis/tours,
  pression par vague, santé de la méta, et un joueur artificiel (3 politiques) sur les 10 chapitres.
  `src/balance/`, hors bundle. Les formules qui doublent celles de la sim sont verrouillées par des
  **tests miroirs** (comparaison à la sim, pas à des valeurs écrites à la main) — sans eux l'outil
  pourrait mentir sans rien casser. **Constats non encore corrigés** : récompense quasi identique
  d'un chapitre à l'autre (ch.10 = ×1,11 le ch.1) donc farm du ch.1 optimal ; armurerie et sorts
  saturés en 2 runs ; difficulté non monotone (ch.3 perdu, ch.4-9 gagnés) ; 1 800-3 800 or inutilisé
  au ch.10 (6 emplacements partout) ; Sceaux indexés sur les kills du héros alors que son bon
  placement en fait moins. Détail et chiffres : GDD §Équilibrage.
- **Triangle de rôles (ADR-020) — FAIT** : archerie seule gagnait 9 chapitres sur 10 contre 5 au
  mélange ; désormais **mélange 10/10 et 170 PV de château, archerie seule 7/10 et 68 PV**, givre
  seul 1/10, catapulte seule 0/10. Archerie = socle polyvalent qui paie sa polyvalence en rendement,
  catapulte = reine des groupes (rayon 55→85), givre = multiplicateur (ralentissement en zone).
  ⚠ **Le levier décisif n'était pas dans les tours mais dans l'espacement des vagues** : les
  renforcer plafonnait l'écart à +1 victoire, resserrer les spawns à ×0,7 l'a porté à +4. D'où aussi
  mini-boss allégés (×12→×7 : un boss est une cible ISOLÉE, l'AoE n'y peut rien) et **8 emplacements**
  au lieu de 6 aux ch.2-10 (le ch.1 en garde 6). Deux tests garantissent le triangle, prouvés par
  mutation. **Le chantier de contenu est débloqué** — un essaim favorise enfin réellement l'AoE.
- **Équilibrage** : passe nº1 faite (hpExponent 1.12, or +30%, départ 160, specs boostées) — calibrée
  au **bot de simulation** (stratégies scriptées sur la sim headless, méthode décrite au GDD §Décisions).
- **UI** : rendu HiDPI (texte net), polices embarquées **Cinzel** (titres/boutons) + **Alegreya**
  (textes) chargées avant le boot Phaser, curseurs **dessinés sur canvas** (flèche + main dorées,
  image-set 2x — les PNG Kenney 30px étaient flous), boutons avec hover/pressed, sorts en
  boutons-icônes (game-icons, CC-BY → crédit obligatoire, voir public/assets/README.md),
  deltas chiffrés sur upgrades et specs. Socle de widgets dans `render/components/` (ADR-007)
  + `layoutCursor` pour l'empilement vertical.
- **Viewport (ADR-010)** : cible **paysage**, le jeu remplit l'écran entier (avant : 35 % de la
  surface sur mobile portrait, le reste en bandes noires). `render/viewport.ts` = source unique
  (framebuffer, zoom, rectangle visible, encoches), réactif au resize/rotation ; invite « tournez
  votre appareil » en CSS sur mobile portrait.
- **Chantier UI/UX en cours** : socle format (ADR-010) + cibles tactiles (ADR-011, `touchSize`) +
  registre d'icônes maison, fin des emoji (ADR-012) + grille de niveaux et listes défilantes
  (ADR-013). Tous les sous-écrans du campement sont passés sur le kit ; `backButton()`/`row()`
  positionnelles supprimées. L'état « inabordable » du GDD est enfin rendu (coût rouge, cadre
  atténué) + fonds générés sur canvas, bandeau de titre et harmonisation du terrain (ADR-014,
  `render/backdrop.ts` — l'herbe fluo du pack est lavée par un voile chaud, `setTint` ne désature
  pas) + échelle typographique réelle, plein écran et correction des bornes de pointeur au resize
  (ADR-015). **Reste** : transitions d'écran et retours visuels (pulsation sur gain de monnaie,
  retour d'achat), et le fond du campement pourrait gagner un élément de décor (bannière,
  silhouette de remparts) — pour l'instant c'est matière + vignette, sans motif identifiable.
  ⚠ Le PO trouve encore la direction artistique datée (« années 80 ») : la palette elle-même
  (brun sombre + or) est à rediscuter, ce n'est plus un problème d'exécution mais de parti pris.

## Prochaine grosse feature actée (design au GDD, à implémenter)
**Équipement du héros + loot** : 3 slots (arme/armure/relique), butin en fin de run victorieux
pondéré par chapitre/étoiles, raretés, doublons recyclés en Sceaux. ⚠ Le random vit côté méta
(ProfileService), JAMAIS dans la sim (déterminisme ADR-001).

## En attente côté product owner
- Fichier de contexte **lore** (format : `docs/LORE.md`) → remplacera noms/textes placeholders.
- Session **bestiaire** (nouveaux monstres + compétences spéciales → extension sim à prévoir).
- Boss final multi-phases (ch.10) → extension sim à chiffrer.

Toute décision doit rester compatible avec les Failles v1 (sim déterministe, scaling paramétré, leaderboard).
