# ADR-005 — Couche de rendu swappable (retained-mode + registre de skin)

## Statut
Accepté (2026-06-12)

## Contexte
Le rendu v0 était du **programmer art** : entités et décor dessinés à la main en
`Phaser.Graphics`, redessinés chaque frame (immediate-mode), avec le look codé en dur
dans `GameScene`. Objectif : passer à un vrai pixel art (assets CC0 Kenney Tiny) SANS
verrouiller le projet — une **couche payante** (Tiny Swords, peinture, commande d'artiste)
doit pouvoir être branchée plus tard, quand le gameplay et le lore seront rodés, sans
réécrire le rendu. La sim reste intouchée (ADR-001).

## Décision
1. **Retained-mode** : un `Phaser.Sprite` persistant par entité, synchronisé chaque frame
   par diff de clé (`uid` pour les ennemis, `slotIndex` pour les tours). Voir
   `render/EntityLayer.ts` (`SpriteLayer<T>`). Remplace les boucles `g.clear()` + redessin.
   Bénéfices : vraies textures, batch GPU, fin du pitfall « Graphics redessiné chaque frame ».
2. **Registre de skin unique** : `render/sprites.ts` (données pures, zéro Phaser) associe
   chaque entité logique (defId d'ennemi/tour, héros, tuile) à une frame de planche
   (`SpriteRef { sheet, frame, tint?, scale? }`). **C'est le seul fichier à éditer pour
   changer d'assets.** Un test (`sprites.test.ts`) garantit que tout `defId` de `CONTENT`
   est mappé (ajouter un monstre sans sprite casse le test).
3. **Assets** : `render/assets.ts` précharge les planches Tiny (16×16, grille 12×11,
   frame = `row*12 + col`). Base CC0 stricte : Kenney Tiny Dungeon (créatures, héros) +
   Tiny Town (tuiles, bâtiments, objets). Tours composées (socle de pierre + emblème),
   trou connu des packs gratuits ; boss = scale+tint d'une frame existante (ADR-004).
4. **Découpage des responsabilités** : les sprites portent le corps des entités ; un
   `Graphics` overlay (depth 900, sous le HUD) garde ce qui n'est pas de l'art — barres de
   PV, anneaux de statut (gel/brûlure), portées à la sélection, anneau de ralliement, aura,
   vortex de portail, FX. Palette centralisée dans `render/theme.ts`.
5. **Pixel art** : `pixelArt: true` (filtre NEAREST) dans `main.ts` ; échelles entières.

## Validation (skin swap réel, 2026-06-12)
Le skin a été basculé de **pixel art médiéval (Kenney Tiny)** vers **cartoon militaire/sci-fi
(Kenney Tower Defense top-down)** en éditant uniquement `sprites.ts` + `assets.ts` + les échelles
de placement dans `GameScene` (+ wording dans `content/index.ts`). **La sim et la logique de
`EntityLayer` n'ont pas changé.** Le médiéval avait dû *composer* ses tours (trou des packs gratuits) ;
le pack TD fournit de vraies tourelles, tanks, avions, tuiles route et explosions — cohérent, mono-artiste.
Skin actif = **Kenney TD** (`assets/kenney-td/sheet.png`, tuiles 64×64, 23 colonnes, `pixelArt:false`).
Les planches Tiny restent dans le repo comme skin alternatif.

## Conséquences
- Reskin/couche payante = éditer `sprites.ts` (+ `assets.ts` pour charger les planches),
  sans toucher `GameScene`/`MenuScene` ni la sim.
- Profondeur d'affichage = position Y de l'entité (tri haut/bas correct en top-down).
- Animations de frames : Tiny est quasi statique ; le « juice » (bob de marche, lunge de
  combat, flip, mort) est appliqué sur la transform du sprite via l'horloge murale —
  cosmétique, jamais dans la sim (déterminisme ADR-001 préservé).
- Interaction HiDPI : le framebuffer est déjà à `DPR×` (zoom caméra `DPR`) ; `DPR` reste
  entier (`Math.round`, ≤2) pour rester compatible avec le pixel art (cf `.ai/pitfalls`).
