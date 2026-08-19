# ADR-047 — Tours générées par IA, spécialisations à sprite dédié, barres de vie recalées

## Statut
Accepté (2026-08-19)

## Contexte
Suite d'ADR-045/046 : le joueur a généré des illustrations pour les tours (même
pipeline — prompts fournis, détourage nécessaire). Deux défauts additionnels sont
apparus en cours de route :
1. Les 2 spécialisations de l'Archerie ("Arc long", "Salve") n'avaient jusqu'ici
   qu'une simple teinte (`specTint`) sur le sprite du palier 3 — le joueur a fourni
   des illustrations bien plus distinctes (arbalète à carreau unique vs double
   lance-carreaux) qui méritent leur propre silhouette.
2. Après ADR-046 (proportions natives), le joueur signale que la barre de PV de
   certaines créatures tombe EN PLEINE TÊTE plutôt qu'au-dessus.

## Décision

### Tours
- `tower_archer` : palier 1-2, palier 3, et ses 2 spécialisations passent en PNG
  généré par IA (`tower-archer-ai.png`, `tower-archer-3-ai.png`,
  `tower-archer-longbow-ai.png`, `tower-archer-volley-ai.png`).
- `tower_frost` : palier 1-2 passe en PNG IA (`tower-frost-ai.png`) ; palier 3 reste
  en SVG maison (pas encore fourni).
- `tower_catapult` reste entièrement en SVG maison (pas encore abordée).

### Spécialisations à sprite dédié (`TowerSkin.specSprite`)
`render/sprites.ts` gagne un champ `specSprite?: Record<string, SpriteRef>` sur
`TowerSkin`, prioritaire sur `specTint` dans `towerView()`. Une spécialisation dont
l'image est assez différente du palier de base (silhouette, pas juste une couleur)
passe par ce champ ; les autres continuent avec `specTint` (ex. `spec_greekfire`,
`spec_frostfire`, toujours de simples teintes faute d'illustration dédiée).

### Barres de vie recalées sur la hauteur réelle
`BattlefieldEntities` gagne une `Map<uid, number>` (`enemyTop`) qui mémorise, à
chaque `placeEnemy()`, le sommet RÉEL du sprite affiché cette frame — dérivé de
`origin.y × hauteur affichée`, pas de la taille logique (`size`, la valeur de
hiérarchie de menace utilisée pour le RAYON horizontal, elle, inchangée).
`drawEnemyOverlay()` relit cette valeur pour la barre de PV et la couronne de
mini-boss, au lieu d'estimer le sommet via `y - r`. Avec le SVG maison (toujours
carré 128×128), `size` et hauteur affichée coïncidaient ; depuis ADR-046, un sprite
importé rogné à sa silhouette peut avoir une hauteur affichée très différente de
`size` — d'où la dérive.

## Conséquences
- Le skin maison ne couvre plus que : Catapulte (2 paliers), palier 3 de la Tour de
  givre, Bastion, dalle, et les teintes de spécialisation sans sprite dédié.
- **Piège découvert et documenté (`.ai/pitfalls.md`)** : la passe de détourage des
  "poches enfermées" (ADR-045) est dangereuse sur une palette pâle/grise — elle a
  mangé de la pierre et un cristal sur la Tour de givre avant d'être désactivée pour
  cette image et remplacée par un ciblage à deux teintes précises (mesurées sur
  l'image) avec tolérance étroite.
- Toute future spécialisation avec une vraie illustration suit le même chemin
  (`specSprite`) sans retoucher `towerView()`.

## Alternatives écartées
- **Garder `specTint` pour les 2 spécialisations d'Archerie malgré les nouvelles
  images** — écarté : les illustrations sont assez distinctes (mécanisme complet
  différent, pas une variation de couleur) pour justifier leur propre sprite, la
  teinte aurait été un pis-aller.
- **Recalculer le sommet du sprite dans `drawEnemyOverlay` lui-même** (via une
  nouvelle lecture de texture) — écarté : l'overlay ne reçoit pas la référence au
  `Sprite`, dupliquer l'accès texture coûterait plus cher que mémoriser une valeur
  déjà calculée une fois par frame dans `placeEnemy`.
