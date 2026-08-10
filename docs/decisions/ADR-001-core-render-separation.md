# ADR-001 — Séparation simulation (core) / rendu (Phaser)

**Statut** : accepté — 2026-06-10

## Contexte
Le jeu vise webapp + mobile (Capacitor), avec à terme un mode Failles compétitif où un calcul serveur autoritaire pourrait être nécessaire. Le code IA-généré doit être testable unitairement pour tenir la qualité.

## Décision
La logique de jeu vit dans `src/core/` : simulation déterministe à pas de temps fixe (1/60s), sans aucune dépendance Phaser/DOM. Le rendu interagit uniquement via des fonctions-commandes et lit l'état. La sim communique les effets visuels via des `SimEvent`.

## Conséquences
+ Tests unitaires du gameplay sans navigateur (Vitest).
+ Vitesse x2 = plus de ticks, simulation strictement identique.
+ Portabilité serveur future sans refacto.
- Légère verbosité : le rendu ne peut pas "tricher" en mutant l'état.
