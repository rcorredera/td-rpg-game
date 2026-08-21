# Décisions d'architecture (ADR)

Une décision structurante = un fichier, jamais un amendement dans un ancien. Un ADR est un
document DATÉ : on ne le réécrit pas quand le code bouge — on en écrit un nouveau qui le
remplace, et on le dit ici. Format : Contexte, Décision, Conséquences, Alternatives écartées.

Cet index est généré depuis les titres des fichiers : à chaque nouvel ADR, ajouter sa ligne.

| # | Décision | Fichier |
|---|---|---|
| 001 | Séparation simulation (core) / rendu (Phaser) | [`ADR-001-core-render-separation.md`](ADR-001-core-render-separation.md) |
| 002 | Persistence derrière une interface SaveAdapter | [`ADR-002-save-adapter.md`](ADR-002-save-adapter.md) |
| 003 | Équilibrage en données pures (content pack) | [`ADR-003-content-as-data.md`](ADR-003-content-as-data.md) |
| 004 | Chapitres comme contenu, cartes multi-chemins | [`ADR-004-chapters-and-paths.md`](ADR-004-chapters-and-paths.md) |
| 005 | Couche de rendu swappable (retained-mode + registre de skin) | [`ADR-005-render-skin.md`](ADR-005-render-skin.md) |
| 006 | CI GitHub Actions + hébergement GitHub Pages | [`ADR-006-ci-github-pages.md`](ADR-006-ci-github-pages.md) |
| 007 | Registre de composants UI (`render/components/`) | [`ADR-007-ui-component-kit.md`](ADR-007-ui-component-kit.md) |
| 008 | Preview GitHub Pages par PR (branche `gh-pages`) | [`ADR-008-pr-preview-pages.md`](ADR-008-pr-preview-pages.md) |
| 009 | RENDER_SCALE : framebuffer ajusté à l'affichage réel (fin du flou Scale.FIT) | [`ADR-009-render-scale-fit.md`](ADR-009-render-scale-fit.md) |
| 010 | Viewport adaptatif : le jeu remplit l'écran (socle mobile) | [`ADR-010-adaptive-viewport.md`](ADR-010-adaptive-viewport.md) |
| 011 | Cibles tactiles garanties par les composants | [`ADR-011-touch-targets.md`](ADR-011-touch-targets.md) |
| 012 | Registre d'icônes d'UI (fin des emoji système) | [`ADR-012-ui-icon-registry.md`](ADR-012-ui-icon-registry.md) |
| 013 | Grille de niveaux et listes défilantes | [`ADR-013-grid-and-scroll.md`](ADR-013-grid-and-scroll.md) |
| 014 | Fonds générés sur canvas et harmonisation du terrain | [`ADR-014-generated-backdrops.md`](ADR-014-generated-backdrops.md) |
| 015 | Échelle typographique réelle, plein écran, et bornes de pointeur au resize | [`ADR-015-readable-typography.md`](ADR-015-readable-typography.md) |
| 016 | Skin médiéval maison (maquette) | [`ADR-016-medieval-skin.md`](ADR-016-medieval-skin.md) |
| 017 | Animation procédurale des unités et paliers visuels de tour | [`ADR-017-procedural-animation-tiers.md`](ADR-017-procedural-animation-tiers.md) |
| 018 | Banc d'essai d'équilibrage headless | [`ADR-018-balance-workbench.md`](ADR-018-balance-workbench.md) |
| 019 | Le tracé visuel ne ment pas sur la position logique | [`ADR-019-path-render-truth.md`](ADR-019-path-render-truth.md) |
| 020 | Faire du choix de tour une décision | [`ADR-020-tower-roles.md`](ADR-020-tower-roles.md) |
| 021 | Remettre la méta-progression sous tension | [`ADR-021-meta-economy.md`](ADR-021-meta-economy.md) |
| 022 | Un bestiaire qui pose des questions | [`ADR-022-bestiary.md`](ADR-022-bestiary.md) |
| 023 | Le décor d'un chapitre doit dire son nom | [`ADR-023-chapter-biomes.md`](ADR-023-chapter-biomes.md) |
| 024 | Abattre le boss, et débloquer des paliers plutôt que des tours | [`ADR-024-boss-kill-and-tower-tiers.md`](ADR-024-boss-kill-and-tower-tiers.md) |
| 025 | Des menus qui occupent l'écran | [`ADR-025-mobile-menu-layout.md`](ADR-025-mobile-menu-layout.md) |
| 026 | L'habillage des menus devient une donnée | [`ADR-026-ui-theme.md`](ADR-026-ui-theme.md) |
| 027 | Champ de bataille en 960×540 (16:9) et une carte propre par chapitre | [`ADR-027-battlefield-960x540-et-cartes-par-chapitre.md`](ADR-027-battlefield-960x540-et-cartes-par-chapitre.md) |
| 028 | Les cartes doivent rester jouables sous le HUD mobile | [`ADR-028-lisibilite-cartes-hud-mobile.md`](ADR-028-lisibilite-cartes-hud-mobile.md) |
| 029 | Une pièce étirée est constante, une tuile remplit sa boîte | [`ADR-029-tuiles-remplissage-et-etirement.md`](ADR-029-tuiles-remplissage-et-etirement.md) |
| 030 | L'habillage des panneaux vient du pack, pas d'une teinte | [`ADR-030-panneau-ouvrage-du-pack.md`](ADR-030-panneau-ouvrage-du-pack.md) |
| 031 | Les titres de tuile portent un ruban du pack | [`ADR-031-rubans-de-titre.md`](ADR-031-rubans-de-titre.md) |
| 032 | État enfoncé des boutons, affordance de défilement, et le reste du registre d'icônes | [`ADR-032-etat-enfonce-et-affordance-de-defilement.md`](ADR-032-etat-enfonce-et-affordance-de-defilement.md) |
| 033 | Typage explicite obligatoire + ESLint | [`ADR-033-typage-explicite-et-lint.md`](ADR-033-typage-explicite-et-lint.md) |
| 034 | Découpage de GameScene et MenuScene en modules | [`ADR-034-decoupage-gamescene-menuscene.md`](ADR-034-decoupage-gamescene-menuscene.md) |
| 035 | Point d'entrée unique pour l'état enfoncé des boutons habillés | [`ADR-035-push-unique-des-boutons-habilles.md`](ADR-035-push-unique-des-boutons-habilles.md) |
| 036 | Grande planche de ruban pour la tuile principale, mesure non carrée | [`ADR-036-grande-planche-de-ruban-tuile-principale.md`](ADR-036-grande-planche-de-ruban-tuile-principale.md) |
| 037 | Système audio : SFX, registre et mute persisté | [`ADR-037-systeme-audio-sfx.md`](ADR-037-systeme-audio-sfx.md) |
| 038 | Réglages audio : catégories, master, volume | [`ADR-038-reglages-audio-categories.md`](ADR-038-reglages-audio-categories.md) |
| 039 | Musique de menu (boucle fabriquée par montage) | [`ADR-039-musique-de-menu.md`](ADR-039-musique-de-menu.md) |
| 040 | SFX de combat : RPG Sound Pack (CC0) plutôt que Kenney | [`ADR-040-sfx-combat-rpg-sound-pack.md`](ADR-040-sfx-combat-rpg-sound-pack.md) |
| 041 | Retouches audio après playtest (catapulte, volume musique, licence) | [`ADR-041-retouches-playtest-audio.md`](ADR-041-retouches-playtest-audio.md) |
| 042 | SFX de navigation + combat fournis par le PO | [`ADR-042-sfx-navigation-et-combat-po.md`](ADR-042-sfx-navigation-et-combat-po.md) |
| 043 | Bestiaire élargi avec des sprites CraftPix | [`ADR-043-bestiaire-craftpix.md`](ADR-043-bestiaire-craftpix.md) |
| 044 | Bestiaire terrestre entièrement CraftPix | [`ADR-044-bestiaire-craftpix-round-2.md`](ADR-044-bestiaire-craftpix-round-2.md) |
| 045 | Créatures volantes : illustrations générées par IA | [`ADR-045-volants-ia.md`](ADR-045-volants-ia.md) |
| 046 | Proportions natives des sprites préservées (`fitSquare`) | [`ADR-046-proportions-sprites.md`](ADR-046-proportions-sprites.md) |
| 047 | Tours générées par IA, spécialisations à sprite dédié, barres de vie recalées | [`ADR-047-tours-ia-et-barres-de-vie.md`](ADR-047-tours-ia-et-barres-de-vie.md) |
| 048 | Blizzard buffé et animé, spécialisations de givre à sprite dédié | [`ADR-048-blizzard-buff-et-specs-givre.md`](ADR-048-blizzard-buff-et-specs-givre.md) |
| 049 | Deuxième acte (ch.11-20) : bestiaire, sourcing et redéfinition du capstone | [`ADR-049-deuxieme-acte-bestiaire.md`](ADR-049-deuxieme-acte-bestiaire.md) |
| 050 | Boss du ch.20 et remplacement du ch.11 (images IA du joueur) | [`ADR-050-boss-ch20-et-gelee-enragee.md`](ADR-050-boss-ch20-et-gelee-enragee.md) |
| 051 | Livraison des chapitres 11-20 et du boss final | [`ADR-051-chapitres-11-20-et-boss-final.md`](ADR-051-chapitres-11-20-et-boss-final.md) |
| 052 | L'or in-run devient un budget, et les 3 étoiles un seuil | [`ADR-052-or-budgete-et-seuil-3-etoiles.md`](ADR-052-or-budgete-et-seuil-3-etoiles.md) |
| 053 | Révisions audio (PO) + centrage du texte sur le grand ruban | [`ADR-053-revisions-audio-et-centrage-ruban.md`](ADR-053-revisions-audio-et-centrage-ruban.md) |
| 054 | Impact dédié à la tour de givre (`explosion` porte sa tour) | [`ADR-054-impact-dedie-tour-de-givre.md`](ADR-054-impact-dedie-tour-de-givre.md) |
| 055 | `render/` découpé en sous-dossiers par couche | [`ADR-055-decoupage-render-en-sous-dossiers.md`](ADR-055-decoupage-render-en-sous-dossiers.md) |
| 056 | `npm run lint` remis au vert et câblé en CI | [`ADR-056-lint-en-ci.md`](ADR-056-lint-en-ci.md) |
| 057 | `content/` découpé par nature de donnée | [`ADR-057-decoupage-du-content.md`](ADR-057-decoupage-du-content.md) |
| 058 | `stepOnce` découpé en phases nommées | [`ADR-058-stepOnce-en-phases-nommees.md`](ADR-058-stepOnce-en-phases-nommees.md) |
| 059 | Le profil est une donnée NON FIABLE, bornée à l'entrée de la simulation | [`ADR-059-profil-donnee-non-fiable.md`](ADR-059-profil-donnee-non-fiable.md) |
| 060 | Plafond du pool de mélange des vagues (`default`) | [`ADR-060-plafond-du-melange-de-vague.md`](ADR-060-plafond-du-melange-de-vague.md) |
| 061 | Refonte graphique : nommage par `defId` et chaîne de nettoyage des sprites | [`ADR-061-refonte-graphique-et-nommage-par-defid.md`](ADR-061-refonte-graphique-et-nommage-par-defid.md) |
| 062 | Décor semé sur le champ de bataille, reteint par biome | [`ADR-062-decor-seme-par-biome.md`](ADR-062-decor-seme-par-biome.md) |
| 063 | Détourage automatique, et la frange se juge par contraste | [`ADR-063-detourage-automatique-et-regle-de-frange.md`](ADR-063-detourage-automatique-et-regle-de-frange.md) |
| 064 | Les pieds restent au sol : animation par écrasement, pas par translation | [`ADR-064-les-pieds-restent-au-sol.md`](ADR-064-les-pieds-restent-au-sol.md) |
| 065 | Cycles de marche dessinés, générés en une image et calés sur une ligne de sol | [`ADR-065-cycles-de-marche-dessines.md`](ADR-065-cycles-de-marche-dessines.md) |
