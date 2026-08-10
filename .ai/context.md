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
- **Rendu** : **cartoon militaire / sci-fi CC0** (pack **Kenney Tower Defense top-down**, tuiles 64×64,
  vectoriel lisse → `pixelArt:false`). Terrain en tuiles (herbe + routes), ennemis (tanks/avion)/héros/
  tours (socle+canon)/base en **sprites retained-mode** via une couche swappable (ADR-005) :
  `render/sprites.ts` = registre de skin (point de swap unique, testé), `render/EntityLayer.ts` =
  `SpriteLayer<T>`, `render/assets.ts` = préchargement, `render/theme.ts` = palette. Chrome d'UI sur Kenney UI.
  Historique : un 1er skin **pixel médiéval Tiny** a été fait puis abandonné (PO : « pas giga beau ») ;
  le swap complet n'a touché que `sprites.ts`/`assets.ts` (preuve ADR-005). Planches Tiny conservées (skin alt).
  ⚠ Couche payante future = éditer `sprites.ts`/`assets.ts`, rien d'autre.
- **Wording** : passe sci-fi faite sur les noms in-game (Éclaireur/Blindé/Char lourd/Drone ;
  Tourelle/Mortier/Canon cryo + specs). **Saga/chapitres/lore profond = en attente du fichier lore du PO.**
- **Tests** : 40 (sim + profil + save + registre de sprites). Le test de déterminisme protège ADR-001 ;
  `sprites.test.ts` garantit que tout ennemi/tour de CONTENT a un sprite.
- **Équilibrage** : passe nº1 faite (hpExponent 1.12, or +30%, départ 160, specs boostées) — calibrée
  au **bot de simulation** (stratégies scriptées sur la sim headless, méthode décrite au GDD §Décisions).
- **UI** : rendu HiDPI (texte net), polices embarquées **Cinzel** (titres/boutons) + **Alegreya**
  (textes) chargées avant le boot Phaser, curseurs **dessinés sur canvas** (flèche + main dorées,
  image-set 2x — les PNG Kenney 30px étaient flous), boutons avec hover/pressed, sorts en
  boutons-icônes (game-icons, CC-BY → crédit obligatoire, voir public/assets/README.md),
  deltas chiffrés sur upgrades et specs.

## Prochaine grosse feature actée (design au GDD, à implémenter)
**Équipement du héros + loot** : 3 slots (arme/armure/relique), butin en fin de run victorieux
pondéré par chapitre/étoiles, raretés, doublons recyclés en Sceaux. ⚠ Le random vit côté méta
(ProfileService), JAMAIS dans la sim (déterminisme ADR-001).

## En attente côté product owner
- Fichier de contexte **lore** (format : `docs/LORE.md`) → remplacera noms/textes placeholders.
- Session **bestiaire** (nouveaux monstres + compétences spéciales → extension sim à prévoir).
- Boss final multi-phases (ch.10) → extension sim à chiffrer.

Toute décision doit rester compatible avec les Failles v1 (sim déterministe, scaling paramétré, leaderboard).
