# ADR-048 — Blizzard buffé et animé, spécialisations de givre à sprite dédié

## Statut
Accepté (2026-08-19)

## Contexte
Suite d'ADR-047. Deux illustrations IA supplémentaires (Givre ardent, Blizzard) sont
fournies pour les spécialisations de la Tour de givre, jusqu'ici en simple teinte
(`specTint`). Le joueur signale aussi, en testant Blizzard en jeu, que sa zone est
trop petite et que son aura n'a AUCUNE animation — un simple cercle fin statique
(`strokeCircle`, alpha 0.35) — malgré son nom de tempête continue. Il demande
ensuite d'y ajouter des dégâts, en plus du ralentissement.

## Décision

### Spécialisations à sprite dédié
`spec_frostfire` et `spec_blizzard` rejoignent `spec_longbow`/`spec_volley`
(ADR-047) dans `TowerSkin.specSprite` — sprites IA dédiés plutôt que la teinte
précédente.

### Blizzard : rayon relevé, dégâts ajoutés, aura animée
- Rayon : 170 → 200. À 170, l'aura ne couvrait guère plus que la portée d'une
  Archerie de base (130-160) alors que la tour renonce à tout tir pour ce rôle.
- Nouveau champ `TowerSpecDef.aura.dps` (optionnel, `core/types.ts`) : dégâts
  **plats** par seconde, armure normale appliquée — délibérément PAS en % des PV
  max, pour ne pas dupliquer le rôle de la brûlure (`burn`, qui ignore l'armure)
  déjà porté par Givre ardent. Fixé à 3.
- Les deux valeurs sont bornées par le garde-fou d'ADR-024
  (`autoplay.test.ts` — le chapitre 10 doit rester infranchissable sans la
  Forge, quelle que soit la stratégie) : une première passe (rayon 230, dps 6)
  le rendait franchissable et a été revue à la baisse.
- **Piège corrigé en cours de route** : appliquer l'armure au dégât d'un seul
  tick (`dps/60`) écrase le DoT à 25 % de sa valeur nominale dès la moindre
  armure, au lieu du taux par seconde attendu — détaillé dans
  `.ai/pitfalls.md`. Fix : réduire le TAUX par seconde une fois, puis
  `ignoreArmor: true` pour ne pas recompter l'armure sur le montant déjà réduit.
- Aura visuellement animée (`drawTowerOverlay`, `entities.ts`) : anneau qui
  respire (pulsation d'alpha/rayon), halo de fond, et des flocons qui orbitent
  au bord — même langage visuel que le statut "gelé" d'un ennemi, déjà animé
  plus haut dans le même fichier.

## Conséquences
- Le contenu ne perd rien du principe ADR-003 (équilibrage dans `content/`
  uniquement) : `radius`/`dps` restent des valeurs de contenu, l'animation
  reste 100 % côté rendu.
- Toute future aura à dégâts continus doit passer par le même schéma
  (réduction du taux par seconde, `ignoreArmor: true`) — le piège est documenté
  pour ne pas être redécouvert.

## Alternatives écartées
- **Dégâts en % des PV max comme la brûlure** — écarté : aurait rendu Blizzard
  et Givre ardent redondants (les deux « brûlent » un sac à PV), alors que le
  jeu vise des rôles clairement différenciés (ADR-022).
- **Garder le rayon/dps de la première passe (230/6)** — écarté : casse le
  garde-fou ADR-024 vérifié par `autoplay.test.ts`.
