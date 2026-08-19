# ADR-049 — Deuxième acte (ch.11-20) : bestiaire, sourcing et redéfinition du capstone

## Statut
Accepté (2026-08-19), en cours d'implémentation (cette PR : bestiaire uniquement).

## Contexte
Le joueur veut prolonger l'Histoire de 10 chapitres (11-20) plutôt que de développer les
Failles infinies déjà spécifiées mais non implémentées dans le GDD (§ Failles infinies,
mode procédural séparé). Décision explicite du joueur, contre l'intention de design
d'origine du GDD — assumé, pas un oubli.

Point vérifié avant de commencer (contredit l'hypothèse initiale du joueur) : les 14
créatures actuelles du bestiaire sont TOUTES déjà utilisées dans les vagues des
chapitres 1-10 — vérifié en simulant `makeWaves` sur toute la campagne, pas seulement en
lisant `CONTENT.enemies`. Il n'y a pas de monstre mort dans le code d'aujourd'hui.

Ce que le joueur avait en tête : les variantes CraftPix jamais intégrées lors du tri
initial. Sur les 20 variantes des deux packs (`craftpix-341189`, `craftpix-437811`),
**11 sont déjà consommées** — 5 par ADR-043 (scorpion, troll, spectre, ogre, chevalier
noir) et **6 de plus par ADR-044** (rat, gobelin, orc, brute, golem, chef de guerre) que
le premier passage de tri de cette session avait raté en ne vérifiant que ADR-043. Trois
sprites détourés par erreur (doublons visuels avec orc/chef de guerre/rat) ont dû être
supprimés et remplacés une fois l'erreur détectée — toujours croiser les DEUX ADR de tri
avant de considérer une variante "libre", pas seulement le premier.

Il ne reste donc que **9 variantes réellement inédites** (sur 20), pas 15 comme
initialement estimé : pack1 {2, 7} + pack2 {1, 3, 4, 6, 8, 10}. Une dixième variante
(pack1 v6) a été écartée du thème médiéval à l'origine (arme à feu réaliste) puis
récupérée en la reconvertissant narrativement en arme "tombée d'une Faille" plutôt que
de rester perdue — cohérent avec le lore déjà établi (portails, corruption).

## Décision
- **9 nouvelles créatures** ajoutées à `CONTENT.enemies`, une par chapitre 11 à 19 (voir
  tableau GDD § Bestiaire) : Lutin des Tourbières, Gardien des Ombres, Gardien à Quatre
  Yeux, Ermite Corrompu, Piqueur Écarlate, Ossements Hurlants, Pillard des Frontières,
  Maraudeur des Failles, Assassin Voilé. Sprites rognés depuis les PNG CraftPix bruts
  (déjà un vrai canal alpha, contrairement aux images IA — pas de détourage nécessaire,
  juste un rognage des marges transparentes) sous `public/assets/skin-craftpix/`.
- **Le boss dédié du ch.20 n'a PAS de sprite dans cette PR** : les 20 variantes CraftPix
  sont maintenant intégralement consommées (11 + 9). Contrairement à ch.1-10 où chaque
  boss (Chef de guerre, Vouivre) a sa silhouette propre jamais réutilisée en trash, le
  ch.20 attend une image générée par le joueur (même pipeline que le héros et les tours,
  ADR-045/047) avant de pouvoir exister en tant qu'`EnemyDef`.
- **Redéfinition du capstone narratif** (décision du joueur, pas encore implémentée dans
  le code — cette PR ne touche ni `makeWaves` ni `CONTENT.chapters`) : le chapitre 10
  (Roi-Charogne) devient un boss INTERMÉDIAIRE, le chapitre 20 devient le vrai boss
  final. Techniquement, aucun changement de logique n'est requis pour les invariants
  ADR-024 et le déblocage des Failles infinies : les deux sont déjà calculés
  dynamiquement sur `CONTENT.chapters.length - 1`, donc ils se déplaceront tout seuls
  sur ch.20 dès qu'il existera. Le travail restant est l'équilibrage (re-valider le
  triplet d'invariants une fois ch.20 conçu) et la doc (GDD §Bestiaire déjà mis à jour
  pour refléter "boss intermédiaire" ch.10 ; `docs/ARCHITECTURE.md`/ADR-004 à revoir
  quand les chapitres eux-mêmes existeront).
- Cette PR livre UNIQUEMENT le bestiaire (`CONTENT.enemies` + sprites + wiring
  `assets.ts`/`sprites.ts`). Aucun chapitre 11-20 n'existe encore : les 9 créatures
  n'apparaissent dans aucune vague, `sim.test.ts`/`autoplay.test.ts` ne les voient donc
  pas encore. Suite du chantier découpée en PRs séparées (cartes, refonte `makeWaves`,
  équilibrage, menu de sélection à 20 tuiles) — voir le plan de session.

## Conséquences
- Le bestiaire passe de 14 à 23 créatures ; `X/23 découverts` dans le menu tant que
  ch.11-19 ne sont pas jouables (elles resteront non-découvertes jusque-là).
- `render/sprites.ts` reste le point de swap unique (ADR-005) : aucun changement
  structurel, seulement du contenu.
- Le joueur doit fournir une image pour "Le Fossoyeur" (boss ch.20) avant que la
  campagne puisse se conclure — bloquant identifié, pas contourné par un recyclage
  silencieux d'un sprite déjà utilisé (aurait cassé la promesse "un boss = une
  silhouette dédiée", déjà tenue par Chef de guerre/Vouivre).
- **Limite héritée d'ADR-043/044, toujours valable** : licence CraftPix "free" à
  vérifier avant publication publique — non tranchée ici.

## Alternatives écartées
- **Implémenter les Failles infinies à la place** — c'était l'intention de design
  d'origine du GDD, mais le joueur a explicitement tranché pour des chapitres scriptés,
  pour du contenu plus rapide à livrer.
- **Remixer les 14 monstres existants sans en créer de nouveaux** — écarté : le joueur
  voulait un vrai contenu supplémentaire, pas une simple repasse de difficulté.
- **Recycler un sprite déjà utilisé (teinte différente) pour le boss du ch.20**,
  plutôt que d'attendre une image dédiée — écarté : casserait la cohérence "un boss a
  toujours sa propre silhouette", déjà respectée par les 2 boss du premier acte.
