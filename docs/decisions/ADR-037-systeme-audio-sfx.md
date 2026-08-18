# ADR-037 — Système audio : SFX, registre et mute persisté

## Statut
Accepté (2026-08-15). La musique de fond est explicitement HORS PÉRIMÈTRE (voir Alternatives
écartées) — Kenney, seule source retenue pour cette passe, n'offre aucune piste bouclable.

## Contexte

Le jeu n'avait aucun son. La sim émet déjà des `SimEvent` dédiés au rendu (`shot`, `explosion`,
`castleHit`, `enemyDied`, `heroDied`, ADR-001) : `enemyDied`/`heroDied` étaient déclarés dans le
type mais jamais consommés côté rendu (aucun FX ni son).

Recherche d'assets CC0 : le pack **RPG Audio** de Kenney (déjà envisagé pour le thème médiéval)
ne contient que des sons d'inventaire (livres, cuir, pièces) — rien pour un tir ou un impact. Les
packs **Interface Sounds** et **Impact Sounds** couvrent en revanche tout le besoin (clics UI,
impacts bois/métal/verre/cloche). Aucun pack Kenney trouvé n'offre de musique de fond bouclable
— seulement des jingles courts (8-bit, sax, pizzicato), hors ton pour un TD médiéval sombre.

## Décision

**`render/audio.ts`** — registre SFX, même principe que `sprites.ts`/`icons.ts` (ADR-005/012) :
un rôle → une clé de son, point de swap unique. Huit rôles pour cette passe : `shotArcher`,
`shotCatapult`, `shotFrost` (un par tour, comme `sprites.ts`), `impact` (explosion générique :
éclat de catapulte ET les deux sorts du héros, qui émettent le même `SimEvent`), `enemyDied`,
`castleHit`, `heroDied`, `uiClick`. `shotSfx(towerDefId)` mappe une tour à son tir, avec la même
discipline que `towerView` : lève sur un defId inconnu plutôt que de jouer un son au hasard.

**Fichiers** dans `public/assets/audio/`, renommés par usage (convention du dossier, voir
`public/assets/README.md`) : 8 `.ogg` CC0, ~55 Ko au total, extraits des packs Kenney *Interface
Sounds* et *Impact Sounds*.

**Branchement** :
- `GameScene.consumeEvents` — `shot`/`explosion`/`castleHit` jouaient déjà un FX visuel, un
  `playSfx` est ajouté à côté. `enemyDied`/`heroDied` gagnent leur PREMIÈRE consommation côté
  rendu (un son, là où rien n'existait).
- `render/components/button.ts` — `uiButton`, seul point d'entrée de TOUS les boutons habillés du
  jeu (menus, HUD, plein écran), joue `uiClick` juste avant d'invoquer son callback, au
  relâchement validé. Un seul hook couvre tout le jeu, même principe que `skinPressVisual` pour
  l'état enfoncé (ADR-035).

**Mute** : `Profile.muted: boolean`, persisté (migration dans `meta/save.ts`, défaut `false`).
`ProfileService.isMuted()`/`toggleMuted()`. Piloté via `scene.sound.mute` — le `SoundManager`
Phaser est une INSTANCE UNIQUE partagée par toutes les scènes d'un même `Phaser.Game` (`MenuScene`
et `GameScene` tournent dans le même jeu, ADR-006) : appliquer l'état une fois au `create()` de
chaque scène suffit à couvrir tout le jeu, pas la peine de le resynchroniser entre écrans.

**Bouton mute** : dans le bandeau du Campement (`MenuScene.buildMasthead`), à gauche du bouton
plein écran. Icône `EMBLEM.sound` — la note de musique du pack Tiny Swords (`icon-12.png`),
repérée dans la réserve déjà versionnée (ADR-032/README) en ouvrant les 10 icônes non encore
câblées. État « éteint » rendu par ALPHA réduit sur le bouton entier (0,4), jamais par teinte —
un emblème raster arrive avec ses propres couleurs (ADR-031). `uiButton` ne renvoie pas la
référence de l'icône interne créée : le bouton est DÉTRUIT et RECONSTRUIT à chaque bascule
plutôt que mis à jour en place (même limite déjà vécue par `fsBtn`, qui se resynchronise via un
`scene.restart()` au resize — ici la reconstruction est déclenchée directement au clic).

## Conséquences

- `assets.integrity.test.ts` ne reconnaissait que `png|svg|json` dans son repérage des fichiers
  cités par le code — un fichier `.ogg` manquant ou mal orthographié n'aurait cassé aucun test.
  Regex étendue à `|ogg` : le filet couvre désormais la nouvelle catégorie d'assets, pas
  seulement les images.
- `render/audio.test.ts` (miroir de `sprites.test.ts`) garantit que chaque tour de `CONTENT` a un
  tir SFX mappé — ajouter une tour sans son casse ce test plutôt que de jouer un son incorrect au
  hasard en jeu.
- La musique de fond (ambiance menu/run en boucle) reste un chantier séparé : aucune source CC0
  Kenney ne la couvre, il faudra une recherche dédiée (autre fournisseur CC0, ou attente d'un
  pack Kenney qui en proposerait une) avant de pouvoir l'implémenter — même démarche itérative
  que le skin (plusieurs essais avant ADR-016).

## Alternatives écartées

- **Sons synthétisés en code (Web Audio, façon skin médiéval maison)** : évite toute dépendance
  externe, mais rend le jeu moins fini qu'avec de vrais SFX Kenney déjà cohérents avec le reste du
  pack UI (`kenney-ui`) et le pack Tiny Swords. Écarté au profit d'assets réels, cohérent avec le
  reste de `public/assets/`.
- **Musique de fond via les jingles Kenney (`Music Jingles`)** : ce sont des stingers de quelques
  secondes (8-bit/sax/pizzicato), pas des boucles d'ambiance — jouer un jingle en boucle
  produirait une répétition audible et un ton décalé (comique/rétro) pour un TD médiéval sombre.
  Reporté plutôt que bricolé.
- **Étendre `UiButton` pour renvoyer la référence de l'icône interne**, afin de basculer l'alpha du
  bouton mute en place plutôt que de le détruire/reconstruire : change l'API partagée par TOUS les
  appelants de `uiButton` pour un seul cas d'usage. La reconstruction (déjà le seul moyen dont
  dispose `fsBtn` de refléter l'état plein écran) est le changement minimal.
