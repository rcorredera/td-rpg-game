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
