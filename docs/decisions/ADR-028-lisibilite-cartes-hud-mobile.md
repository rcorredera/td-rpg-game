# ADR-028 — Les cartes doivent rester jouables sous le HUD mobile

**Statut** : accepté · **Date** : 2026-08-12

## Contexte

Après ADR-027 (cartes uniques par chapitre), un audit UX dédié des 9 nouvelles cartes
a montré que les 3 invariants géométriques testés (écart de tracé, couverture de
slots, longueur des voies) valident la jouabilité **mécanique** — le jeu se joue —
mais pas la **lisibilité**. Aucun test ne protégeait contre :

- des emplacements de tour posés sous la zone que le HUD recouvre sur mobile
  (le HUD s'ancre aux bords RÉELS de l'écran, ADR-010, et son plancher tactile
  grimpe fort sur petit écran — `hudTop` mesuré entre 410 et 455 en unités
  logiques sur un panel de mobiles courants, contre 500 sur desktop) ;
- des dalles plantées dans la route (rien n'empêchait une distance de 0) ;
- des dalles qui se chevauchent entre elles ;
- le dernier emplacement de chaque carte posé dans le sprite du château.

Cas le plus grave : le ch.10 perdait un emplacement sur mobile réel — précisément
la configuration à 6 emplacements qu'ADR-024/ADR-027 avaient mesurée comme
**ingagnable même avec la méta complète**. La garantie « infranchissable sans la
Forge, franchissable avec » ne tenait donc que sur desktop.

## Décision

### Une zone jouable, pas seulement un champ de bataille

`PLAY_SAFE_BOTTOM = 400` (`render/viewport.ts`) : aucun waypoint ni aucun
emplacement de tour ne doit être posé sous cette limite (marge sous le pire
`hudTop` mesuré, ~410-455). `core/sim.ts`/`BATTLEFIELD` restent inchangés — ce
n'est pas une limite de simulation, seulement une convention d'auteur de carte,
vérifiée par test plutôt que documentée en commentaire.

### Quatre garanties nouvelles, testées (`balance/datasheet.test.ts`)

- Aucun waypoint sous `PLAY_SAFE_BOTTOM + 20`, aucun slot sous
  `PLAY_SAFE_BOTTOM − 32` (demi-hauteur de la dalle).
- Chaque slot à ≥ 55px de toute route (demi-largeur route 23 + demi-largeur
  dalle 32) — sous ce seuil la dalle mord visuellement la route.
- Deux slots à ≥ 75px l'un de l'autre — sous ce seuil leurs dalles de 64px se
  chevauchent à l'écran.
- Chaque slot à ≥ 94px du centre du sprite du château (rayons combinés château
  62 + dalle 32).

Les 9 cartes de l'ADR-027 ont été retouchées pour satisfaire ces quatre règles,
en plus des trois garanties déjà existantes.

### Le ch.10 recalibré après coup

Redessiner les emplacements du ch.10 pour la lisibilité a de nouveau fait
bouger l'équilibrage (déjà observé à l'ADR-027) : 7 emplacements bien répartis
sont redevenus insuffisants pour gagner même avec la méta complète tant que le
dernier n'était pas replacé assez PRÈS du tronc final (tout en restant hors du
sprite du château). `autoplay.test.ts` a servi de garde-fou à chaque itération.

## Conséquences

Toute nouvelle carte (ou retouche d'une carte existante) doit désormais
satisfaire 7 invariants testés au total, pas 3 — et si la carte touche un
chapitre à invariant de méta (ch.10), `autoplay.test.ts` doit être repassé
après toute retouche géométrique, pas seulement `path.test.ts`/`datasheet.test.ts`.

## Alternatives écartées

- **Rendre le HUD semi-transparent ou plus bas.** Aurait déplacé le problème
  (moins de recouvrement mais toujours un seuil variable selon l'écran) sans le
  supprimer, et c'est un changement d'UI globale hors du périmètre d'une passe
  de contenu.
- **Tester `hudTop` dynamiquement par appareil.** Le content est statique et
  partagé par tous les appareils ; une limite fixe, dérivée du pire cas mesuré,
  est plus simple et suffisamment sûre qu'un calcul par écran au chargement.
