# Assets — provenance & licences

**Règle** : on ne versionne QUE les fichiers réellement chargés. Un pack complet ne rentre
jamais tel quel — on en extrait les fichiers utilisés, renommés par usage, et on jette le reste.
Le dossier est passé de 20 Mo / 4128 fichiers à ~740 Ko / 98 fichiers en appliquant cette règle.

`src/render/assets.integrity.test.ts` la tient : un fichier cité par le code doit exister, et un
fichier présent doit être chargé par quelqu'un. Ajouter un asset sans le brancher fait échouer
les tests — c'est voulu.

| Dossier | Contenu | Auteur | Licence |
|---|---|---|---|
| `skin-craftpix/` | **SKIN ACTIF du monde** — 24 ennemis, héros, Archerie et Givre (paliers + spécialisations). Provenance MÊLÉE, voir plus bas | CraftPix + génération IA (ADR-043/044/045/047/050/061) | mêlée — détail plus bas |
| `skin-medieval/` | Reliquat du skin maison : Bastion, dalle, catapulte × 2 paliers (4 SVG) | **projet Bastion** (ADR-016) | maison |
| `icons/ui-*.svg` | Icônes d'UI — parchemin, livre, portail, cadenas, donjon ; `ui-shield.svg` ne sert plus qu'à l'icône d'installation PWA (`manifest.webmanifest`), le jeu affiche le bouclier du pack | **projet Bastion** (ADR-012) | maison |
| `icons/` (3 autres) | Icônes de sorts : `tornado`, `flying-flag`, `arrow-cluster` | **Lorc** — game-icons.net | **CC BY 3.0** ⚠ crédit obligatoire |
| `tiny-swords/` | UI 9-slice, bâtiments, FX, décors — voir plus bas | **Pixel Frog** — pixelfrog-assets.itch.io | **CC0** |
| `kenney-td/` | `sheet.png` seule (planche 64×64, 23 colonnes) — ne sert plus qu'aux FX | Kenney (kenney.nl) | **CC0** |
| `kenney-ui/` | 4 images : `btn-grey`, `btn-yellow`, `panel-grey`, `divider` | Kenney (kenney.nl) | **CC0** |
| `audio/` (SFX) | 20 SFX (tirs + variantes spécialisées, impact, morts, dégât château, coup d'épée héros, clic UI, navigation, achat, sorts héros, victoire/défaite) — voir détail plus bas | Kenney + RPG Sound Pack + 400 Sounds Pack + Free Fantasy SFX Pack (TomMusic) | **CC0/gratuit** |
| `audio/music-menu.ogg` | Musique de menu, boucle fabriquée par montage (ADR-039) — voir détail plus bas | Nastelbom (déclaré) | non confirmée, non bloquant (ADR-041) |
| `../fonts/` | Cinzel (titres) + Alegreya (textes) | Natanael Gama / Juan Pablo del Peral | **OFL 1.1** |

CC0 = domaine public : usage commercial autorisé, crédit non obligatoire.
OFL 1.1 = libre y compris commercial ; ne pas revendre les polices seules.

⚠ **CC BY 3.0 (icônes de sorts)** : crédit obligatoire à l'écran avant toute distribution —
« Icons by Lorc — game-icons.net — CC BY 3.0 ». Les fonds noirs des SVG d'origine ont été
retirés (glyphe blanc sur transparent, teintable par Phaser).

## `skin-craftpix/` — provenance mêlée, refonte en cours (ADR-061)

Le nom du dossier est un **reliquat** : il ne contient plus seulement du CraftPix. Il sera
renommé quand la refonte graphique sera terminée, pas avant — un renommage par fichier
brouillerait l'historique de la reprise.

Trois provenances y coexistent :

| Origine | Fichiers | Licence |
|---|---|---|
| **CraftPix** (packs de monstres) | les sprites au nom hérité du pack : `goblin-knight`, `orc-fang`, `brute-zombie`, `steel-golem`, `ghost`, `dark-knight`, `troll`, `ogre`, `warlord`, et les 10 du deuxième acte | licence CraftPix (ADR-043/044/049) |
| **Génération IA, suffixe `-ai`** | volants, héros, tours (ADR-045/047) | générés pour le projet |
| **Génération IA, nommés par `defId`** | `diablotin.png`, `scorpion.png` — refonte en cours (ADR-061) | générés pour le projet |

**Convention de nommage cible : `<defId>.png`, snake_case strict**, identique à l'identifiant
dans `src/content/enemies.ts` / `towers.ts`. Les tours suffixent le palier et la spécialisation
(`tower_archer_t3.png`, `tower_archer_spec_longbow.png`). Les noms hérités des packs et les
suffixes `-ai` disparaissent au fil des reprises.

**Résolution de stockage : 256 px de grand côté.** Les sprites ne dépassent jamais 62 px à
l'affichage (portrait du Bestiaire) et 82 px en jeu ; au-delà de 256 px on ne stocke que du
poids. Les fichiers antérieurs à cette règle (`hero-ai.png` 177 Ko, `wyvern-ai.png` 201 Ko,
`the_gravedigger.png`) seront ramenés à cette taille en passant.

Les prompts et la chaîne de nettoyage sont dans `docs/PROMPTS-GEMINI.md` et
`docs/REFONTE-GRAPHIQUE-GEMINI.md`.

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

## `audio/` — détail (ADR-037/038/040/041/042)

20 SFX, quatre sources.

| Fichier | Pack source | Fichier d'origine |
|---|---|---|
| `sfx-shot-archer.ogg` | Free Fantasy SFX Pack (TomMusic, itch.io) | `Bow Attack 1.wav` |
| `sfx-shot-archer-spec.ogg` | Free Fantasy SFX Pack (TomMusic) | `Bow Attack 2.wav` (Archerie spécialisée, ADR-042) |
| `sfx-shot-catapult.ogg` | Free Fantasy SFX Pack (TomMusic) | `Rock Meteor Throw 1.wav` (ADR-053 : remplace `impactWood_heavy_000.ogg` d'ADR-041, jugé pas assez « impact de projectile lourd » par le PO) |
| `sfx-shot-frost.ogg` | Free Fantasy SFX Pack (TomMusic) | `Ice Barrage 1.wav` (ADR-053 : remplace `Ice Throw 1.wav`, jugé pas adapté par le PO) |
| `sfx-shot-frost-fire.ogg` | Free Fantasy SFX Pack (TomMusic) | `Fireball 1.wav` (spécialisation « Givre ardent », ADR-042) |
| `sfx-impact.ogg` | RPG Sound Pack | `battle/spell.wav` — impact générique (catapulte, sort de compte hors seuil) |
| `sfx-impact-frost.ogg` | Free Fantasy SFX Pack (TomMusic) | `Ice Freeze 1.wav` (ADR-054 : impact dédié de la tour de givre, jusqu'ici indifférenciable de l'impact générique ET du tourbillon du héros) |
| `sfx-enemy-died.ogg` | RPG Sound Pack | `NPC/gutteral beast/mnstr3.wav` |
| `sfx-castle-hit.ogg` | Kenney — Impact Sounds | `impactBell_heavy_000.ogg` |
| `sfx-hero-died.ogg` | RPG Sound Pack | `inventory/armor-light.wav` |
| `sfx-hero-attack.ogg` | Free Fantasy SFX Pack (TomMusic) | `Sword Attack 1.wav` (ADR-042) |
| `sfx-ui-click.ogg` | 400 Sounds Pack (itch.io) | `item_equip.wav` (ADR-042) |
| `sfx-purchase.ogg` | 400 Sounds Pack (itch.io) | `coins_gather_quick.wav` (ADR-042) |
| `sfx-bestiary-open.ogg` | 400 Sounds Pack (itch.io) | `map_open.wav` (ADR-042 ; réutilisé pour Histoire depuis ADR-053) |
| `sfx-chronicles-open.ogg` | 400 Sounds Pack (itch.io) | `sword_slice.wav` (ADR-042 ; réutilisé pour l'entrée en niveau depuis ADR-053) |
| `sfx-victory.wav` | 400 Sounds Pack (itch.io) | `brass_positive_long.wav` (ADR-053) |
| `sfx-defeat.wav` | 400 Sounds Pack (itch.io) | `brass_defeated.wav` (ADR-053) |
| `sfx-hero-whirlwind.wav` | 400 Sounds Pack (itch.io) | `whoosh_1.wav` (ADR-053) |
| `sfx-hero-rally.wav` | 400 Sounds Pack (itch.io) | `brass_chime_quick.wav` (ADR-053) |
| `sfx-account-spell.ogg` | Free Fantasy SFX Pack (TomMusic) | `Rock Meteor Swarm 1.wav` (ADR-053 : distingue le sort de compte d'un simple impact de tour à zone) |

Kenney (kenney.nl) et RPG Sound Pack (artisticdude, opengameart.org/content/rpg-sound-pack) :
**CC0**. 400 Sounds Pack et Free Fantasy SFX Pack by TomMusic (tommusic.itch.io) : packs
gratuits itch.io, licence déclarée par le PO (ADR-041/042) — aucun crédit demandé par leurs
auteurs.

Les packs sources (chacun bien plus fourni que ce qui est retenu) ne sont pas versionnés en
entier, même règle que pour `tiny-swords/`.

## `audio/music-menu.ogg` — détail (ADR-039)

Fichier fourni directement par le PO (`nastelbom-fantasy-454036.mp3`, ~1 min 37, sans métadonnée
embarquée) — nom cohérent avec un export **Pixabay Music**, non confirmé. Le PO a validé que ce
n'est pas un blocage de fusion (ADR-041) : les prochains ajouts audio seront restreints à
CC0/domaine public/généré par IA.

Le fichier original n'était pas bouclable (silence de tête, fondu de sortie vers le silence en
fin de piste). `music-menu.ogg` est une boucle FABRIQUÉE par montage ffmpeg : segment actif isolé
(0,57 s → 92,7 s de l'original) puis fondu enchaîné de 4 s entre la fin et le début de ce segment
— la fin du fichier de boucle se fond dans son propre début, donc aucun silence ni saut de volume
au point de raccord (vérifié par lecture bout à bout + détection de silence). 88,13 s, Vorbis
~130 kb/s, ~1,4 Mo — nettement plus gros que les SFX (quelques Ko), normal pour une piste longue.
