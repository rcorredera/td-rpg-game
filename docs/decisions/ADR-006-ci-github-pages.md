# ADR-006 — CI GitHub Actions + hébergement GitHub Pages

## Statut
Accepté (2026-08-10)

## Contexte
Le projet est 100% front (Vite + Phaser, zéro backend), poussé sur `github.com/rcorredera/td-rpg-game`
avec `main` en branche par défaut, mais sans vérification automatique ni moyen simple de tester une
build depuis un lien partageable. Besoin : un pipeline qui fait tourner `npm test` + `npm run build`
à chaque push/PR, et publie automatiquement le prototype pour le tester en dehors du poste de dev.

## Décision
1. **Un seul workflow** (`.github/workflows/ci.yml`), pas deux séparés : job `build` (checkout,
   `npm ci`, `npm test`, `npm run build`) sur push (`main`) et pull request ; job `deploy` enchaîné
   uniquement sur push `main` et seulement si `build` passe, via `actions/deploy-pages@v4`.
   Choix assumé pour un projet solo/prototype — pas besoin de la séparation CI/déploiement d'une
   équipe avec plusieurs branches actives.
2. **GitHub Pages en mode project page** (`username.github.io/td-rpg-game/`, pas de domaine custom).
   Conséquence directe : `vite.config.ts` doit connaître son sous-chemin, donc `base: "/td-rpg-game/"`
   — sans ça les assets (JS, polices, sprites Kenney) se chargeraient depuis la racine du domaine et
   404 une fois déployés (fonctionne quand même en local car `npm run dev`/`preview` servent à la racine).
3. Le repo Pages doit être configuré côté GitHub (Settings → Pages → Source: GitHub Actions) — hors
   du code, à faire une fois manuellement.

## Conséquences
- Toute PR profite d'un feedback automatique tests+build avant merge.
- Un renommage du repo GitHub casse le déploiement (base path périmé) : penser à mettre à jour
  `vite.config.ts` en même temps qu'un renommage.
- Le lien de prototype public change de contenu à chaque push sur `main` — pas de versioning/rollback
  au-delà de ce que Git offre déjà (revert + repush).
- N'affecte pas `core/`/`meta/`/`render/` : changement d'infra pure, ADR-001 à 005 inchangés.
