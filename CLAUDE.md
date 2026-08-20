# Bastion — TD/RPG médiéval (prototype v0)

Jeu tower defense + méta-progression RPG. TypeScript strict + Phaser 3 + Vite, cible webapp puis mobile (Capacitor v1).

## Avant toute modification
1. Lire `docs/ARCHITECTURE.md` et `.ai/conventions.md`.
2. Pour tout gameplay/équilibrage : lire `docs/GDD.md`.
3. Choix structurant → nouvel ADR dans `docs/decisions/`.

## Règles non négociables
- `src/core/` ne doit JAMAIS importer Phaser ni toucher au DOM (ADR-001).
- Aucune valeur d'équilibrage en dur hors de `src/content/` (ADR-003).
- Le rendu ne mute jamais `RunState` directement : commandes de `core/sim.ts` uniquement.
- Tout sprite/tuile/emblème passe par `render/assets/sprites.ts` (registre de skin, point de swap unique — ADR-005). Pas de frame en dur dans `GameScene`/`MenuScene`.
- **Definition of Done : code + TESTS + doc à jour dans le MÊME livrable.** Concrètement, à chaque modification :
  - comportement de `core/` ou `meta/` → ses tests (`npm test` vert) ;
  - gameplay/équilibrage → `docs/GDD.md` ;
  - choix structurant → ADR dans `docs/decisions/` (+ `docs/ARCHITECTURE.md` si la structure bouge) ;
  - piège découvert → `.ai/pitfalls.md` ; état du projet qui évolue → `.ai/context.md`.
  - Détail complet : `.ai/conventions.md`. Un changement sans ses tests et sa doc n'est PAS terminé.

## Commandes
`npm run dev` (dev), `npm test` (tests core), `npm run build` (typecheck + build).

## Skills Claude (secure-dev-standards, game-ux)
Ces skills sont versionnés dans un repo dédié : [github.com/rcorredera/claude-skills](https://github.com/rcorredera/claude-skills) (privé), symlinkés dans `~/.claude/skills/` et resynchronisés automatiquement (`git pull`) à chaque lancement de Claude Code.
**Toute modification de leur contenu se fait dans ce repo** (localement + push, ou éditeur web GitHub) — jamais via l'UI Cowork/claude.ai, pour éviter toute divergence entre les deux copies (déjà arrivé une fois).
