# ADR-053 — Révisions audio (PO) + centrage du texte sur le grand ruban

## Statut
Accepté (2026-08-19).

## Contexte

Après playtest par le PO de la fournée ADR-042, une série de retours ponctuels, tous corrigés
dans le même lot :

1. Plusieurs actions restaient silencieuses : ouverture de l'Histoire, entrée en niveau,
   construction/amélioration/spécialisation/vente d'une tour en run.
2. `shotCatapult` (Kenney, ADR-041) et `shotFrost` (`Ice Throw 1`, ADR-042) jugés inadaptés à
   l'oreille.
3. Les trois pouvoirs du héros (ralliement, tourbillon, sort de compte) étaient soit muets
   (ralliement/tourbillon) soit indifférenciés d'un simple impact de tour à zone (sort de
   compte, `explosion` générique → `impact`).
4. Ni victoire ni défaite n'avaient de SFX de fin de run.
5. Le libellé « Histoire » (grand ruban, ADR-035) paraissait décalé vers le haut sur sa bannière.

Le PO a fourni deux packs déjà téléchargés (400 Sounds Pack, Free Fantasy SFX Pack by TomMusic —
mêmes packs qu'ADR-042) pour couvrir 1-4 ; aucun nouveau pack sourcé.

## Décision

**Réemploi de SFX existants** (pas de fichier dédié demandé pour ces rôles) :
- `bestiaryOpen` (« map_open ») → aussi joué à l'ouverture de la tuile Histoire (`homeView.ts`).
- `chroniclesOpen` (« sword_slice ») → aussi joué à l'entrée en niveau (`storyView.ts`, sélection
  d'un chapitre débloqué).
- `purchase` (« coins_gather_quick ») → aussi joué à la construction, l'amélioration, la
  spécialisation ET la vente d'une tour en run (`slotMenu.ts`) — même geste qu'à l'Armurerie
  (dépenser/récupérer de l'or), silencieux par oubli plutôt que par choix.

**Fichiers remplacés** (`public/assets/audio/`, TomMusic — Free Fantasy SFX Pack) :
- `sfx-shot-catapult.ogg` : `impactWood_heavy_000` (Kenney) → `Rock Meteor Throw 1`.
- `sfx-shot-frost.ogg` : `Ice Throw 1` → `Ice Barrage 1`.

**Nouveaux rôles** (`render/audio.ts`) :
- `victory` (« brass_positive_long », 400 Sounds Pack) / `defeat` (« brass_defeated ») — joués
  dans `GameScene.endRun()` selon `run.phase`, catégorie `notifications` (fin de run, pas un
  dégât de gameplay).
- `heroWhirlwind` (« whoosh_1 ») / `heroRally` (« brass_chime_quick ») — joués dans
  `hudCallbacks` uniquement quand `castWhirlwind`/`castRally` réussissent réellement (même garde
  que l'effet visuel existant), catégorie `damage` (pouvoirs de combat).
- `accountSpell` (« Rock Meteor Swarm 1 ») — l'événement `explosion` de sim distingue désormais
  le sort de compte (`radius >= accountSpell.radius * 0.9`, seuil déjà utilisé pour l'effet
  visuel « arrows ») d'un impact de tour à zone ordinaire (`impact`, inchangé).

**Centrage du texte sur le grand ruban** (`render/components/tile.ts`) : mesure pixel par pixel
de `ribbons-big.png` (script jetable, scan de l'alpha par ligne) — l'encre opaque occupe les
lignes 20 à 122 d'une cellule de 128 (centre à 71), pas 0-128 (centre 64) : 20 px de marge
transparente au-dessus contre 6 en dessous. Un texte centré sur la CELLULE (comme le ruban y pose
sa propre image, origine 0.5/0.5) tombe donc mécaniquement au-dessus du centre visuel du bandeau.
`ribbons-small.png` (tuiles secondaires) est déjà centré à 2 px près — aucune correction là,
seule la variante `_BIG` (tuile PRINCIPALE, ADR-035) est décalée de `(71/128 − 0.5) × ribbonH`
vers le bas.

## Conséquences

- `audio.test.ts` : `notificationKeys` (test de garde-fou catégorie) gagne `victory`/`defeat`.
- `public/assets/README.md` : tableau détail audio mis à jour (19 SFX désormais, deux fichiers
  remplacés, réemplois annotés).
- Pas de nouveau pack sourcé : tout vient des deux packs déjà déclarés CC0/gratuits (ADR-041/042),
  aucune question de licence supplémentaire.

## Alternatives écartées

- **Un SFX dédié pour Histoire/entrée en niveau** plutôt qu'un réemploi : écarté, le PO n'a fourni
  aucun fichier candidat pour ces deux rôles précis — réutiliser un son déjà chargé évite d'ajouter
  un fichier de plus pour un gain marginal.
- **Corriger le centrage en reculant `RIBBON_TEXT_DY` empirique (± % de la taille de police)** :
  première tentative, écartée après mesure — la cause n'est pas la métrique de police (le petit
  ruban, même police, est déjà centré), mais l'asymétrie de la planche `_BIG` elle-même. Un
  correctif basé sur la police aurait été juste par coïncidence à une taille donnée et faux à une
  autre (redimensionnement d'écran, ADR-015).
