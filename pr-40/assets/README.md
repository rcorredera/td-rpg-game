# Assets — provenance & licences

**Règle** : on ne versionne QUE les fichiers réellement chargés. Un pack complet ne rentre
jamais tel quel — on en extrait les fichiers utilisés, renommés par usage, et on jette le reste.
Le dossier est passé de 20 Mo / 4128 fichiers à ~740 Ko / 98 fichiers en appliquant cette règle.

`src/render/assets.integrity.test.ts` la tient : un fichier cité par le code doit exister, et un
fichier présent doit être chargé par quelqu'un. Ajouter un asset sans le brancher fait échouer
les tests — c'est voulu.

| Dossier | Contenu | Auteur | Licence |
|---|---|---|---|
| `skin-medieval/` | **SKIN ACTIF du monde** — 10 ennemis, héros, 3 tours × 2 paliers, Bastion, dalle (19 SVG) | **projet Bastion** (ADR-016) | maison |
| `icons/ui-*.svg` | Icônes d'UI — parchemin, bouclier, livre, bannière, portail, cadenas, donjon | **projet Bastion** (ADR-012) | maison |
| `icons/` (3 autres) | Icônes de sorts : `tornado`, `flying-flag`, `arrow-cluster` | **Lorc** — game-icons.net | **CC BY 3.0** ⚠ crédit obligatoire |
| `tiny-swords/` | UI 9-slice, bâtiments, FX, décors — voir plus bas | **Pixel Frog** — pixelfrog-assets.itch.io | **CC0** |
| `kenney-td/` | `sheet.png` seule (planche 64×64, 23 colonnes) — ne sert plus qu'aux FX | Kenney (kenney.nl) | **CC0** |
| `kenney-ui/` | 4 images : `btn-grey`, `btn-yellow`, `panel-grey`, `divider` | Kenney (kenney.nl) | **CC0** |
| `../fonts/` | Cinzel (titres) + Alegreya (textes) | Natanael Gama / Juan Pablo del Peral | **OFL 1.1** |

CC0 = domaine public : usage commercial autorisé, crédit non obligatoire.
OFL 1.1 = libre y compris commercial ; ne pas revendre les polices seules.

⚠ **CC BY 3.0 (icônes de sorts)** : crédit obligatoire à l'écran avant toute distribution —
« Icons by Lorc — game-icons.net — CC BY 3.0 ». Les fonds noirs des SVG d'origine ont été
retirés (glyphe blanc sur transparent, teintable par Phaser).

## `tiny-swords/` — réserve en attente de câblage

Extrait du pack gratuit **Tiny Swords** (Pixel Frog, CC0 ; redistribution du pack brut interdite,
usage dans un jeu autorisé sans crédit). 59 fichiers retenus sur 462.

| Sous-dossier | Fichiers | Usage prévu |
|---|---|---|
| `ui/` | `paper-*` (planches **9-slice** 3×3), `ribbons-*` (3-slice), `banner*`, `bar-*` (base + remplissage), `btn-*` (bleu/rouge, normal + enfoncé), `icon-01..12` | Modales, bandeaux de titre, barres de vie, boutons |
| `buildings/` | `castle-blue`, `archery-blue`, `tower-{blue,purple,red}` | Donjon ; paliers visuels de tour |
| `fx/` | `explosion-*`, `fire-*`, `dust-*`, `water-splash` | Impacts catapulte, feu grégeois |
| `decor/` | `rock-*`, `bush-*` (planches animées 8 frames), `clouds-*` | Habillage des biomes (ADR-023) |

Rien n'est encore branché : ces fichiers sont exemptés du test d'orphelins via la liste
`RESERVE`. **Cette exemption est une dette**, pas un statut : ce qui n'est pas câblé doit finir
supprimé.

### Écarté du pack, et pourquoi

- **Units** (225 fichiers) — le pack gratuit ne contient que des unités **humaines** en 5 couleurs.
  Aucun monstre : rien pour notre bestiaire (gobelin, orc, golem, spectre, wyverne…).
- **Terrain/Tileset** — tuiles d'île avec falaise sur eau. Ne correspond pas aux 10 biomes.
- Variantes de couleur inutilisées, avatars, table en bois, curseurs, sources `.aseprite`.
