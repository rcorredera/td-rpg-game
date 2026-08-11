# Bastion — TD/RPG médiéval (prototype v0)

Tower defense + méta-progression RPG, en TypeScript strict + Phaser 3 + Vite.

**Jouer en ligne** : https://rcorredera.github.io/td-rpg-game/ (déployé automatiquement depuis `main`)

## Développement

```bash
npm install
npm run dev     # serveur de dev
npm test        # tests (core + meta)
npm run build   # typecheck + build de prod
npm run balance # banc d'essai d'équilibrage, sans navigateur (ADR-018)
```

## Documentation

Le contexte projet, l'architecture, le game design et les décisions structurantes vivent dans
[`CLAUDE.md`](CLAUDE.md), [`docs/`](docs/) et [`.ai/`](.ai/) — à lire avant toute contribution.
