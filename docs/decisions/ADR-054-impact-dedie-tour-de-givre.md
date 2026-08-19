# ADR-054 — Impact dédié à la tour de givre (`explosion` porte sa tour)

## Statut
Accepté (2026-08-19).

## Contexte

Retour PO après ADR-053 : le SFX joué quand une tour touche un ennemi est « bizarre » venant
d'une tour de givre — et c'est LE MÊME son que le tourbillon du héros, ce qui ajoute à la
confusion (deux sources de dégât totalement différentes, un seul son).

En creusant `sim.ts` : la tour de givre a `splashRadius: 70` (une nova, pas un tir ponctuel), donc
chaque coup émet un événement `explosion` — comme la catapulte, le tourbillon du héros
(`castWhirlwind`) et le sort de compte (`castAccountSpell`). Mais `explosion` ne portait aucune
information de SOURCE : `GameScene.consumeEvents` jouait `impact` (RPG Sound Pack, générique)
pour TOUTE explosion sauf celle assez grosse pour être le sort de compte (seuil de rayon déjà
utilisé pour l'effet visuel « arrows », ADR-042). Résultat : givre, catapulte ET tourbillon
partageaient un seul son générique — ni adapté au givre, ni distinct du tourbillon.

Le tourbillon a par ailleurs déjà son propre SFX (`heroWhirlwind`, ADR-053) joué au moment du
cast (`hudCallbacks.onWhirlwind`) — l'`explosion` qu'il émet en plus ne servait donc, côté son,
qu'à dupliquer un son déjà joué.

## Décision

**`SimEvent["explosion"]` gagne `towerDefId?: string` et `specId?: string | null`** (`core/types.ts`),
rempli par `sim.ts` au même site que l'event `shot` jumeau (`stepOnce`, une tour à zone émet
toujours les deux) — absent pour les explosions d'origine HÉROS (tourbillon, sort de compte), qui
n'ont pas de tour.

**`GameScene.consumeEvents`** distingue désormais trois cas sur `explosion` :
- `towerDefId` présent → `impactSfx(towerDefId)` (nouvelle fonction `render/audio.ts`, même
  discipline que `shotSfx` : `Record` par tour, défaut `impact` générique pour toute tour non
  listée — seule la tour de givre a une entrée, `impactFrost` / « Ice Freeze 1 », TomMusic).
- pas de `towerDefId`, rayon ≥ 90 % de celui du sort de compte → `accountSpell` (inchangé
  depuis ADR-053).
- pas de `towerDefId`, rayon plus petit (tourbillon) → **aucun SFX** : `heroWhirlwind` a déjà
  joué au cast, un second son ferait doublon.

## Conséquences

- La catapulte garde `impact` (générique) : aucun retour PO dessus, pas de raison de lui tailler
  une entrée dédiée pour l'instant — `IMPACT_BY_TOWER` n'a qu'une entrée, facile à étendre.
- `public/assets/README.md` : 20 SFX désormais (`sfx-impact-frost.ogg` ajouté).
- Aucun test cassé : `audio.test.ts` catégorise `impactFrost` en `damage` comme tout SFX de
  combat, déjà couvert par le test générique (pas d'entrée à y ajouter, contrairement à
  `victory`/`defeat` qui sont `notifications`).

## Alternatives écartées

- **Garder un son sur le tourbillon à l'impact aussi** (en plus du whoosh au cast) : écarté —
  aucune information supplémentaire pour le joueur (même geste, même instant), juste un doublon
  sonore agaçant sur un pouvoir à cooldown court.
- **Remplacer `impact` générique partout par un fichier plus qualitatif** : hors scope — seul le
  givre a été signalé « bizarre » par le PO, la catapulte n'a pas été mentionnée. Un remplacement
  large sans retour dessus serait une décision de goût non demandée.
