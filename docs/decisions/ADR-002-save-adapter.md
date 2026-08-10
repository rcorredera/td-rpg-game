# ADR-002 — Persistence derrière une interface SaveAdapter

**Statut** : accepté — 2026-06-10

## Contexte
La v0 est offline (localStorage), mais un cloud save est probable dès que la méta prend de la valeur pour le joueur.

## Décision
Le profil (Éclats, unlocks) est lu/écrit via l'interface `SaveAdapter` (`meta/save.ts`). Implémentation v0 : `LocalStorageSaveAdapter`, avec validation du JSON et fallback sur profil neuf en cas de corruption.

## Conséquences
+ Le swap localStorage → API cloud ne touche qu'un fichier.
+ Le reste du code ignore le mécanisme de stockage.
- Versionner le schéma de sauvegarde (clé `tdrpg_profile_v1`) dès maintenant ; prévoir des migrations à partir de la v1.
