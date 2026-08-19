# ADR-043 — Bestiaire élargi avec des sprites CraftPix

## Statut
Accepté (2026-08-19)

## Contexte
Le skin maison (ADR-016) dessine chaque unité en SVG, un travail long par créature. Le joueur a
téléchargé deux packs CraftPix gratuits (`craftpix-341189-free-2d-monster-sprites`,
`craftpix-437811-free-monster-enemy-game-sprites`, 20 variantes de monstres au total) dans l'idée
de remplacer les sprites existants un par un.

Après revue des 20 variantes (aperçus extraits en frame idle), seules 5 conviennent visuellement
au thème médiéval du Bastion : un scorpion, un troll à la massue, un fantôme, un ogre à la pierre,
un chevalier noir à l'épée et au bouclier. Aucune n'est une unité volante (donc rien pour la
Gargouille ou la Chauve-souris), rien pour un golem de pierre, rien de convaincant pour le Chef de
guerre — ces quatre gardent leur SVG maison, inchangé.

Plutôt qu'un remplacement 1-pour-1 (qui aurait forcé un seul sprite scorpion à couvrir 4 rôles
différents via de simples teintes), le joueur a demandé d'élargir le bestiaire : les 5 sprites
retenus donnent 4 **nouveaux** types d'ennemis (scorpion, troll, ogre, chevalier noir), le
cinquième (fantôme) reskinne directement le Spectre existant.

## Décision
- **Coexistence de deux formats de skin** dans `render/assets.ts` : le skin maison reste du SVG
  (`scene.load.svg`, table `MEDIEVAL`), les sprites CraftPix sont du PNG raster rogné (`scene.load.image`,
  nouvelle table `CRAFTPIX`) dans `public/assets/skin-craftpix/`. Le point de swap unique d'ADR-005
  n'est pas remis en cause : tout passe toujours par `render/sprites.ts`.
- **Portée statique** : une seule frame idle par sprite CraftPix, pas d'intégration au système
  d'animation (`render/animation.ts`) pour cette itération.
- **`wraith`** (Spectre) pointe désormais vers `spr_ghost` (CraftPix) au lieu de `foe-wraith.svg` —
  reskin direct, aucun changement de stats ni de rôle.
- **4 nouveaux ennemis** dans `content/index.ts` (`CONTENT.enemies`), chacun conçu pour occuper un
  créneau de menace vide dans la hiérarchie existante plutôt que dupliquer un rôle :
  - `scorpion` — swarm terrestre légèrement cuirassé (armure 2), à côté du rat (qui reste inchangé).
  - `troll` — encaissement mono-cible lourd, entre l'orc et la gargouille en taille.
  - `ogre` — cuirassé intermédiaire (armure 6), comble l'écart brute (0)/golem (11).
  - `dark_knight` (Chevalier noir) — élite rapide et cuirassée, alternative de mini-boss au Chef de
    guerre à partir du chapitre 9.
- **Intégration aux vagues procédurales** (`makeWaves`, ADR-022) : suit le patron déjà en place pour
  rat/spectre/gargouille/golem (introduits ch.2-5) — `NEWCOMER` étendu aux chapitres 6-9, chaque
  nouvelle créature a sa vague de présentation dédiée (case `2` du switch) et s'intègre aux patterns
  « front lourd » / « mélange complet » quand elle est débloquée.
- `docs/GDD.md` (Bestiaire) documente les 4 nouvelles créatures dans le même tableau
  Question/Neutralise/Valorise que le reste du bestiaire.

## Conséquences
- Le bestiaire passe de 10 à 14 créatures, réparties sur les 9 chapitres qui en introduisent
  (ch.2-9), le 10e restant le mélange final + boss volant (Vouivre).
- Garanties de test déjà en place et qui couvrent automatiquement l'ajout, sans modification des
  tests eux-mêmes : `sprites.test.ts` (chaque ennemi de `CONTENT` a une texture distincte),
  `sim.test.ts` (chaque `enemyId` utilisé dans les vagues réelles existe dans `CONTENT.enemies`).
- **Limite assumée** : les packs CraftPix « free » ont leurs propres conditions de licence
  (attribution potentiellement requise selon les termes CraftPix). Cette décision ne tranche pas
  ce point — à vérifier par le joueur avant toute publication publique du jeu.
- Le skin maison SVG et le skin CraftPix PNG coexistent durablement (pas de plan de migration
  complet) : `sprites.ts` reste le seul endroit à lire pour savoir quel format sert quelle entité.

## Alternatives écartées
- **Remplacement 1-pour-1 des 10 sprites maison** — écarté : seules 5/20 variantes CraftPix
  conviennent visuellement, un remplacement complet aurait forcé des sprites hors-thème (ex. tête
  de viande, robot) sur des rôles qui ne leur correspondent pas.
- **Scorpion en remplacement du rat** — écarté : le joueur veut garder les deux comme monstres
  distincts pour varier le rythme des vagues de saturation.
- **Intégration animée complète dès cette itération** — écarté : élargit trop la portée (extraction
  spritesheet, découpage par action, `animation.ts`) pour une première passe ; à reconsidérer si le
  rendu statique déçoit en jeu.
