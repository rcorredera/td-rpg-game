# ADR-008 — Preview GitHub Pages par PR (branche `gh-pages`)

## Statut
Accepté (2026-08-10). Supersède les points 2 et 3 d'ADR-006 (mode Pages).

## Contexte
ADR-006 déployait uniquement `main` via le mode Pages "GitHub Actions"
(`actions/upload-pages-artifact` + `actions/deploy-pages@v4`). Romain veut, comme les Review Apps
GitLab, valider **fonctionnellement** le contenu de chaque PR avant de merger, pas juste lire le
diff — sans dépendre d'un compte tiers (Netlify/Cloudflare). Le mode Pages "GitHub Actions" ne sert
qu'un seul déploiement par repo ; impossible d'y superposer une preview par PR. Seul le mode Pages
**branche** (`gh-pages`, servie en sous-dossiers) le permet.

## Décision
1. **Bascule du mode Pages** : "GitHub Actions" → "Deploy from a branch" (`gh-pages`, racine `/`).
   `main` est publié à la racine (`/td-rpg-game/`), chaque PR ouverte dans son sous-dossier
   (`/td-rpg-game/pr-<numéro>/`).
2. **`vite.config.ts` inchangé** — le `base` de build est surchargé par CI via le flag CLI
   `vite build --base <chemin>` (calculé selon l'événement), pas par une variable d'environnement
   ou une branche de code supplémentaire dans la config.
3. **Publication via `peaceiris/actions-gh-pages@v3`**, avec `keep_files: true` **obligatoire** sur
   tout déploiement (main comme preview) : sans ça, chaque déploiement efface tout le reste de la
   branche `gh-pages` (donc les previews des autres PR encore ouvertes). Voir `.ai/pitfalls.md`.
4. **Nettoyage à la fermeture** : job dédié (`cleanup-preview`, sur `pull_request` fermée) supprime
   le sous-dossier `pr-<numéro>/` par un commit direct sur `gh-pages` (pas besoin de `peaceiris`
   pour une suppression).
5. **Lien de preview commenté sur la PR** (`marocchino/sticky-pull-request-comment@v2`, un seul
   commentaire mis à jour à chaque repush) — évite d'avoir à reconstruire l'URL à la main.
6. **`contents: write`** limité aux jobs de déploiement/nettoyage (le job `build`/tests garde
   `contents: read`). `concurrency: gh-pages-deploy` sur ces jobs sérialise les push vers la branche.

## Conséquences
- `gh-pages` doit exister avant la bascule des Settings Pages : `peaceiris/actions-gh-pages` la crée
  automatiquement au premier déploiement (`main`) — donc l'ordre est : merge → premier push `main`
  déploie → *puis* bascule Settings → Pages.
- Le premier `gh api -X PUT .../pages` de bascule est fait une fois manuellement (confirmé en
  session), comme la bascule inverse faite pour ADR-006.
- N'affecte pas `core/`/`meta/`/`render/` : changement d'infra pure, comme ADR-006.
- Risque de sécurité : `pull_request` (pas `pull_request_target`) — une PR de fork tourne avec un
  `GITHUB_TOKEN` forcé en lecture seule par GitHub, donc pas d'escalade possible même si le repo
  devient un jour multi-contributeurs.
