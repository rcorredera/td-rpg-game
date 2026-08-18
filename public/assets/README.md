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
| `icons/ui-*.svg` | Icônes d'UI — parchemin, livre, portail, cadenas, donjon ; `ui-shield.svg` ne sert plus qu'à l'icône d'installation PWA (`manifest.webmanifest`), le jeu affiche le bouclier du pack | **projet Bastion** (ADR-012) | maison |
| `icons/` (3 autres) | Icônes de sorts : `tornado`, `flying-flag`, `arrow-cluster` | **Lorc** — game-icons.net | **CC BY 3.0** ⚠ crédit obligatoire |
| `tiny-swords/` | UI 9-slice, bâtiments, FX, décors — voir plus bas | **Pixel Frog** — pixelfrog-assets.itch.io | **CC0** |
| `kenney-td/` | `sheet.png` seule (planche 64×64, 23 colonnes) — ne sert plus qu'aux FX | Kenney (kenney.nl) | **CC0** |
| `kenney-ui/` | 4 images : `btn-grey`, `btn-yellow`, `panel-grey`, `divider` | Kenney (kenney.nl) | **CC0** |
| `audio/` (SFX) | 8 SFX (tirs, impact, morts, dégât château, clic UI) — voir détail plus bas | Kenney (kenney.nl) | **CC0** |
| `audio/music-menu.ogg` | Musique de menu, boucle fabriquée par montage (ADR-039) — voir détail plus bas | Nastelbom (déclaré) | **⚠ à confirmer** |
| `../fonts/` | Cinzel (titres) + Alegreya (textes) | Natanael Gama / Juan Pablo del Peral | **OFL 1.1** |

CC0 = domaine public : usage commercial autorisé, crédit non obligatoire.
OFL 1.1 = libre y compris commercial ; ne pas revendre les polices seules.

⚠ **CC BY 3.0 (icônes de sorts)** : crédit obligatoire à l'écran avant toute distribution —
« Icons by Lorc — game-icons.net — CC BY 3.0 ». Les fonds noirs des SVG d'origine ont été
retirés (glyphe blanc sur transparent, teintable par Phaser).

## `tiny-swords/` — réserve en attente de câblage

Extrait du pack gratuit **Tiny Swords** (Pixel Frog, CC0 ; redistribution du pack brut interdite,
usage dans un jeu autorisé sans crédit). 59 fichiers retenus sur 462.

| Sous-dossier | Fichiers | Usage |
|---|---|---|
| `ui/` | `paper-*`, `btn-*`, `bar-*`, `ribbons-small`/`ribbons-big`, `icon-05`/`icon-06`/`icon-12` | **branchés** — modales, jauges, boutons, rubans de titre, emblèmes Chroniques/Armurerie/Son (ADR-032/035/036/037) |
| `ui/` (reste) | `banner*`, `icon-{01,02,03,04,07,08,09,10,11}` | réserve — bandeaux de titre, pas encore d'usage trouvé pour ces 9 icônes-ressources |
| `buildings/` | `castle-blue`, `archery-blue`, `tower-{blue,purple,red}` | `castle-blue` **branché** (emblème Histoire, ADR-031) ; le reste en réserve — donjon, paliers visuels de tour |
| `fx/` | `explosion-*`, `fire-*`, `dust-*`, `water-splash` | réserve — impacts catapulte, feu grégeois |
| `decor/` | `rock-*`, `bush-*` (planches animées 8 frames), `clouds-*` | réserve — habillage des biomes (ADR-023) |

Ce qui reste en réserve est exempté du test d'orphelins via la liste `RESERVE`. **Cette
exemption est une dette**, pas un statut : ce qui n'est pas câblé doit finir branché ou supprimé.

### Écarté du pack, et pourquoi

- **Units** (225 fichiers) — le pack gratuit ne contient que des unités **humaines** en 5 couleurs.
  Aucun monstre : rien pour notre bestiaire (gobelin, orc, golem, spectre, wyverne…).
- **Terrain/Tileset** — tuiles d'île avec falaise sur eau. Ne correspond pas aux 10 biomes.
- Variantes de couleur inutilisées, avatars, table en bois, curseurs, sources `.aseprite`.

## `audio/` — détail (ADR-037/038/040)

8 SFX, deux sources. Kenney pour l'UI/tir d'archerie ; **RPG Sound Pack** (artisticdude,
opengameart.org/content/rpg-sound-pack, **CC0**, 405 favoris) pour les sons de combat/mort —
Kenney n'a pas de pack combat fantasy dédié, et les sons génériques d'impact (ADR-037) se
ressemblaient trop entre eux au playtest (ADR-040).

| Fichier | Pack source | Fichier d'origine |
|---|---|---|
| `sfx-shot-archer.ogg` | Kenney — Interface Sounds | `pluck_001.ogg` |
| `sfx-shot-catapult.ogg` | RPG Sound Pack | `battle/swing2.wav` |
| `sfx-shot-frost.ogg` | RPG Sound Pack | `battle/magic1.wav` |
| `sfx-impact.ogg` | RPG Sound Pack | `battle/spell.wav` |
| `sfx-enemy-died.ogg` | RPG Sound Pack | `NPC/gutteral beast/mnstr3.wav` |
| `sfx-castle-hit.ogg` | Kenney — Impact Sounds | `impactBell_heavy_000.ogg` |
| `sfx-hero-died.ogg` | RPG Sound Pack | `inventory/armor-light.wav` |
| `sfx-ui-click.ogg` | Kenney — Interface Sounds | `select_001.ogg` |

Les packs sources (chacun bien plus fourni que ce qui est retenu) ne sont pas versionnés en
entier, même règle que pour `tiny-swords/`.

## `audio/music-menu.ogg` — détail (ADR-039)

Fichier fourni directement par le PO (`nastelbom-fantasy-454036.mp3`, ~1 min 37, sans métadonnée
embarquée) — nom cohérent avec un export **Pixabay Music**, non confirmé. **⚠ Licence à valider
avant fusion sur `main`** : la licence Pixabay Content actuelle autorise l'usage commercial sans
crédit obligatoire, mais rien dans le fichier lui-même ne le garantit.

Le fichier original n'était pas bouclable (silence de tête, fondu de sortie vers le silence en
fin de piste). `music-menu.ogg` est une boucle FABRIQUÉE par montage ffmpeg : segment actif isolé
(0,57 s → 92,7 s de l'original) puis fondu enchaîné de 4 s entre la fin et le début de ce segment
— la fin du fichier de boucle se fond dans son propre début, donc aucun silence ni saut de volume
au point de raccord (vérifié par lecture bout à bout + détection de silence). 88,13 s, Vorbis
~130 kb/s, ~1,4 Mo — nettement plus gros que les SFX (quelques Ko), normal pour une piste longue.
