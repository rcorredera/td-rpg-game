# ADR-003 — Équilibrage en données pures (content pack)

**Statut** : accepté — 2026-06-10

## Contexte
Un TD/RPG vit et meurt par son équilibrage, qui demande des dizaines d'itérations. Si les stats sont éparpillées dans le code, chaque ajustement est risqué et illisible — y compris pour une IA qui assiste l'équilibrage.

## Décision
Toutes les valeurs (tours, ennemis, vagues, héros, map, formules de scaling, unlocks) vivent dans `src/content/index.ts`, typées `ContentPack`. Interdiction de stat en dur dans `core/` et `render/`.

## Conséquences
+ Rééquilibrer = un seul fichier, diff lisibles.
+ Prépare l'extraction en JSON externe (mods, équilibrage à chaud, A/B) si besoin en v1+.
- Discipline à tenir en revue de code : c'est un critère de done.
