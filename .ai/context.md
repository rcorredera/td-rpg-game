# Contexte produit

Prototype v0 d'un TD médiéval (« Bastion », univers du Roi-Charogne) avec méta-progression :
valider le fun de la boucle run → monnaies → unlocks → run plus fort.

## État actuel (2026-08)
- **Passe de qualité structurelle (ADR-055 à 059) — FAIT** : `render/` rangé par couche (ADR-055) ;
  `npm run lint` remis au vert et **câblé en CI** (ADR-056, il était rouge sur `main` sans que
  personne le voie) ; `content/index.ts` découpé de 970 à 228 lignes par nature de donnée
  (ADR-057 — `maps`/`waves`/`towers`/`enemies`) ; `stepOnce` découpé de 182 à 8 lignes en six
  phases nommées (ADR-058) ; et le **profil traité comme donnée non fiable** (ADR-059 — un
  `skills.rally: 99` venu de `localStorage` faisait planter la partie au premier tir de tour).
  Deux filets nouveaux : `content/integrity.test.ts` (tout identifiant cité désigne quelque chose,
  aucun id dupliqué) et `core/profileTrust.test.ts`. Les refactors de `content` et de `sim` ont
  été prouvés NEUTRES par comparaison de trace avant/après, elle-même validée par mutation.
- **Deuxième acte (ADR-049/050/051) — FAIT** : l'Histoire passe de 10 à **20 chapitres**. Le
  Roi-Charogne (ch.10) devient un boss INTERMÉDIAIRE, Le Roi Fangeux (ch.20) est le vrai boss
  final et conditionne le déblocage des Failles. Bestiaire porté à **24 créatures**, une nouvelle
  par chapitre du second acte.
- **Bestiaire illustré (ADR-043/044/045/046/047/048)** : sprites CraftPix pour les créatures,
  héros et volants générés, proportions calées par `fitSquare` (le plus grand côté sur la cible,
  jamais de déformation), barres de vie et IA de tours.
- **Audio — SFX + réglages + musique de menu en place (ADR-037/038/039/040/041/042)** : registre
  `render/platform/audio.ts` (même principe que `sprites.ts`/`icons.ts`), SFX branchés sur les `SimEvent`
  de tir/impact/dégât château + mort ennemi/héros (ces deux derniers n'avaient encore aucun
  consommateur côté rendu) et sur `uiButton` (clic UI, un seul hook pour tout le jeu). **Réglages
  (ADR-038)** : `Profile.audio` remplace le mute unique — 4 interrupteurs indépendants
  (Tout/Musique/Notifications/Dégâts) + volume par paliers de 10 %, dans une modale ouverte depuis
  le bouton son du bandeau (icône note de musique du pack Tiny Swords, `EMBLEM.sound`). **Musique
  de menu (ADR-039)** : piste fournie par le PO, transformée en boucle propre par montage ffmpeg
  (fondu enchaîné sur le point de raccord) ; joue uniquement au Campement, jamais en run ; volume
  baissé à 0.35 après playtest (ADR-041). Licence non confirmée mais jugée non bloquante par le
  PO — les prochains ajouts audio seront CC0/domaine public/IA uniquement. **SFX retouchés en deux
  passes de playtest** : clic UI adouci et dégâts diversifiés/médiévalisés via le **RPG Sound
  Pack** (CC0, OpenGameArt — ADR-040), puis tir de catapulte recorrigé (un swing d'épée ne
  convenait pas à un engin de siège → thud bois Kenney, ADR-041). Playtest du 2026-08-18 :
  catapulte jugée réaliste (validée), archer/givre jugés pas assez réalistes → **résolu par
  ADR-042** : le PO a directement fourni les sons (400 Sounds Pack + Free Fantasy SFX Pack by
  TomMusic, itch.io) plutôt que d'attendre une fiche besoin — nouveau workflow adopté pour tout
  futur ajout d'asset (UI/sprite/son) : lui dire précisément le type/format cherché, il source
  lui-même. ADR-042 ajoute aussi des variantes de tir selon spécialisation niv.4 (Archerie,
  Givre ardent → son de feu) et un son de coup d'épée pour le héros (cadencé par le rendu, la
  sim n'a pas d'événement de coup discret). Sujet audio SFX considéré clos côté PO.
  **Reste en attente** : image `mimJ9.jpg` fournie pour remplacer l'icône Bestiaire — c'est un
  JPEG SANS canal alpha réel (le fond « transparent » est un damier dessiné en dur dans les
  pixels, probablement un export d'outil IA) ; besoin d'une vraie version PNG/WebP avec
  transparence avant de pouvoir la brancher comme les autres emblèmes (`EMBLEM.*`, raster brut).
  Ambiances de fond par biome (`BGS Loops` du pack TomMusic : Beach/Cave/Forest Day-Night/
  Interior Day-Night/Sea) demandées mais PAS encore câblées : aucun des 7 dossiers ne correspond
  1:1 aux 10 biomes de chapitre (ash/marsh/forest/quarry/frost/barrow/ruins/tundra/blight/…) et
  ADR-039 avait explicitement limité la musique au Campement (jamais en run) — décision à
  reconfirmer avec le PO avant de construire un nouveau système d'ambiance in-run.
- **Modes** : Histoire (20 chapitres en deux actes, déblocage séquentiel, ch.2-20 en contenu généré provisoire — ADR-049/051) ;
  Failles infinies = mode séparé, verrouillé tant que l'Histoire n'est pas achevée, à implémenter (v1).
- **Méta** : 2 monnaies — Éclats ◆ (unlocks Arsenal + Forge) et Sceaux ⚜ (sorts du héros, gagnés
  via les kills du héros). Bestiaire à découverte progressive (créatures + défenses). Chroniques (top 5 runs).
- **In-run** : 3 tours à 3 niveaux + **spécialisation niv.4** (choix binaire définitif : multishot,
  longue portée, brûlure % PV max, aura de givre) + vente (65%), héros bloqueur à 2 sorts,
  auto-vague, x2, multi-chemins et portails de Faille supportés par la sim. Étoiles 1-3 par chapitre.
- **Rendu** : **skin médiéval** (ADR-016) — au départ 10 sprites SVG maison ; il n'en reste que 4 dans `public/assets/skin-medieval/` (Bastion, dalle, catapulte rangs 1 et 3), les créatures et le héros ayant été remplacés par les sprites CraftPix et générés de `public/assets/skin-craftpix/` (ADR-043/044/045). Palette dédiée (`render/theme/palette.ts`), sol et chemins générés sur canvas (`render/assets/terrain.ts`), projectiles typés par tour (`render/world/projectiles.ts`), animation procédurale des unités et paliers visuels de tour (ADR-017, `render/assets/animation.ts` — marche/vol/repos calculés sur la transform, rang 3 et specs ont leur propre sprite), proportions natives conservées par `fitSquare` (ADR-046). Le tout via la couche swappable (ADR-005) : `sprites.ts` = registre, `EntityLayer.ts` = `SpriteLayer<T>`, `assets.ts` = préchargement. Historique : skin **pixel médiéval Tiny** (rejeté « pas giga beau »), puis **Kenney TD sci-fi** — des CHARS et DRONES dans un jeu de chevaliers, remplacé pour incohérence d'univers. ⚠ Tout changement de skin doit s'accompagner du renommage du contenu (noms + lore dans `content/enemies.ts` et `content/towers.ts` depuis ADR-057).
- **Wording** : noms in-game entièrement MÉDIÉVAUX depuis le skin maison (Archerie/Catapulte/Tour
  de givre + specs Salve, Arc long, Trébuchet, Feu grégeois… ; Gobelin/Orc/Brute/Chauve-souris/
  Diablotin de faille…). La passe sci-fi d'origine (Éclaireur/Blindé/Char lourd/Drone ;
  Tourelle/Mortier/Canon cryo) a disparu avec le skin Kenney TD qui l'avait motivée.
  **Saga/chapitres/lore profond = en attente du fichier lore du PO** (`docs/LORE.md`).
- **Tests** : **276 dans 35 fichiers** (`npm test`), et le rendu est testé lui aussi — pas la
  peinture Phaser, mais tout cœur PUR qu'on en extrait. Les filets structurants : déterminisme de
  la sim (protège ADR-001) ; tests MIROIRS du banc d'essai (chaque formule dupliquée est confrontée
  à la sim, jamais à une valeur écrite à la main) ; intégrité RÉFÉRENTIELLE du content ; profil
  traité comme donnée non fiable (ADR-059) ; `sprites.test.ts` (tout ennemi/tour de CONTENT a un
  sprite) ; `viewport.test.ts` (la zone de jeu reste visible sur tout écran) ; et les tests de
  SOURCE qui interdisent une forme entière (`layoutLiterals`, `skinSwap`, `assets.integrity`).
  ⚠ Un chiffre de tests dans une doc se périme en une PR : ce qui compte est la LISTE des familles
  gardées, pas le total.
- **CI/hébergement** : GitHub Actions (ADR-006) — **lint** (ADR-056) + tests + build sur push/PR, déploiement GitHub Pages
  auto sur `main` (project page). Pages est actif en mode branche `gh-pages` : `main` à la racine,
  et **une preview par PR** dans `pr-<n>/`, commentée sur la PR puis nettoyée à sa fermeture (ADR-008).
- **Thèmes d'interface (ADR-026) — FAIT** : l'habillage des menus est une DONNÉE (`render/theme/uiTheme.ts`),
  plus des valeurs en dur. Trois directions : **Braise** (l'ancienne, parchemin/bois/or), **Nocturne**
  (ardoise bleu nuit + or, **défaut**), **Arcane** (pourpre + or rosé). `?theme=` bascule SANS rebuild —
  outil de décision, aucune UI ne l'expose. Tests sur ce qui rendrait un thème inacceptable (fond sombre,
  contraste texte/panneau, panneau actif ≠ inactif, directions réellement distinctes), pas sur le goût.
  ⚠ **Portée bornée et testée** : un thème habille les MENUS, jamais le champ de bataille — le PO juge
  les deux séparément.
- **Menus mobiles (ADR-025) — FAIT** : le Campement passe de cinq cartes empilées dans une colonne
  centrée (**44 % de la largeur occupée** en paysage mobile) à **deux rangs de tuiles** — une PRINCIPALE
  (Histoire + jauge de progression) et des SECONDAIRES en grille. Disposition dans `components/hubLayout.ts`
  (**pur et testé** : ≥ 90 % de largeur occupée, principale plus grande, zéro chevauchement, rien hors zone),
  rendu dans `components/tile.ts` (grande icône au-dessus du titre). Les vignettes de chapitre affichent
  l'**aperçu de leur biome** (ADR-023) ; les verrouillées le cachent. Grille des chapitres 700 → 1 180.
  `uiNavCard` supprimé (orphelin). ⚠ Deux bugs introduits puis corrigés : `setInteractive({})` ne définit
  aucune zone de clic, et le clic TRAVERSAIT d'un écran à l'autre (`pointerdown` vs `pointerup`).
- **Règles de niveau (ADR-024) — FAIT** : (1) un BOSS doit être ABATTU — s'il atteint le château la partie est perdue ; avant, il était retiré du jeu en touchant le château, la vague se terminait et la victoire tombait quand même. (2) Les 3 tours sont constructibles dès la 1re partie : la Tour de givre verrouillée à 30 ◆ rendait le ch.1 très rude, et un joueur bloqué ne gagne pas de quoi se débloquer. (3) La méta vend des PALIERS (`maxTowerLevel`, `allowSpecialize`) — les 3 rangs sont ouverts d'emblée, « Doctrines de siège » débloque le rang 4. ⚠ Plafonner au rang 2 rendait le ch.1 infranchissable (400 or inutilisable) : ce qui est nécessaire pour finir la 1re partie doit être disponible dans la 1re partie. Boss allégés d'environ 30 % — les rendre éliminatoires change leur fonction. Effet de bord surveillé : le triangle de rôles se resserre (9 vs 8 victoires contre 10 vs 7), un boss étant une cible isolée qui favorise le mono-cible.
- **Forge (ADR-024)** : 4 → **6 rangs** par tour (20/45/80/130/200/300 ◆, 2 325 ◆ au total) et surtout elle est devenue la **CONDITION du dernier chapitre** — le boss final (la Vouivre du ch.10 à l'époque, Le Roi Fangeux du ch.20 depuis ADR-050 ; l'invariant se calcule sur le DERNIER chapitre jouable, donc il a suivi seul) n'est pas abattable avec des tours jamais forgées, quelle que soit la stratégie. Mesuré avant correction : la Forge ne pesait que **5 PV de château cumulés sur 10 chapitres**, c'était un puits d'Éclats et non une progression. Un axe de méta qu'on peut ignorer sera ignoré : mesurer chaque axe avec et sans.
- **Biomes de chapitre (ADR-023) — FAIT** : chaque chapitre a son identité visuelle (prairie, cendres,
  marécage, forêt, carrières, glace, tertres, ruines, toundra, terre gâtée). « Le Col du Gel » s'affichait
  sur la même prairie verte que tous les autres. Le content NOMME un biome, `render/assets/biomes.ts` décide de
  son apparence (ADR-005). Un biome porte la FORME de son motif (`grass`/`rock`/`flake`/`reed`) et sa
  ROUTE, pas seulement une teinte — teinter ne suffit pas, `setTint` assombrit sans désaturer. Tests :
  biome connu par chapitre, jamais deux décors identiques consécutifs, sol+route distincts, repli sûr,
  et saturation < 0,55 (le décor ne doit pas concurrencer les unités).
  ✓ FAIT (ADR-027) : les 10 chapitres n'ont plus deux tracés partagés — chaque chapitre
  a désormais sa propre topologie (1 à 3 voies selon le chapitre, tronc commun pour les
  cartes à voies multiples), en écho au biome quand c'est pertinent.
- **Format 16:9 + cartes par chapitre (ADR-027) — FAIT** : `BATTLEFIELD` passe de 800×600
  (4:3) à **960×540** (16:9, moitié de 1920×1080). `LAYOUT_RIFT`/`LAYOUT_PINCER` supprimés,
  chaque chapitre 2-10 a sa `MapDef` (`content/index.ts`). `makeWaves` prend désormais
  `pathCount` (au lieu d'un booléen `secondPath`) et distribue les renforts en tourniquet
  sur les voies secondaires. ⚠ La géométrie d'une carte est un levier d'équilibrage à part
  entière : la 1re version du ch.10 (8 emplacements, tronc trop généreusement couvert)
  rendait le chapitre gagnable SANS la Forge en « spread », cassant la garantie ADR-024 —
  7 emplacements moins concentrés restaurent les deux garanties (infranchissable sans
  Forge, franchissable avec). Tout changement de carte sur un chapitre à invariant de
  méta doit repasser `autoplay.test.ts`.
- **Habillage Tiny Swords — EN COURS (étape 1/4)** : adoption décidée par le PO du pack
  complet (menus + bâtiments + décor + FX), teinté selon le thème actif. **Fait** : le
  parchemin `ui/paper-regular.png` habille les panneaux nine-slice — `render/skin/uiSkin.ts`
  recompose les planches (grilles 3×3 de pièces séparées) en textures contiguës sur canvas,
  coins rognés à 16 px, filtre NEAREST par texture. **Restent** : boutons, rubans/bannières
  de titre, château, décor, FX. ⚠ Deux constats à trancher avant la suite : (1) les trois
  palettes d'ADR-026 teintent les panneaux en SOMBRE, donc la matière du parchemin ne
  ressort pas — le pack n'apporte que sa bordure biseautée tant qu'on n'éclaircit pas les
  panneaux ; (2) le pack n'a AUCUN sprite d'unité, donc ennemis et héros resteront
  vectoriels (ADR-016) au milieu de bâtiments/décors pixel — mélange durable, à relier à
  la recherche d'un pack de monstres restée en suspens.
- **Centrage des menus (suite d'ADR-027) — FAIT** : le centre horizontal `400` (l'ancien
  800/2) était écrit en dur à une vingtaine d'endroits de `MenuScene.ts` et avait survécu
  au passage du monde en 960×540 — **tout l'écran de menu était décalé de 80 unités vers
  la gauche** (tuiles du Campement coupées au bord gauche, 120 unités de vide à droite).
  Le centre vit désormais dans `menuZone`/`levelGridZone` (`components/hubLayout.ts`),
  dérivé de `WORLD_W` et testé par comparaison au centre du monde sur un panel d'écrans.
  ⚠ Défaut INVISIBLE en paysage mobile (le débord latéral l'absorbe), flagrant en 16:9/16:10
  exact — d'où une vérification visuelle qui l'avait manqué. Deux effets de bord corrigés au
  passage : le plancher tactile de `hubLayout` ne s'activait que pour déborder, et
  `SIDE_BY_SIDE_MIN_WIDTH` (900) faisait repasser le Campement en colonne unique sur
  tout écran 16:9 alors que cinq tuiles empilées ne tiennent plus dans 540 de haut.
- **Lisibilité des cartes / HUD mobile (ADR-028) — FAIT** : les 3 garanties géométriques
  d'ADR-019/020 valident la jouabilité mécanique, pas la lisibilité. Un audit UX post-027
  a trouvé les 9 cartes recouvertes par le HUD sur mobile (le HUD suit les bords RÉELS de
  l'écran, `hudTop` ~410-455 en unités logiques sur mobile contre ~500 sur desktop — un
  chemin sur trois et un emplacement sur deux invisibles ET non-tappables), et 27
  emplacements plantés dans la route ou le sprite du château (rien ne testait de
  PLANCHER de distance, seulement un plafond de couverture ≤130). `PLAY_SAFE_BOTTOM`
  (`render/platform/viewport.ts`) + 4 nouvelles garanties testées dans `datasheet.test.ts`
  (zone jouable, clearance route ≥55, espacement dalles ≥75, clearance château ≥94).
  ⚠ Retoucher le ch.10 pour la lisibilité a de nouveau cassé son invariant de méta —
  toute retouche de `MapDef` sur un chapitre à garantie testée doit repasser
  `autoplay.test.ts`, pas seulement les tests géométriques.
- **Tuiles et habillage (ADR-029) — FAIT** : deux défauts mesurés, corrigés par deux modules
  purs. (1) Le grain du parchemin Tiny Swords partait en TRAÎNÉES — un nine-slice n'étire que
  cinq de ses neuf pièces, et la bande gauche du parchemin avait 8 profils de ligne pour
  8 lignes (contre 1 sur la planche des boutons, d'où l'impression que boutons et tuiles
  venaient de deux jeux différents). `render/skin/nineSliceFlatten.ts` rend toute pièce étirée
  constante le long de son axe, par couleur DOMINANTE ; mesuré après : 1 profil partout.
  (2) Le contenu des tuiles avait une taille FIXE dans une boîte dérivée de l'écran — 57 % de
  vide dans la tuile « Histoire », jauge 82 unités sous le texte, 40 % de l'écran Histoire vide
  sous la grille. `components/tileContent.ts` fait remplir la boîte (icône jusqu'à
  `ICON_RASTER_PX`, porté 128 → 192) et `gridLayout` reçoit sa hauteur disponible.
  Occupation après : secondaires 82 %, principale 75 %.
- **Panneau ouvragé du pack (ADR-030) — FAIT** : les tuiles ne « faisaient pas le même jeu »
  que les boutons parce qu'on avait branché la mauvaise planche — `paper-regular` (parchemin
  crème) teinté vers l'ardoise des thèmes, donc réduit à sa forme de bord, quand les boutons
  gardaient leur art natif. `paper-special` (ardoise + volutes dorées) est désormais
  l'habillage de TOUS les panneaux, sans teinte de clarté : le thème n'en nuance plus que la
  dominante (`skinTint`, multiplicateur CLAIR — une base sombre ne se teinte pas avec du
  sombre). Trois corrections de racine au passage : `cornerDetailDepth` mesure jusqu'au
  DERNIER pixel non-remplissage (la volute est à 9-17 px de l'angle, pas collée à lui),
  `fitInsets` empêche un nine-slice de se replier quand l'élément est plus court que deux
  marges, et plus aucun liseré vectoriel n'est tracé par-dessus l'habillage (l'anneau vert
  « conquis » doublait le cadre doré). Deux défauts préexistants remontés par le nouveau
  cadre : menu de tour figé à 230 de large pour 275 de texte, et rangées de 30 sous le
  plancher tactile. Trois défauts de HUD relevés au playtest et corrigés dans la foulée :
  la jauge de PV du Bastion était décentrée de 26 unités (géométrie du château écrite TROIS
  fois, deux copies divergentes → `render/world/castle.ts`, pur et importé par le test qui la
  recopiait) ; « Auto ✗ » recouvrait « x1 » (une plaque qui s'élargit grandit aussi vers la
  droite, le curseur seul ne compensait qu'à gauche) ; et « ⟵ Camp » partait dans la bande
  noire sur écran large (`safeLeft` = −114 à 2,2:1, borné à 0 désormais). La jauge du
  Bastion porte maintenant la châsse du pack (`bar-small-base`, bande à TROIS tranches via
  `planStrip`). ⚠ RESTE inutilisé : rubans (`ribbons-*.png`) pour les titres, bannière
  - **Rubans de titre (ADR-031) — FAIT** : les titres de tuile portent un ruban du pack, dans les
  MÊMES couleurs que ses boutons (teal `rgb(65,145,157)` des deux côtés, mesuré) — c'est ce qui
  raccroche enfin les tuiles aux commandes. Couleur porteuse de sens : teal par défaut, pourpre
  pour les Failles, gris pour une entrée verrouillée. Variante ARRONDIE (130×54) et non en pointe
  (132×60), réduction proportionnelle bornée à 26 %% de la tuile, largeur dimensionnée sur une
  marge SÛRE mesurée (là où le corps plat commence) et non sur la marge de découpe. `composeTile`
  reçoit un plancher de marge (`uiPanelPad`) : mesuré après, marge minimale 22 partout contre 15.
  Suite : la tuile principale porte le BASTION du pack (`buildings/castle-blue.png`, raster non
  teinté) au lieu du parchemin plat, sa jauge d'avancement est la châsse en bois du pack
  (`bar-big-base`, remplissage dessiné car celui du pack est rouge et `setTint` MULTIPLIE), et les
  notes de chapitre passent des glyphes Unicode « ★/☆ » — rendus par la police système, donc hors
  palette — à deux icônes du registre. Le pack n'offre RIEN qui note un niveau, elles sont
  dessinées pour le projet.
- **État enfoncé, défilement, vignettes (ADR-032) — FAIT** : quatre retours de playtest mobile,
  quatre causes mesurées. (1) **Tout bouton virait au noir sous le doigt** — deux défauts
  superposés : `planNineSlice` prélevait la bande du milieu dans la GOUTTIÈRE transparente de la
  planche dès que la pièce est gardée entière (le cas des planches enfoncées), et `setTexture`
  garde les marges de découpe de l'ancienne texture alors que la planche enfoncée compose en 48×41
  contre 52×52 au repos. Point d'entrée unique `uiSkinSetTexture`, gardé par un test de source.
  (2) **Aucune indication de défilement nulle part** : la gouttière se dessinait à `x + w + 4`, or
  les fenêtres du campement occupent toute la largeur — 4 unités hors du viewport. Rentrée, plus
  un chevron animé sur le bord vers lequel il reste du contenu. (3) **Le nom du chapitre 2
  recouvrait ses étoiles de 9,2 unités** : deux règles de placement concurrentes, plus un plancher
  de cellule calculé sur les tailles de police demandées et non mesurées. `levelCellLayout` (pur)
  place tout d'un seul calcul, `maxLines: 2` borne le nom. (4) **Le bouton « quitter le plein
  écran » paraissait de travers** : glyphe « ⤡ » absent de Cinzel, donc police système, encre
  décentrée dans sa boîte. Passé au registre (ADR-012), avec `chevronDown` au passage.
  ⚠ **Trois icônes DESSINÉES faute d'équivalent dans les packs** — inventaire fait : les 12 icônes
  Tiny Swords sont des ressources, `kenney-ui` n'a que deux boutons et un panneau ; aucune flèche,
  aucun chevron, aucun symbole de plein écran. À remplacer en priorité quand des assets arrivent
  (une ligne par icône dans `render/theme/icons.ts`).
- **Push unique des boutons habillés (ADR-035) — FAIT** : relevé par le PO au repos, `uiButton`
  (le composant de base) et la barre du HUD de run rendaient l'appui différemment — l'un cumulait
  planche enfoncée du pack ET scale-squish (0,96/1,04, hérité d'avant l'habillage), l'autre
  n'affichait que la planche + un décalage de libellé de 3 px, validé en playtest mobile (ADR-032).
  `skinPressVisual` (`components/button.ts`) est désormais le point d'entrée unique des deux ;
  `uiButton` ne garde le scale-squish qu'en repli Kenney, sans planche enfoncée à afficher. Vérifié
  en pilotant `window.__game` (capture indisponible en session) : appui simulé sur « ⟵ Camp » et sur
  un bouton du HUD donnent désormais la même transition de texture et le même décalage de libellé.
- **Icônes Armurerie/Chroniques et jauge Histoire — FAIT** : les silhouettes maison de ces deux
  tuiles ont été remplacées par des rasters du pack (`EMBLEM.armory` = bouclier `icon-06.png`,
  `EMBLEM.chronicles` = épées croisées `icon-05.png`, sans teinte). La jauge de la tuile Histoire
  utilisait un simple rectangle plat ; `bar-big-fill.png` (remplissage natif du pack) est rouge et
  `setTint` ne peut jamais le désaturer (ADR-014) — `render/assets/colorRemap.ts` (nouveau module pur,
  testé) reteint par LUMINANCE plutôt que par teinte, ce qui garde le relief (reflet, ombre) du
  dessin en changeant sa couleur vers l'or. ⚠ Bug réel corrigé dans la foulée : la texture
  recomposée gardait la marge transparente du canevas source (64×64, 24 px peints) — `setDisplaySize`
  étirait ce vide EN MÊME TEMPS que le motif, réduisant tout remplissage à un mince trait. `opaqueBBox`
  + `cropBuffer` (`colorRemap.ts`) recadrent la texture sur son contenu réellement peint avant de
  l'enregistrer — leçon générale pour tout futur raster recomposé du pack.
- **Grande planche de ruban pour la tuile Bastion (ADR-036) — FAIT** : `ribbons-big.png`, en
  réserve depuis ADR-032, habille désormais le titre de la tuile PRINCIPALE (les tuiles
  secondaires gardent la petite planche). Ses ailes de fanion (~98×59) sont plus larges que hautes
  sur un pas de grille carré (128) — `opaqueBounds` (`uiSkin.ts`) ne savait mesurer qu'une fenêtre
  CARRÉE, généralisé en `sizeW`×`sizeH`. `uiRibbonKey` résout la clé de ruban une seule fois,
  appelée par `tile.ts` AVANT de mesurer la hauteur du bloc de titre et par `uiRibbon` pour
  dessiner — les deux DOIVENT s'accorder sur la même clé, sinon même défaut qu'ADR-032 (mise en
  page calculée sur une planche, dessin d'une autre).
- **Marges intérieures et abscisses en dur (suite ADR-030) — FAIT** : le contenu se posait sur les
  volutes d'angle (numéro de chapitre à 6 unités du bord pour une marge de 22) et les colonnes
  des Chroniques/du Bestiaire/des Failles gardaient des abscisses en dur héritées du monde 800 —
  le rang « #1 » tombait 60 unités HORS de son panneau. `uiPanelPad(scene)` dérive la marge de
  l'habillage, et `render/layoutLiterals.test.ts` interdit la FORME entière (toute abscisse ≥ 100
  en littéral dans les scènes), pas les cinq cas trouvés. Mesuré après : pire marge 20 unités sur
  les 29 textes de la grille des chapitres, zéro texte à moins de 20 d'un bord aux Chroniques.
- **Bestiaire (ADR-022) — FAIT** : 4 → **10 créatures** (relevé à la date de cet ADR ; **24 aujourd'hui**
  depuis le deuxième acte, ADR-049/051), chacune conçue pour NEUTRALISER une tour
  et en valoriser une autre. Rat de faille (saturation → AoE), Spectre (`slowImmune` → le givre ne
  sert plus), Gargouille (volant lourd → la catapulte ne peut rien), Golem (`armor` 11 → gros coups
  ou brûlure), + 2 vrais boss : **Chef de guerre** (v5/v10) et **Vouivre** (boss VOLANT du ch.10).
  Deux mécaniques neuves dans le content : `armor` (réduction plate, plancher 25 % — la brûlure en
  % PV max l'IGNORE, ce qui donne enfin une raison de préférer Feu grégeois à Trébuchet) et
  `slowImmune`. Une créature apparaît aux ch.2-5, les suivants les mélangent ; la **3e vague** de
  chaque chapitre la présente seule. Le Bestiaire affiche les traits (`cuirassé 11`, `insensible au
  froid`). Taille d'affichage déplacée dans `sprites.ts` (`SpriteRef.size`, ADR-005) — elle était en
  ternaires dans `GameScene`. ⚠ **Propriété acquise et testée** : le ch.10 est INFRANCHISSABLE sans
  méta et franchissable avec (11/12 vagues à vide, victoire à 16 PV équipé) — la boucle
  run → monnaies → run plus fort n'est plus décorative.
- **Méta-progression (ADR-021) — FAIT** : armurerie vidée en **5 runs** au lieu de 2, puits d'Éclats
  en 14, sorts en **12 runs** au lieu de 2, et le ch.10 rapporte **×3,32** le ch.1 au lieu de ×1,11.
  Le rapport du banc affiche « aucune saturation détectée ». Les **Sceaux paient le temps de blocage**
  (`heroBlockSeconds`) et non les kills — la métrique récompensait le placement le moins efficace ;
  −1 par mort du héros pour éviter le sacrifice répété. Armurerie 3 → **6 paliers** (120 → 420 ◆),
  sorts 3 → **4 niveaux** (24 → 56 ⚜). `UnlockDef` vit désormais dans le `ContentPack` **avec ses
  effets** (`castleHp`, `startingGold`, `heroRespawnS`, `accountSpell`) : ajouter un palier ne touche
  plus à la sim. ⚠ Deux textes d'UI annonçaient encore les kills — une monnaie doit **dire** ce
  qu'elle récompense. Garanties testées, courbe prouvée par mutation.
- **Chemins & cartes (ADR-019)** : le tracé dessiné ne s'écarte plus du chemin que suit la sim
  (spline de Catmull-Rom → arrondi de coins borné, `render/world/path.ts` pur) — **64,7 px d'écart mesurés
  avant, 5,8 après**, pour une route de 46 de large. Les unités marchaient visiblement à côté de leur
  route alors que les tours visaient leur position réelle. Les layouts `LAYOUT_RIFT`/`LAYOUT_PINCER`
  (ch.2-10) sont redessinés : « Tenailles » convergeait mal (voie 2 à 940 px contre 1280, couverte
  par 3 emplacements sur 6 → **6/6 et longueurs à 2 %**), « Faille » faisait un demi-tour. Trois
  propriétés de carte sont désormais testées sur chaque voie de chaque chapitre (écart de tracé,
  couverture ≥ 2/3, longueurs à ±25 %), **prouvées par mutation**. `PATH_WIDTH` = source unique.
- **Banc d'essai (ADR-018)** : `npm run balance` mesure le jeu sans y jouer — fiches ennemis/tours,
  pression par vague, santé de la méta, et un joueur artificiel (3 politiques) sur les 20 chapitres.
  `src/balance/`, hors bundle. Les formules qui doublent celles de la sim sont verrouillées par des
  **tests miroirs** (comparaison à la sim, pas à des valeurs écrites à la main) — sans eux l'outil
  pourrait mentir sans rien casser. **Constats non encore corrigés** : récompense quasi identique
  d'un chapitre à l'autre (ch.10 = ×1,11 le ch.1) donc farm du ch.1 optimal ; armurerie et sorts
  saturés en 2 runs ; difficulté non monotone (ch.3 perdu, ch.4-9 gagnés) ; 1 800-3 800 or inutilisé
  au ch.10 (6 emplacements partout) ; Sceaux indexés sur les kills du héros alors que son bon
  placement en fait moins. Détail et chiffres : GDD §Équilibrage.
- **Triangle de rôles (ADR-020) — FAIT** : archerie seule gagnait 9 chapitres sur 10 contre 5 au
  mélange ; désormais **mélange 10/10 et 170 PV de château, archerie seule 7/10 et 68 PV**, givre
  seul 1/10, catapulte seule 0/10. Archerie = socle polyvalent qui paie sa polyvalence en rendement,
  catapulte = reine des groupes (rayon 55→85), givre = multiplicateur (ralentissement en zone).
  ⚠ **Le levier décisif n'était pas dans les tours mais dans l'espacement des vagues** : les
  renforcer plafonnait l'écart à +1 victoire, resserrer les spawns à ×0,7 l'a porté à +4. D'où aussi
  mini-boss allégés (×12→×7 : un boss est une cible ISOLÉE, l'AoE n'y peut rien) et **8 emplacements**
  au lieu de 6 aux ch.2-10 (le ch.1 en garde 6). Deux tests garantissent le triangle, prouvés par
  mutation. **Le chantier de contenu est débloqué** — un essaim favorise enfin réellement l'AoE.
- **Équilibrage** : passe nº1 faite (hpExponent 1.12, or +30%, départ 160, specs boostées) — calibrée
  au **bot de simulation** (stratégies scriptées sur la sim headless, méthode décrite au GDD §Décisions).
- **UI** : rendu HiDPI (texte net), polices embarquées **Cinzel** (titres/boutons) + **Alegreya**
  (textes) chargées avant le boot Phaser, curseurs **dessinés sur canvas** (flèche + main dorées,
  image-set 2x — les PNG Kenney 30px étaient flous), boutons avec hover/pressed, sorts en
  boutons-icônes (game-icons, CC-BY → crédit obligatoire, voir public/assets/README.md),
  deltas chiffrés sur upgrades et specs. Socle de widgets dans `render/components/` (ADR-007)
  + `layoutCursor` pour l'empilement vertical.
- **Découpage des scènes (ADR-034) — FAIT** : `GameScene.ts` (1379 → 331 lignes) et `MenuScene.ts`
  (672 → 180 lignes) ne portent plus que le lifecycle Phaser, l'input et l'orchestration de la
  boucle update/draw — leur contenu vit désormais dans `render/game/` (terrain, HUD, modales,
  menu de slot, entités, FX) et `render/menu/` (un fichier par écran du Campement), sur le même
  principe que `render/components/` (scène passée en paramètre explicite, jamais capturée via
  `this`). Refactor pur, aucun changement de gameplay ni d'équilibrage.
- **Viewport (ADR-010)** : cible **paysage**, le jeu remplit l'écran entier (avant : 35 % de la
  surface sur mobile portrait, le reste en bandes noires). `render/platform/viewport.ts` = source unique
  (framebuffer, zoom, rectangle visible, encoches), réactif au resize/rotation ; invite « tournez
  votre appareil » en CSS sur mobile portrait.
- **Chantier UI/UX en cours** : socle format (ADR-010) + cibles tactiles (ADR-011, `touchSize`) +
  registre d'icônes maison, fin des emoji (ADR-012) + grille de niveaux et listes défilantes
  (ADR-013). Tous les sous-écrans du campement sont passés sur le kit ; `backButton()`/`row()`
  positionnelles supprimées. L'état « inabordable » du GDD est enfin rendu (coût rouge, cadre
  atténué) + fonds générés sur canvas, bandeau de titre et harmonisation du terrain (ADR-014,
  `render/assets/backdrop.ts` — l'herbe fluo du pack est lavée par un voile chaud, `setTint` ne désature
  pas) + échelle typographique réelle, plein écran et correction des bornes de pointeur au resize
  (ADR-015). **Reste** : transitions d'écran et retours visuels (pulsation sur gain de monnaie,
  retour d'achat), et le fond du campement pourrait gagner un élément de décor (bannière,
  silhouette de remparts) — pour l'instant c'est matière + vignette, sans motif identifiable.
  ⚠ Le PO trouve encore la direction artistique datée (« années 80 ») : la palette elle-même
  (brun sombre + or) est à rediscuter, ce n'est plus un problème d'exécution mais de parti pris.

## Prochaine grosse feature actée (design au GDD, à implémenter)
**Équipement du héros + loot** : 3 slots (arme/armure/relique), butin en fin de run victorieux
pondéré par chapitre/étoiles, raretés, doublons recyclés en Sceaux. ⚠ Le random vit côté méta
(ProfileService), JAMAIS dans la sim (déterminisme ADR-001).

## Économie in-run — refondue (ADR-052)
L'or d'un chapitre est **budgété** (`economy.chapterBudget`, une entrée par chapitre) et non plus
produit par les kills : 25 % du budget tombe à la mort des créatures, 75 % à la fin de chaque vague
nettoyée. Les `goldReward` du bestiaire sont désormais une **clé de répartition**, plus des montants.
Motif : au per-kill, le ch.20 versait 2,8× ce que ses 6 emplacements pouvaient dépenser, la forge ne
décidait plus rien passé le ch.12, et un mode à vagues infinies (Failles) aurait divergé par
construction. Les 3★ passent d'un tout-ou-rien (château intact) à un **seuil** de 90 % des PV
conservés, et **paient** 12 Éclats par étoile (`rewards.shardsPerStar`). ⚠ Toute nouvelle carte ou
tout nouveau chapitre doit recevoir son entrée dans `chapterBudget` (calibrage :
`emplacements × 537 × ratio`, ratio 0,50 → 0,84, et 1,05 pour un chapitre à boss dédié) — sans quoi
il retombe silencieusement sur `defaultChapterBudget`.

**Reste ouvert après cet audit** (relevé, non traité) : les 9 créatures de l'acte 2 sont toutes
TERRESTRES, boss final compris — la part de PV volants tombe de 9-21 % (acte 1) à 6-7 %, donc
l'anti-aérien et l'arbitrage Archerie/Catapulte cessent d'être une décision après le ch.10. Et la
difficulté de l'acte 2 est en dents de scie (chapitres « nuée » 14/15 nettement plus faciles que les
chapitres « cuirassé » 13/16, parce que le newcomer du chapitre décide de tout).

## Difficulté de l'acte 2 — cause trouvée et corrigée (ADR-060)
La vague "mélange complet" (`content/waves.ts`, case `default`) empilait UN spawn par créature
débloquée depuis le ch.11 sans plafond — au ch.19, 9 types distincts en une seule vague contre 4
maximum sur tout l'acte 1. `MIX_POOL`/`MAX_MIX_ENTRIES` (=4) plafonne désormais ce mélange aux
créatures les plus RÉCEMMENT débloquées ; l'acte 1 est inchangé. Ch.13 et 19 restent hors de
portée du 3★ à toute forge, mais ce n'est plus un souci de contenu : le château y termine à 100%
des PV, seules les morts du héros bloquent — artefact du pilotage naïf de l'étalon (ADR-018), pas
un déséquilibre. **Point clos.**

## Refonte graphique du bestiaire — EN COURS (ADR-061)
Le PO régénère tous les sprites du monde avec Gemini, **un par un**. Deux documents pilotent :
`docs/PROMPTS-GEMINI.md` (un prompt complet et autonome par entité, à copier-coller) et
`docs/REFONTE-GRAPHIQUE-GEMINI.md` (règles, table de renommage, ce qu'il ne faut PAS régénérer).

Boucle par sprite : le PO génère et **dépose les JPEG bruts, sans rien détourer** ; on
convertit en PNG et on passe `npm run sprite -- <source> <destination>` (`src/artprep/`), qui
**retire le fond lui-même** (ADR-063), décape la frange, rogne, adoucit le bord et réduit à
256 px ; on renomme en `<defId>.png` et on recâble `assets.ts`. Photoshop est sorti du circuit :
sa sélection dure supprimait l'anticrénelage et rendait la frange OPAQUE, pire que le brut.

Le nom de fichier se dérive de l'entité, plus du pack d'origine.

**Faits (10/24) : `diablotin` (ex-`imp`, defId `rat` renommé + migration de sauvegarde),
`scorpion`, `orc`, `troll`, `ogre`, `brute`, `dark_knight`, `golem`, `warlord`, `goblin`.** `orc` (1 direction x 4 poses) et `goblin` (3 directions x 4 poses) sont des PLANCHES de marche.
Restent 15 ennemis (`goblin`, `wraith`, les 3 volants, les 10 de l'acte II), le héros et
8 sprites de tours.

⚠ Deux pièges du nettoyage, tous deux payés une fois (ADR-063) : le détourage se fait par
REMPLISSAGE DEPUIS LES BORDS (sinon il mange les reflets et les yeux enfermés dans le dessin,
déjà constaté en ADR-050), et la frange se juge par CONTRASTE avec ce qu'il y a derrière, pas
par clarté absolue (sinon les créatures pâles — troll, chef de guerre — se font ronger la
silhouette couche après couche, sans que l'érosion s'épuise jamais).

Deux points volontairement remis à la FIN de la série :
- **Les `size` de `sprites.ts` ne sont pas retouchés.** Le cadrage portrait et la pose de marche
  donnent des silhouettes plus élancées : à `size` égal un nouveau sprite occupe moins de surface
  qu'un ancien CraftPix. La hiérarchie reste juste entre nouveaux ; c'est le mélange
  ancien/nouveau qui détonne pendant la transition. Les régler maintenant reviendrait à calibrer
  sur une référence qui change à chaque livraison.
- **`skin-craftpix/` n'est pas renommé** et le README des licences pas refondu — un renommage de
  dossier par fichier livré brouillerait l'historique.

Hors périmètre tant que rien n'est tranché : les icônes monochromes et `skin-medieval/` (chargés
par `load.svg`, il faudrait basculer sur `load.image`), et le chrome d'UI 9-slice dont `uiSkin.ts`
découpe la géométrie — une image générée librement la casserait.

### Directions de marche (ADR-067)
Le PO : « de gauche à droite c'est ok, les autres sens il tourne pas ». Cause : le rendu ne
comparait que l'ABSCISSE, donc un segment vertical laissait l'orientation du segment
précédent. Invisible sur un sprite de FACE (convention admise), criant sur un PROFIL.

Format retenu : 3 rangées dessinées (face, profil droit, dos) x 2 poses, une ligne de sol par
rangée. La GAUCHE est le miroir du profil — le retournement inverse l'équipement, ce qui est
la convention universelle pour l'orientation, mais reste INTERDIT pour fabriquer le pas
opposé d'un même cycle (l'arme sauterait de main à chaque pas). Six poses au lieu de huit
laissent un tiers de surface en plus par pose.

 (pur, 13 tests) : l'axe DOMINANT décide (sinon oscillation en diagonale),
rien ne change sous le seuil (une unité bloquée ne pivote pas), et une planche sans rangée
verticale GARDE son orientation plutôt que de demander une case inexistante — une case hors
planche s'affiche vide sans lever d'erreur.

Les VOLANTS restent hors de ce format : une chauve-souris de dos n'a pas de sens, et son
animation est un battement d'ailes.

## Sols, chemins et décor — tranché (ADR-062)
Question du PO : fallait-il reprendre aussi les sols, les chemins et les dalles de tour ?
Réponse : **trois situations différentes**, et une seule se traite comme les créatures.

- **Dalles, Bastion, catapulte** : de vrais fichiers, remplaçables — mais en SVG. Le PO a
  tranché pour la bascule `load.svg` → `load.image` (option A d'ADR-061), à faire FICHIER PAR
  FICHIER quand les PNG existent : basculer le loader avant casserait le chargement.
- **Sols** : PAS des fichiers, générés sur canvas par biome. Les remplacer imposerait 10
  textures RACCORDABLES, ce qu'une IA ne produit pas de façon fiable — une tuile non seamless
  donne une grille visible, pire que la répétition actuelle. **Écarté d'un commun accord.**
- **Chemins** : pas des images du tout — trois traits le long d'une polyligne calculée depuis
  les waypoints, multi-chemins et portails compris. Hors de portée d'un remplacement d'asset.

Retenu à la place : **semer des props** (ADR-062). `render/world/decor.ts`, pur et testé,
place rochers et buissons sur une grille jitterée en évitant routes, dalles et Bastion ;
`assets/decorTextures.ts` les reteint par LUMINANCE sur une gamme dérivée du sol du biome
(`setTint` ne saurait pas — il multiplie). Deux nombres par biome (`count`, `bushShare`) :
la cendre et le givre sont à 0 buisson, la forêt à 0,75. Sort `rock-*`/`bush-*` de la réserve
d'assets ; les nuages y restent.

## Animation des unités — refaite (ADR-064)
Le PO jugeait le mouvement inutilisable (« le petit sautillement, ça passe pas du tout »), et la
cause était structurelle : pivot à 62 % de la hauteur (au MILIEU du corps) et `dy` jusqu'à
4,6 px qui translatait le sprite entier — les pieds décollaient. L'écrasement, lui, plafonnait
à 6 %, six fois plus faible que la translation, donc invisible.

Principe désormais : **les pieds restent au sol, c'est le corps qui travaille**. Ancrage par les
pieds (`setOrigin(0.5, 1)`, compensé par `LEGACY_ORIGIN_Y` pour ne déplacer aucune unité),
mouvement vertical porté par l'écrasement (jusqu'à 12 %, phasé sur le contact du pied), et
`UnitPose.dx` nouveau : le report du poids d'un appui sur l'autre, qui est ce qui fait lire une
démarche. Mesuré en jeu : 3,5 px d'amplitude verticale réelle sur l'orc, contre un écrasement
auparavant imperceptible.

⚠ **L'animation par frames dessinées est écartée DÉFINITIVEMENT**, et pas pour son volume :
un générateur ne redessine pas LE MÊME personnage dans une autre pose (couleurs et proportions
dérivent), donc un cycle de 4 frames donnerait 4 créatures qui clignotent. `Rope` (déformation
par maillage) est écarté aussi : WebGL uniquement, or le jeu tourne en `Phaser.AUTO` avec repli
canvas sur cible mobile.

Reste : le **héros** garde son ancien bob (1,5 px) et son ancrage — son arc de lame est calé sur
sa position, le reprendre demanderait de revoir cette géométrie.

## Cycles de marche dessinés — EN COURS (ADR-065)
L'animation procédurale corrigée (ADR-064) restait jugée « vilaine » par le PO. Il a proposé
de demander PLUSIEURS POSES DANS UNE SEULE IMAGE — ce qui lève l'objection qui bloquait :
un générateur ne redessine pas le même personnage d'une image à l'autre, mais il le dessine
très bien quatre fois dans la même. Vérifié sur l'orc : même armure, même hache, même main.

La planche porte une LIGNE DE SOL dessinée, et c'est elle la clé : les frames sont calées
dessus, PAS sur leur boîte englobante — ce qui préserve l'élévation voulue du corps (contact
bas, passage haut, 9 px mesurés) tout en supprimant la dérive (2 px de pieds, soit 0,4 px à
la taille du jeu). L'ancrage horizontal suit le HAUT du corps, pas la boîte, qui s'élargit
quand la jambe s'avance : 0,6 px de dispersion sur 247.

`npm run sprite -- <src> <dst> --strip` fait le reste (`src/artprep/strip.ts`, pur et testé).
**Fait : l'orc**, 4 poses. Le registre a gagné `frames` sur une entrée d'ennemi ; les deux
régimes coexistent, tout le reste du bestiaire garde son sprite unique et son animation
procédurale.

⚠ Trois pièges déjà payés : la ligne se reconnaît à sa CONTINUITÉ (100 % de remplissage) et
non à son étendue — une bande de torses couvre aussi 85 % de la largeur ; elle s'efface
seulement LÀ OÙ ELLE EST LIBRE, sinon elle perce les bottes ; et une créature à planche ne
doit PAS recevoir en plus la déformation procédurale, qui compterait le mouvement deux fois.

**Deux arbitrages ouverts** : le coût (262 Ko contre 60 pour un sprite fixe — un bestiaire
entièrement animé pèserait ~6 Mo), et le CADRAGE (la planche de l'orc est en profil, les 23
autres sprites sont de face — choix de direction artistique à trancher avant la suite). Les
angles sur 180° avec miroir pour les 3 autres directions sont reportés tant que le cycle
n'est pas validé à l'échelle du bestiaire.

## Backlog conception — non scopé, en attente
- **Deuxième héros** (Archer, Sorcier — capacités distinctes du Chevalier actuel) et **tour
  "troupe"** qui invoque des unités pour aggro les monstres au sol. Intention exprimée par le PO
  (2026-08-20), aucune conception détaillée. Impact structurel à évaluer avant tout code : un
  second héros touche `hero`/`HeroDef` (aujourd'hui singulier dans `ContentPack`), une tour qui
  fait apparaître des unités introduit une entité tierce entre tour et ennemi que `core/sim.ts` ne
  modélise pas encore (aggro, PV propres, durée de vie). À cadrer en session dédiée.

## En attente côté product owner
- Fichier de contexte **lore** (format : `docs/LORE.md`) → remplacera noms/textes placeholders.
- Session **bestiaire** (nouveaux monstres + compétences spéciales → extension sim à prévoir).
- Boss final multi-phases (ch.10) → extension sim à chiffrer.

Toute décision doit rester compatible avec les Failles v1 (sim déterministe, scaling paramétré, leaderboard).
