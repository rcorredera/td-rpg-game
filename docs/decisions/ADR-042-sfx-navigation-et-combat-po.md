# ADR-042 — SFX de navigation + combat fournis par le PO

## Statut
Accepté (2026-08-19).

## Contexte

Le PO a téléchargé deux packs et listé lui-même le rôle de chaque fichier plutôt que de me
laisser fouiller des packs déjà sourcés (cf. fiche besoin retirée d'`.ai/context.md`, ADR-041) :

- **400 Sounds Pack** (itch.io, gratuit — déclaré CC0 par le PO) : `item_equip`, `map_open`,
  `coins_gather_quick`, `sword_slice`.
- **Free Fantasy SFX Pack by TomMusic** (tommusic.itch.io, gratuit) : `Ice Throw 1`,
  `Fireball 1`, `Bow Attack 1`/`2`, `Sword Attack 1`.

Deux catégories de besoin distinctes :
1. **Navigation/économie** : le clic UI générique et 3 sons contextuels qui n'existaient pas
   encore (ouverture Bestiaire, ouverture Chroniques, confirmation d'achat).
2. **Combat, avec un axe qu'aucun SFX ne portait jusqu'ici** : le tir de base d'une tour doit
   sonner différemment une fois SPÉCIALISÉE (niv.4) — jusqu'ici `shotSfx` ne connaissait que
   `towerDefId`, aveugle à la spécialisation active.

## Décision

**SFX de navigation** (`render/audio.ts`, catégorie `notifications` — ADR-038) :
- `uiClick` (`sfx-ui-click.ogg`) — contenu remplacé par `item_equip.wav` (tous les boutons du
  jeu, via `uiButton`, inchangé depuis ADR-040/041 pour le point de branchement).
- `purchase` (`sfx-purchase.ogg`, `coins_gather_quick.wav`) — joué en plus du clic, uniquement
  quand l'achat RÉUSSIT (`ctx.profileSvc.buyX(...)` retourne `true`), dans les 3 rangées
  d'Armurerie (`shopView.ts` : Arsenal/Forge/Héros).
- `bestiaryOpen` (`sfx-bestiary-open.ogg`, `map_open.wav`) et `chroniclesOpen`
  (`sfx-chronicles-open.ogg`, `sword_slice.wav`) — joués UNIQUEMENT à l'ouverture de ces deux
  tuiles depuis le Campement (`homeView.ts`, nouveau champ `sfx?: SfxKey` par entrée). Les 3
  autres tuiles (Histoire, Failles, Armurerie) restent silencieuses à ce stade — révisé par
  ADR-053 (réemploi de ces mêmes rôles pour Histoire et l'entrée en niveau).

**SFX de combat, avec variantes selon spécialisation** (catégorie `damage`) :
- `shotArcher`/`shotArcherSpec` (`Bow Attack 1`/`2`) — l'Archerie de base tire différemment
  d'une fois spécialisée (Salve `spec_volley` OU Arc long `spec_longbow`, peu importe laquelle :
  le PO n'a fourni qu'UNE variante « améliorée »).
- `shotFrost`/`shotFrostFire` (`Ice Throw 1`/`Fireball 1`) — la Tour de givre sonne glace par
  défaut, mais la spécialisation « Givre ardent » (`spec_frostfire`, gèle ET brûle) sonne feu :
  c'est elle que le PO désignait par « quand amélioré en tour de feu », il n'existe pas de
  4e tour dédiée au feu. L'autre spécialisation givre, « Blizzard » (`spec_blizzard`), n'émet
  jamais d'événement `shot` (aura continue, ne tire plus) — aucune entrée nécessaire.
- `heroAttack` (`Sword Attack 1`) — AUCUN événement de sim n'existe pour un coup d'épée du
  héros : le blocage mêlée est un DPS continu (`meleeDps * dt` par frame, `sim.ts`), pas une
  suite de coups discrets. Introduire un tel événement aurait changé le MODÈLE de combat du
  héros pour la seule raison de déclencher un son — hors de propos ici. À la place, le rendu
  (`GameScene.updateHeroAttackSfx`) impose sa propre cadence de swing (450 ms) tant que
  `run.hero.alive` ET qu'un ennemi est `blocked` : une approximation de présentation, pas un
  changement de `core/`.

**Plumbing nécessaire** : `SimEvent` (`type: "shot"`) gagne un champ `specId: string | null`,
rempli par `sim.ts` avec `spec?.id ?? null` (la spécialisation était déjà résolue localement à
l'émission, seule son exposition manquait). `shotSfx(towerDefId, specId?)` devient une fonction
par rôle (`Record<string, (specId) => SfxKey>`) plutôt qu'un simple dictionnaire — cohérent avec
la discipline « une entrée par tour » d'ADR-005/037, étendue pour couvrir la variante.

**Licences** : les deux packs sont déclarés gratuits/itch.io par le PO (cf. ADR-041 pour le
principe déjà accepté : le PO gère lui-même le sourcing, CC0/domaine public/IA). Documentés dans
`public/assets/README.md` sans mention CC-BY (aucun crédit demandé par les auteurs).

## Conséquences

- `SimEvent["shot"]` change de forme : tout code qui le construit en dur doit fournir `specId`
  (un seul site, `sim.ts` — vérifié, aucun autre constructeur dans le code ou les tests).
- `audio.test.ts` : le test qui vérifiait « tout SFX hors clic UI est catégorisé dégâts » est
  reformulé pour exclure aussi les 3 nouveaux rôles de navigation (`purchase`, `bestiaryOpen`,
  `chroniclesOpen`), qui sont légitimement `notifications`.
- Pas de changement de `src/content/` : le mapping spécialisation → SFX vit dans `render/audio.ts`
  (présentation), pas dans les définitions de tour (équilibrage) — même raisonnement qu'ADR-037
  pour le registre lui-même.

## Alternatives écartées

- **Ajouter un événement `heroSwing` discret à la sim** pour caler le son sur le VRAI rythme de
  combat : écarté — le modèle de dégâts continu du héros est une décision de gameplay
  existante (retenir la horde, pas compter les coups, ADR-021) ; le changer pour un son aurait
  inversé la dépendance (l'audio dictant le core).
- **Jouer `shotFrostFire` aussi pour `spec_blizzard`** : écarté, cette spécialisation ne tire
  jamais (`aura`, `continue` dans `sim.ts`) — `shotSfx` ne serait jamais appelé avec cet id.
