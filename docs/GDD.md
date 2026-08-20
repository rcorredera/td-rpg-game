# GDD — Bastion (TD + RPG) — v0

> Document vivant. Toute modification de gameplay ou d'équilibrage doit être reflétée ici **dans le même commit** (Definition of Done).

## Pitch

Tower defense médiéval où chaque partie est une économie fermée (or gagné en run → tours et upgrades), enveloppée dans une méta-progression persistante (Éclats → unlock de tours, sorts, héros). Deux modes à terme : Histoire (scénarisé) et Failles infinies (scaling agressif, leaderboard potentiel). La v0 ne couvre que la boucle de base.

## Lore & présentation

**Univers** : an 312 du Vieux Royaume. Les hordes du **Roi-Charogne** déferlent du Nord ; le Bastion est la dernière place forte de la vallée, tenue par le Chevalier (le héros). Le lore reste léger : un cadre, pas un roman — chaque chapitre ajoute 2-3 lignes de contexte, c'est tout.

**Première visite** : écran d'intro lore plein écran (4 lignes + « Prendre le commandement ») qui mène directement à l'écran Histoire — le joueur sait immédiatement quoi faire. Vu une seule fois (`profile.introSeen`).

**Structure des écrans** (wording volontairement diégétique, pas de « Boutique » qui évoque l'achat réel) :

| Écran | Contenu | Pourquoi ce nom |
|---|---|---|
| **Le Campement** (hub) | 3 portes : Histoire / Armurerie / Chroniques | Lieu de vie entre les batailles |
| **Histoire** | Liste des 20 chapitres (ch.1-20 jouables, ADR-049/050), état conquis par chapitre, grille scrollable | Mode principal, remplace « Partir au combat » |
| **Failles infinies** | Porte dédiée au hub — **mode séparé, pas un chapitre**, **verrouillé tant que l'Histoire n'est pas achevée** (Le Roi Fangeux terrassé = ch.20 conquis, ADR-050 — le Roi-Charogne du ch.10 n'est plus qu'un boss intermédiaire). Avant : 🔒 + compteur de chapitres. Après : teaser v1 | Boucle différente (sans fin, leaderboard) ≠ Histoire (scénarisée, finie) ; l'endgame récompense la campagne |
| **Armurerie** | 3 onglets : Arsenal (unlocks ◆), Forge (bonus tours ◆), Héros (sorts ⚜ + teaser 2e héros) | Tout ce qui s'achète avec les monnaies *gagnées en jeu* |
| **Chroniques** | Top 5 des runs (avec chapitre) | Hauts faits → futur leaderboard des Failles |

Le lore (intro, noms et textes de chapitres) est du **content** : il sera adapté à partir du fichier de contexte fourni à part — format attendu dans `docs/LORE.md`.

**Direction artistique** : **médiéval dessiné pour le projet** (ADR-016) — aplats, contour sombre épais, silhouettes trapues, via la couche de rendu swappable (ADR-005). Chaque unité est identifiable à sa SILHOUETTE avant sa couleur : oreilles du gobelin, carrure de la brute, ailes déployées de la chauve-souris (seule horizontale = vole), verticalité de l'Archerie contre l'oblique de la Catapulte, cristal de la Tour de givre. Palette dédiée (`render/theme/palette.ts`), règle : plus une couleur est saturée, plus elle porte du sens — décor désaturé, une teinte par famille ennemie, or réservé au héros, accents vifs réservés à l'information (PV, portées, états). Tailles en unités logiques (46-62 px par ennemi, 84 px par tour, 140 px pour le Bastion) : la hiérarchie de taille est elle-même une information. Sol et chemins générés sur canvas (`render/assets/terrain.ts`). Mini-boss = même sprite agrandi/reteinté. Le « juice » (bob, à-coup de combat, flip, déflagration à la mort) est appliqué sur la transform des sprites, jamais dans la sim. Barres de PV, anneaux de statut, portées/auras en overlay par-dessus. UI : Kenney UI, polices Cinzel/Alegreya, curseurs, fonds et icônes dessinés (ADR-012/014). Historique : un skin **pixel médiéval Tiny** puis un skin **Kenney TD sci-fi** (chars et drones dans un jeu de chevaliers) ont précédé — le second remplacé pour incohérence d'univers.

> Le registre `render/assets/sprites.ts` est le **point de swap unique** (planche TD 23×13, `frame = row*23 + col`). La couche payante visée plus tard (pack animé / peinture / commande, une fois gameplay + lore rodés) se branchera en éditant ce seul fichier — sans toucher au reste du rendu ni à la sim.

> **Wording** : noms in-game **alignés sur le skin** (Gobelin, Orc, Brute, Chauve-souris ; Archerie, Catapulte, Tour de givre + specs Salve/Arc long, Trébuchet/Feu grégeois, Blizzard/Givre ardent). Règle : **le nom suit le sprite** — une passe sci-fi antérieure avait laissé un « Drone » là où l'écran montre une chauve-souris, et un « Mortier » pour une catapulte. Tout renommage de skin doit s'accompagner du renommage du contenu (ADR-016). La saga / les titres de chapitres / le lore profond attendent le **fichier de contexte lore du PO** (docs/LORE.md) ; le gameplay ne change pas.

*(Historique : v0 en vectoriel procédural « friendly » → 1er skin pixel médiéval (Kenney Tiny) → bascule sci-fi (Kenney TD), le PO ayant jugé le pixel « pas giga beau ». Le swap n'a touché que `sprites.ts`/`assets.ts` : preuve que ADR-005 tient.)*

### Sprites & UI — sourcing sans budget (comme l'audio)

Le vectoriel procédural actuel est un choix de proto ; pour passer un cap visuel, sources libres :

| Source | Licence | Pourquoi |
|---|---|---|
| **Kenney.nl** | CC0 | LE premier arrêt : il existe un pack **« Tower Defense (top-down) »** complet (tours, ennemis, tirs, terrain) + packs **UI** (boutons, panneaux, curseurs) du même style → cohérence garantie |
| **itch.io** (filtres assets gratuits) | varie (lire) | Énormément de packs médiéval/fantasy ; auteurs sûrs : Kay Lousberg (KayKit, CC0), Pixel Frog, Foozle |
| **OpenGameArt.org** | CC0/CC-BY | Fonds historique, inégal mais vaste |
| **CraftPix** (section freebies) | licence maison (jeux ok) | Packs TD/RPG dessinés, plus « pro » de finition |
| **Game-icons.net** | CC-BY | 4000+ icônes vectorielles (épées, sorts, ressources) — parfait pour l'Armurerie/HUD |

**Inspiration UI** (pour ne pas designer dans le vide) : **gameuidatabase.com** (captures d'écrans de jeux filtrables par genre/écran — chercher « tower defense », « RPG menu ») et **interfaceingame.com**. Pour les palettes : **lospec.com/palette-list**.

Règle d'intégration : un seul pack principal (Kenney TD + Kenney UI) plutôt qu'un patchwork de sources — la cohérence prime sur la richesse. L'architecture est prête : seul `render/` change, la sim n'est pas concernée (ADR-001).

**Rendu net (HiDPI)** : le framebuffer est rendu à la densité de l'écran (DPR×, plafonné à 2) avec recadrage caméra — les coordonnées restent en 960×540 logique, 16:9 (ADR-027) — et les textes sont rasterisés en haute résolution. Corrige le texte flou constaté au playtest.

**Backlog animations** (playtest : « peu d'animations ») : fait — marche bondissante des terrestres, flottement des volants, flammes de brûlure, étoile de spécialisation pulsée, effets du Ralliement. À venir : FX de mort (pièces d'or qui sautent), transitions d'écrans, pulsation de l'or au gain, icônes animées du HUD.

**Curseur** : gantelet de bronze (pack Kenney UI RPG, CC0) en curseur par défaut, main beige sur les éléments cliquables — l'esprit Warcraft sans toucher à des assets sous copyright.

**Sorts en icônes** : les boutons de sorts du HUD sont des **boutons-icônes carrés** (tornade = Tournoiement, étendard = Ralliement, nuée de flèches = Pluie de flèches — icônes Lorc/game-icons.net, CC BY 3.0, crédit obligatoire aux crédits du jeu) avec le cooldown en secondes sous l'icône.

**Choix de rang 4** : chaque option de spécialisation affiche ses **deltas chiffrés** (`⚔ 26→105 ⊙ 150→235 …`, ou les paramètres d'aura) en plus de son pitch — cohérent avec la règle « l'achat se décide en voyant le gain ».

**État de l'intégration** : chrome d'UI sur **Kenney UI** (`render/theme/ui.ts`). **Monde sur le pack Kenney Tower Defense top-down** (CC0, vectoriel) via la couche swappable (ADR-005) : terrain en tuiles, ennemis (tanks/avion)/héros/tours/base en sprites retained-mode. **Polish fait** : décor dispersé (buissons/plantes, hors routes via distance-au-segment), pads de tour propres (plateforme à cible) **+ anneau doré pulsé et croix « + » sur les slots vides** (lisibilité « construire ici »), ennemis agrandis, **flammes/explosions sprites** (#296, tweenées) sur tir/mort/impact base, **chemins lissés** (spline Catmull-Rom *visuelle* à travers les waypoints — la sim suit toujours les segments linéaires, ADR-001), **menu de slot au-dessus des entités** (depth 2000). **Reste** : herbe encore un peu plate (texture/teinte de fond), rotation du canon de tourelle vers la cible, fond de menu décoré.

## Audio (ADR-037, réglages ADR-038, musique ADR-039, retouches ADR-040/041/042)

**SFX — fait.** 8 sons CC0 Kenney (packs *Interface Sounds* + *Impact Sounds*, sourcing sans
budget comme prévu ci-dessous) : tirs (un par tour), impact/explosion, mort d'ennemi, dégât
château, mort du héros, clic UI. Registre `render/platform/audio.ts` — même famille que
`sprites.ts`/`icons.ts` (rôle → fichier, ADR-005/012), **pas dans `src/content/`** comme envisagé
initialement : le mapping événement → son est une question de PRÉSENTATION (quel SFX habille quel
`SimEvent`), pas une valeur d'équilibrage, donc hors du périmètre d'ADR-003 — exactement le même
raisonnement que pour `sprites.ts`.

**Réglages — fait (ADR-038).** Modale accessible depuis le bouton son du bandeau du Campement :
4 interrupteurs indépendants (**Tout** coupe sans effacer les préférences, **Musique**,
**Notifications** = sons d'UI, **Dégâts** = SFX de gameplay) et un volume global par paliers de
10 %. Persisté dans `Profile.audio`.

**Musique de menu — fait (ADR-039).** Piste fournie par le PO, transformée en boucle propre par
montage (fondu enchaîné sur le point de raccord). Joue uniquement au Campement, jamais pendant un
run. Licence non confirmée (nom de fichier cohérent avec un export Pixabay Music) mais jugée non
bloquante par le PO — les prochains ajouts audio seront CC0/domaine public/IA uniquement
(ADR-041). Volume abaissé à 0.35 après retour « un poil trop forte » (ADR-041).

**SFX retouchés en deux passes de playtest.** ADR-040 : clic UI trop sec (`click_001` →
`select_001`) et SFX de dégâts trop proches entre eux / pas assez médiévaux — Kenney n'a pas de
pack combat fantasy, remplacés par le **RPG Sound Pack** (CC0, OpenGameArt) : whoosh magique
(givre), déflagration (impact/sorts du héros), grognement de créature (mort d'ennemi), cliquetis
d'armure (mort du héros). ADR-041 : tir de catapulte recorrigé — le swing d'arme blanche
d'ADR-040 ne convenait pas à un engin de siège mécanique, remplacé par un thud bois lourd
(Kenney). Dégât château inchangé depuis ADR-037 (déjà distinct).

**Navigation + combat spécialisé — fait (ADR-042).** SFX fournis directement par le PO (400
Sounds Pack + Free Fantasy SFX Pack by TomMusic, itch.io). Clic UI réattribué (`item_equip`) ;
3 nouveaux sons contextuels : confirmation d'achat en Armurerie, ouverture du Bestiaire,
ouverture des Chroniques. Côté combat, le tir d'Archerie et de la Tour de givre sonnent
DIFFÉREMMENT une fois spécialisés (niv.4) — `SimEvent["shot"]` porte désormais `specId`, et
`shotSfx` choisit la variante (Bow Attack 2 pour Salve/Arc long ; Fireball pour « Givre
ardent », seule spécialisation givre qui brûle). Le héros a un son de coup d'épée, calé par le
rendu sur une cadence de swing plausible — le blocage mêlée est un DPS continu côté sim (pas un
coup par coup), donc aucun événement dédié n'existe ni n'a été ajouté pour ça.

Autoplay policy mobile (l'audio web ne démarre qu'après un premier geste) : non traitée à part,
le premier tap du joueur (menu, avant tout son) suffit à Phaser pour débloquer l'`AudioContext`.

## Étoiles (notation des chapitres)

Chaque victoire de chapitre est notée 1-3 ★ (défaite = 0, chapitre non conquis) :

| Note | Condition |
|---|---|
| ★★★ | Au moins **90 %** des PV de château conservés **et** héros jamais mort (seuil `rating.perfectHpPct`) |
| ★★ | Victoire imparfaite (château entamé au-delà du seuil **ou** héros mort) |
| ★ | Héros mort **et** château très entamé (> 50% des PV perdus — seuil `rating.heavyDamagePct`) |

Le seuil des 3★ était l'**absence totale de dégât** jusqu'à l'ADR-052. Mesuré au banc : un unique PV perdu sur dix vagues faisait retomber à 2★, ce qui rendait les 3★ *impossibles* aux ch.3, 13 et 19 quel que soit le niveau de forge, et *triviales* aux ch.14 à 18 dès forge 0. Ce n'était pas une difficulté, c'était un tout-ou-rien. À 90 %, les 3★ redeviennent un objectif que la méta rapproche progressivement.

Les étoiles **paient** (ADR-052) : `rewards.shardsPerStar` = 12 Éclats par étoile, multiplicateur de chapitre compris — 3★ au ch.20 valent 187 Éclats, soit deux rangs de forge. C'est le pont explicite entre « maîtriser un chapitre » et « avoir des tours plus fortes », là où l'or de la partie s'en chargeait seul auparavant.

La **meilleure** note est conservée par chapitre (jamais dégradée), affichée dans la liste Histoire et sur l'écran de victoire. Intention : la rejouabilité douce — finir la campagne d'abord, la « 3-étoiler » ensuite.

## Campagne — plan (ADR-004, étendue ADR-049/050)

**20 chapitres tous jouables**, en deux actes : le ch.1 est conçu à la main, les ch.2-20 ont un **contenu généré provisoire** — vagues au volume croissant, mais depuis l'ADR-027 chaque chapitre a sa **propre topologie** (1 à 3 voies selon le chapitre, en écho à son biome ; ch.11-19 réutilisent la géométrie de ch.2-10, déjà validée, avec un nouvel habillage). Noms de chapitres = placeholders à remplacer via le fichier de lore. **Déblocage séquentiel : conquérir le chapitre N ouvre le N+1** ; les chapitres verrouillés affichent « ??? » et un cadenas.

- **Ch.10 — Le Roi-Charogne** : boss INTERMÉDIAIRE depuis ADR-049/050 (12 vagues, Vouivre en finale ×2,8) — ne conclut plus l'Histoire, mais reste un vrai pic de difficulté à mi-parcours.
- **Ch.20 — Le Roi Fangeux, vrai boss final** : 12 vagues, boss dédié (`the_gravedigger`, jamais en trash, hpMult ×2,8) — hérite de l'invariant ADR-024 (infranchissable sans la Forge maxi) et du déblocage des Failles infinies, tous deux calculés dynamiquement sur le DERNIER chapitre jouable (aucun changement de code requis en ajoutant ch.11-20, cf. `.ai/pitfalls.md`).
- **Boss multi-phases** (idée non retenue pour ch.10 ni ch.20) : un boss qu'on tue… et qui revient plus fort, respawn avec plus de PV et une capacité supplémentaire par phase. Nécessiterait une extension de la sim (états de boss, capacités scriptées) — non chiffré, reste une piste pour un futur "acte 3" plutôt qu'un besoin actuel.
- **Multi-chemins** : une carte peut avoir plusieurs sources d'arrivée (`MapDef.paths`, chaque spawn choisit son chemin). Convention : tous les chemins mènent au château. Supporté par la sim dès maintenant (testé).
- **Portails de Faille** : un chemin marqué `portal` n'apparaît que lorsqu'il sert. Règle : **annoncé pendant la phase building précédente** (« ⚠ Une Faille s'ouvrira à la prochaine vague ! »), actif le temps de la vague, puis disparaît. Supporté sim + rendu ; premier usage prévu dans les chapitres à venir.
- **Tailles de cartes** : tranché — canevas 960×540 (16:9, ADR-027), sans scroll/zoom ; chaque chapitre a sa propre géométrie de carte (1 à 3 voies).

## Bestiaire (ADR-022, étendu ADR-043/044/045/049/050)

Vingt-quatre créatures (premier acte : quatorze, ch.1-10 ; deuxième acte : dix,
ch.11-20 — neuf créatures normales ch.11-19 + Le Roi Fangeux, boss dédié du ch.20, voir
ADR-049/050). Chacune est conçue pour **neutraliser une tour et en valoriser une
autre** — une créature qui n'invalide rien n'ajoute que de la difficulté, jamais de
décision.

| Créature | Question posée | Neutralise | Valorise |
|---|---|---|---|
| Gobelin / Orc / Brute | volume, encaissement | — | socle |
| Chauve-souris | le ciel, léger | catapulte | archerie |
| **Diablotin de faille** | saturation (14 PV, très serrés) | le mono-cible | catapulte |
| **Scorpion des sables** | saturation cuirassée (armure 2) | le mono-cible léger | catapulte soutenue |
| **Spectre** | insensible au ralentissement | tour de givre | puissance brute |
| **Troll** | encaissement mono-cible lourd | le focus isolé | tours à zone |
| **Gargouille** | volant *lourd* (115 PV) | catapulte | archerie investie |
| **Ogre** | cuirassé intermédiaire (armure 6) | tirs légers | gros coups |
| **Golem de fer** | cuirassé (armure 11) | tirs rapides et faibles | gros coups, brûlure |
| **Chevalier noir** | élite rapide et cuirassée (armure 4) | le volume dispersé | dégâts mono-cible investis |
| **Chef de guerre** | boss terrestre intermédiaire (vagues 5 et 10) | les tours à zone | dégâts mono-cible |
| **Vouivre** | boss **volant** intermédiaire (chapitre 10) | toute défense au sol | anti-aérien |
| **Gelée Enragée** | saturation, fin de campagne (ch.11) | le mono-cible | catapulte |
| **Gardien des Ombres** | encaissement passif, sans armure chiffrée (ch.12) | tirs isolés | cadence soutenue |
| **Gardien à Quatre Yeux** | cuirassé et à portée de mêlée (armure 8, ch.13) | tirs légers | gros coups, en avance |
| **Ermite Corrompu** | encaissement lourd (armure 5, ch.14) | tirs rapides et faibles | tours à zone |
| **Piqueur Écarlate** | saturation, plus dense que la Gelée (ch.15) | le mono-cible | catapulte |
| **Ossements Hurlants** | encaissement lourd, insensible au froid (ch.16) | tour de givre | puissance brute |
| **Pillard des Frontières** | volume mono-cible standard, plus rapide (ch.17) | — | dégâts constants |
| **Maraudeur des Failles** | mono-cible standard (ch.18) | — | dégâts constants |
| **Assassin Voilé** | élite rapide à haut DPS, faible en PV (ch.19) | le manque de focus | dégâts mono-cible investis |
| **Le Roi Fangeux** | boss terrestre **final** (chapitre 20, ADR-050) | les tours à zone | dégâts mono-cible investis |

**Deux mécaniques** portent ces rôles, toutes deux dans le content :
- `armor` — réduction plate par coup, avec un plancher à 25 % des dégâts bruts. La
  **brûlure en % des PV max l'ignore** : c'est ce qui donne enfin une raison de
  préférer « Feu grégeois » à « Trébuchet ».
- `slowImmune` — interdit de bâtir toute sa défense sur le contrôle.

**Progression** : une créature apparaît à chacun des chapitres 2 à 9 (rat, spectre,
gargouille, golem, puis scorpion, troll, ogre, chevalier noir), le chapitre 10 les
mélange toutes. La **3e vague** de chaque chapitre la présente seule : une mécanique
s'enseigne avant de se combiner, et jamais quand elle est encore imparable — placée en
2e vague, le joueur n'avait que deux tours et perdait la moitié de son château. Le
chevalier noir peut aussi se substituer au Chef de guerre comme mini-boss de vague 5 à
partir du chapitre 9 (variété d'élite plutôt que systématiquement le même boss).

**Deuxième acte (ADR-049/050, en cours)** : les dix créatures de ch.11-20 (dont Le Roi
Fangeux, boss dédié) existent dans le bestiaire (`CONTENT.enemies`, sprites détourés)
mais n'apparaissent encore dans AUCUNE vague — les chapitres 11-20 eux-mêmes (cartes,
vagues, équilibrage) ne sont pas encore construits. Cette entrée sera mise à jour
chapitre par chapitre à mesure qu'ils sont livrés ; en attendant, le Bestiaire les liste
comme non-découvertes (`X/24`).

Le Bestiaire **affiche les traits** (`cuirassé 11`, `insensible au froid`) à côté de
« volant » : sa promesse est « connaître l'ennemi, c'est déjà le vaincre », et taire
ce qui décide du choix de tour la contredit.

**Propriété acquise** : le chapitre 10 est infranchissable sans méta-progression et
franchissable avec (mesuré : 11 vagues sur 12 avec un profil vierge, victoire à 16 PV
avec un profil équipé). La boucle run → monnaies → run plus fort cesse d'être décorative.


## Boucle in-run

Le joueur place des tours sur des emplacements fixes. Les ennemis suivent un chemin prédéfini. Chaque kill rapporte de l'or **fixe** (décision : pas de dégressif en v0, à réévaluer au playtest si snowball — voir Décisions ouvertes). L'or finance constructions et upgrades pendant la partie. Le joueur déclenche chaque vague manuellement (phase `building` → `wave`) ; un toggle **Auto** enchaîne les vagues suivantes après 2s de phase building — la première vague reste toujours manuelle (le joueur pose ses premières tours à son rythme). Vitesse x1/x2 disponible. Fin de run : victoire (10 vagues) ou défaite (PV château à 0). **Abandon** possible en cours de run (bouton ⟵ Camp, avec confirmation) : la run est perdue et ne rapporte aucun Éclat — sinon farm trivial du plancher de 3 Éclats.

## Tours (v0 : triangle de rôles)

| Tour | Rôle | Particularité |
|---|---|---|
| Archerie | DPS monocible polyvalent | Pas chère, cible les volants |
| Catapulte | AoE anti-pack | `groundOnly` : ignore les volants |
| Tour de givre | Utilitaire | Ralentit (slow 0.55, 1.6s) — **verrouillée à la méta** |

3 niveaux d'upgrade in-run par tour, puis **niveau 4 : spécialisation** — un choix **exclusif et définitif** entre deux voies, payé cher en or (220-260 ◆, vrai engagement de fin de partie) :

| Tour | Voie A | Voie B |
|---|---|---|
| Archerie | **Volée** — tire sur 3 cibles à la fois | **Œil du faucon** — portée immense, flèches lourdes |
| Catapulte | **Trébuchet** — plus loin, plus fort, plus large | **Feu grégeois** — la zone brûle 2% PV max/s (3s) |
| Givre | **Blizzard** — aura de givre continue (rayon 200, ralentit + 3 dégâts plats/s), ne tire plus | **Givre ardent** — gèle ET brûle 2.5% PV max/s (4s) |

La brûlure (% des **PV max**) est le contre aux sacs à PV ; le blizzard est un débuff de zone permanent (synergie avec les tours à dégâts) ; la spécialisation compte dans le remboursement à la revente. Une tour spécialisée porte une étoile dorée. Intention : décisions de build différenciées en fin de run — et les ennemis renforcés des chapitres avancés rendent ces puissances nécessaires.

**Vente** : une tour se revend à **65% de l'investissement total** (construction + upgrades) — taux dans le content, fourchette cible 60-70% à affiner au playtest. Assez punitif pour que poser une tour reste un engagement, assez généreux pour autoriser la correction d'erreur et le repositionnement tactique en fin de partie.

**Lisibilité des coûts** : dans le menu de construction/amélioration, une option inabordable est visible mais désactivée — coût en rouge, cadre grisé. Le joueur voit *ce qui existe* et *ce qui lui manque*, il ne devine pas. Appliqué aussi à l'**Armurerie** (Arsenal, Forge, Héros) depuis la migration sur `uiListRow` (ADR-013) : la règle vaut partout où un prix est affiché, pas seulement en run.

**Lisibilité des améliorations** : chaque entrée du menu affiche ses chiffres — à la construction, les stats de base et le rôle (« zone · ignore les volants ») ; à l'amélioration, les **deltas** (`⚔ 12→20 · ⊙ 130→145 · 1.4→1.6/s`). Sur la carte, sélectionner une tour montre sa portée actuelle (cercle blanc) **et la portée du niveau suivant en pointillés dorés** — l'achat se décide en voyant le gain.

**Différences entre tours expliquées** : le Bestiaire a un onglet **Défenses** — une page par tour avec lore, rôle tactique mis en avant (la ligne « ⚠ ne touche PAS les volants » de la catapulte est l'info clé), progression niv.1→3 et coûts. Toujours visible (c'est l'arsenal du joueur), y compris les tours verrouillées à la méta.

## Héros

Unité déplaçable au tap, **confinée au champ de bataille** (`BATTLEFIELD`, 960×540 logiques, ADR-027) : depuis le viewport adaptatif (ADR-010) l'écran déborde de la carte, et un tap dans ce hors-champ ramène la cible au bord au lieu de faire déserter le héros. Même règle pour la Pluie de flèches, qui se recentre dans la carte plutôt que de brûler son cooldown dans le vide — toute action visée au tap passe par `clampToBattlefield`. **Bloque ET attaque en mêlée** (DPS continu) l'ennemi terrestre le plus avancé à portée — c'est le cœur des décisions tactiques de dernière seconde ; l'ennemi bloqué riposte. Le combat doit être lisible à l'écran (lame animée vers la cible + impact). PV, respawn 8s. **Ralliement** est lisible aussi : onde de portée dorée au lancement, et chaque tour boostée porte un anneau pulsé + chevrons ascendants pendant toute la durée du buff. Deux compétences à cooldown : Tournoiement (AoE contact) et Ralliement (buff cadence des tours proches). Talents/équipement : v1.

## Ennemis (v0)

Gobelin (rapide/fragile), Orc (standard), Brute (lent/tanky), Chauve-souris (volante, ignorée par la catapulte → force la diversité). Mini-boss vagues 5 et 10 (multiplicateur de PV).

## Économie — formules

- PV ennemi vague *n* (0-based) : `base × 1.12^n` (était 1.15 — abaissé à la passe d'équilibrage nº1 : l'or est linéaire, l'exponentielle l'écrasait dès la vague 7). Le mode Faille passera sur un exposant plus agressif + modificateurs.
- **Dégâts au château** : un ennemi qui atteint la base **explose** (fx + flash) et inflige `damageToCastle × (PV_max/PV_base)^0.5` — plus le monstre est renforcé (scaling de vague, mini-boss), plus ça fait mal : un mini-boss ×4 PV tape ×2. Exposant dans le content (`scaling.castleDamageExponent`). La base a une **barre de PV toujours visible** sur la carte (vert → jaune → rouge) + compteur `PV/PVmax` au HUD.
- **Or in-run : BUDGÉTÉ, pas émergent** (ADR-052). Chaque chapitre a un budget d'or écrit dans le content (`economy.chapterBudget`), et non plus une somme qui *tombe* du nombre de créatures tuées. Répartition : `economy.killGoldShare` = **25 %** versés à la mort des créatures (le retour « j'ai tué, j'ai été payé » est conservé sur chaque kill), **75 %** versés à la fin de chaque vague nettoyée, au prorata du poids de la vague — les dernières vagues restent les plus lucratives, sans que leur effectif puisse gonfler le total. Les `goldReward` du bestiaire ne sont donc plus des montants mais une **clé de répartition**.
- **Calibrage des budgets** : `emplacements × 537 × ratio`, où 537 = coût d'une tour rang 3 + spécialisation, et le ratio monte de **0,50 (ch.1) à 0,84 (ch.19)**. Sous 1, l'or seul ne finance **jamais** une défense complète : l'écart se comble à la forge. Les chapitres à boss dédié (10 et 20) reçoivent 1,05 — 12 vagues sur *moins* d'emplacements, le ratio par slot les affamait (mesuré : ch.10 invincible même forge 6).
- Pourquoi : au per-kill pur, le ch.20 versait **9 001 pièces pour 6 emplacements**, soit 2,8× le plafond de dépense. Passé le ch.12, l'or cessait d'être une contrainte, tout était maxé dès la vague 6 et la forge ne décidait plus rien — les ch.14 à 18 étaient 3★ à forge 0. C'est aussi la condition des **Failles infinies** : avec de l'or par kill, un mode à vagues infiniment croissantes diverge par construction.
- Or de départ : 160 (dans le content, plus en dur dans la sim).
- **Éclats fin de run** : `max(plancher, (vagues×5 + bonusPV + bonusVictoire) × multChapitre)` où bonusPV = `(PV restants / PV max) × 20` si victoire, bonusVictoire = 25, plancher = 3 dès qu'une vague est entamée. Principe : **une défaite paie toujours**, ne jamais punir l'essai. Barème dans le content (`rewards`) depuis ADR-018 — il vivait en dur dans `computeResult`, hors de portée d'ADR-003, ce qui explique qu'il n'ait jamais suivi le reste. `shardsChapterMult` porte la courbe par chapitre : **×1 au ch.1 → ×3,32 au ch.10 → ×5,60 au ch.20** (ADR-021, étendue ADR-049/051). Sans elle, le ch.10 ne rapportait que ×1,11 le ch.1 et farmer la carte la plus facile était strictement optimal. Depuis l'ADR-052 la formule inclut `étoiles × shardsPerStar` (voir §Étoiles).
- **Sceaux ⚜ fin de run** (monnaie du héros) : `floor(secondes de blocage / 9) + 2 si victoire − 1 par mort du héros`, jamais négatif. Le compteur tourne tant que le héros **retient** un ennemi au corps à corps. Indexés sur ses **kills** jusqu'à l'ADR-021, ils payaient le mauvais placement : mesuré au banc, un héros posté à l'entrée tue beaucoup et laisse le château tomber, un héros en dernier rempart tue moins et fait *gagner*. La pénalité de mort évite l'inverse — se jeter dans la horde pour mourir aussitôt. Gain réel mesuré : **2 à 4 Sceaux par run**. Deux monnaies séparées pour équilibrer les robinets indépendamment.

## Équilibrage — méthode et constats (ADR-018)

`npm run balance` mesure le jeu sans y jouer : fiches d'ennemis et de tours, masse et
pression de chaque chapitre, santé de la méta, et un joueur artificiel qui rejoue les
20 chapitres selon trois stratégies. Les passes précédentes utilisaient un bot jetable
jamais commité — d'où des mesures invérifiables et une méthode réinventée à chaque fois.

`npm run balance -- --chapter 3` détaille un chapitre (pression vague par vague + trace).

**Constats de la première exécution — aucun n'est encore corrigé :**

| Constat | Mesure | Conséquence de design |
|---|---|---|
| Récompense indépendante du chapitre | ch.10 = ×1,11 le ch.1 | Farmer le ch.1 est optimal |
| Puits trop petit | Armurerie vidée en 2 runs, sorts en 2 runs | Méta morte à 20 % du jeu |
| Difficulté non monotone | ch.3 perdu, ch.4-9 gagnés | Plus tardif = plus d'or = plus facile |
| L'or cesse de contraindre | 1 800-3 800 pièces inutilisées au ch.10 | 6 emplacements partout : plus de décision |
| Sceaux mal indexés | Héros posté au fond : moins de kills, plus de victoires | La monnaie paie le mauvais placement |
| ~~Pas de triangle de rôles~~ | **corrigé** — ADR-020 | voir ci-dessous |

### Triangle de rôles (ADR-020) — corrigé

Le triangle annoncé plus haut n'existait que dans l'intention : l'archerie seule
gagnait 9 chapitres sur 10 quand le mélange des trois n'en gagnait que 5.

| Composition | Victoires | PV château | Étoiles |
|---|---|---|---|
| **Les trois** | **10/10** | **170** | **19** |
| Archerie seule | 7/10 | 68 | 10 |
| Tour de givre seule | 1/10 | 5 | 1 |
| Catapulte seule | 0/10 | 0 | 0 |

**Le levier décisif n'était pas dans les tours mais dans l'espacement des vagues.**
Renforcer catapulte et givre plafonnait l'écart à +1 victoire ; resserrer les spawns
à ×0,7 l'a porté à +4 (l'archerie seule chute de 7 à 4). À effectif égal, une vague
serrée écrase une défense mono-cible — c'est le resserrement, et non le nombre, qui
donne son rôle aux tours à zone. Les quatre premières vagues du chapitre 1 restent
aérées : c'est la seule école du joueur, et il n'y a pas encore la Tour de givre.

Deux corrections en découlaient : mini-boss allégés (jusqu'à ×12 → ×7 — un boss est
une cible *isolée*, l'AoE n'y peut rien) et **8 emplacements** au lieu de 6 sur les
chapitres 2-10, le chapitre 1 en gardant 6.

Règle à retenir pour le contenu : **un ennemi « anti-X » ne crée de la stratégie que
si la tour censée le contrer vaut la peine d'être construite.** Deux tests le
garantissent désormais (mélange > chaque tour seule, aucune tour ne finit le jeu
seule), prouvés par mutation.

Matière encore disponible côté ennemis : les volants ne pèsent que **9 % des PV** —
l'anti-aérien n'est presque jamais une contrainte.

**Fenêtre de tir** — la métrique reine d'un TD : le DPS installé × le temps de traversée
borne les dégâts infligeables. Une vague dont les PV dépassent ce produit passe quelle
que soit la façon de jouer. C'est la colonne « Charge » du rapport de pression.

## Méta v0

Organisée dans l'**Armurerie** (+ Chroniques) — voir §Lore & présentation pour la structure :

**Arsenal** — 6 paliers en Éclats, **450 au total**. La méta vend des **paliers de puissance**, plus des tours entières (ADR-024) : verrouiller la Tour de givre rendait le chapitre 1 très rude, et **un joueur bloqué ne gagne pas de quoi se débloquer**. Les trois tours sont donc constructibles dès la première partie, ainsi que leurs trois rangs ; c'est le **rang 4** qui s'achète. Chaque entrée porte ses propres effets dans le content : ajouter un palier ne touche plus à la simulation (ADR-021).

| Palier | Coût | Intention |
|---|---|---|
| Remparts renforcés | 40 | +10 PV château, premier palier passif |
| Pluie de flèches | 55 | Sort de compte castable en run, gros cooldown |
| Doctrines de siège | 60 | Débloque les spécialisations de rang 4 |
| Coffre de guerre | 75 | +70 or au départ — ouvre d'autres ouvertures de partie |
| Serment du Chevalier | 90 | Héros de retour 3 s plus tôt : soutient le rôle de bloqueur que paient les Sceaux |
| Donjon de pierre | 130 | +15 PV château, palier tardif |

**Boss** — un boss de vague doit être **abattu**. S'il atteint le château, la partie est perdue : un ennemi ordinaire coûte des PV, un boss coûte le niveau. Auparavant il en était simplement retiré, la vague se terminait et la victoire tombait quand même. Leurs multiplicateurs ont baissé d'environ 30 % en conséquence — les rendre éliminatoires change leur fonction.

**Forge** — amélioration des troupes en Éclats : par tour, **6 rangs** à +10% de dégâts permanents (20/45/80/130/200/300 ◆), soit **2 325 Éclats** au total. C'est le puits long terme des Éclats ET la **condition du dernier chapitre** : le boss final n'est pas abattable avec des tours jamais forgées, quelle que soit la stratégie (testé, ADR-024). Sans cette contrainte la Forge n'était qu'un puits facultatif — mesuré, elle ne pesait que 5 PV de château cumulés sur les dix chapitres.

## Équipement du héros — design (implémentation : session dédiée)

Réponse au mur de progression méta : une **page Équipement** dans l'Armurerie et du **loot aléatoire**.

- **3 emplacements** : Arme (dégâts de mêlée), Armure (PV / vitesse), Relique (effets de sorts — recharge, rayon).
- **Loot en fin de run victorieux** : un jet de butin pondéré par chapitre et par étoiles (3★ = meilleures chances). Raretés : Commun / Rare / Épique.
- **Contrainte technique posée** : le tirage vit **côté méta** (`ProfileService`, `Math.random` autorisé), jamais dans la sim — le déterminisme d'ADR-001 n'est pas négociable. La sim reçoit les stats agrégées de l'équipement via `createRun(profile)`, comme la forge.
- Doublons → recyclage en Sceaux (pas d'inventaire infini à gérer).
- À chiffrer : tables de loot dans le content, écran d'équipement, affichage des stats du héros.

**Héros** — sorts à **4 niveaux**, payés en **Sceaux ⚜** : Tournoiement (dégâts/rayon ↑, recharge ↓) et Ralliement (cadence/durée ↑, recharge ↓), 4 puis 8 puis 16 ⚜ par sort — **56 ⚜ au total**, soit une douzaine de parties. À 3 niveaux et 24 ⚜, tout était maxé en 2 runs (ADR-021). L'onglet affiche aussi un emplacement « ??? — bientôt » : teaser du 2e héros (roster v1).

**Chroniques** — top 5 des runs (vagues, kills, victoire, date), persisté dans le profil. Base du futur leaderboard des Failles : le jour où un serveur existe, ces entrées remontent telles quelles.

## Failles infinies — design v1 (intention du PO, non implémenté)

Mode d'**endgame**, débloqué une fois l'Histoire terminée. Difficulté croissante sans
fin : chaque palier franchi durcit le suivant.

- **Troisième monnaie**, gagnée uniquement en Faille. Elle alimente un puits que
  l'Histoire n'atteint pas : amélioration des **dégâts de base** des tours au-delà des
  quatre niveaux de Forge, et surtout amélioration des **spécialisations** elles-mêmes
  — quitte à en ajouter de nouvelles réservées à ce mode.
- **Beaucoup de cartes** : un mode sans fin consomme les parcours bien plus vite qu'une
  campagne de vingt chapitres. À prévoir comme une contrainte de production, pas comme un
  détail — c'est probablement là que se justifiera une génération procédurale de
  tracés, contrainte par les garanties de carte de l'ADR-019 (couverture ≥ 2/3 des
  emplacements par voie, écart de longueur entre voies < 25 %).
- Le socle existe déjà : historique des runs persisté (Chroniques), scaling paramétré
  (`scaling.hpExponent`), et le banc d'essai (ADR-018) sait mesurer un chapitre
  arbitraire — donc calibrer une courbe infinie.

**Point de vigilance** : la méta de l'Histoire vient d'être remise sous tension
(ADR-021). Une troisième monnaie qui améliore les tours doit être réglée *après* la
campagne, sans quoi elle rendra les chapitres 1-20 triviaux au rejeu.

**L'or in-run est prêt pour ce mode** (ADR-052) : il est désormais *budgété* par
chapitre et non plus produit par les kills. Un mode à vagues infiniment croissantes
aurait fait diverger un or par kill par construction — plus de créatures = plus d'or =
la difficulté ne mord jamais, exactement ce qui était mesuré au ch.20. Il ne restera
qu'à remplacer la table `economy.chapterBudget` par une **formule de budget par
vague** ; la répartition 25 % kills / 75 % fin de vague, elle, se transpose telle
quelle.

## Hors scope v0 (mémo pour v1+)

Failles infinies, arbre de talents héros, équipement/loot, **roster de héros** (plusieurs héros aux archétypes et capacités distincts, sélection avant run — côté code : `ContentPack.hero` deviendra `heroes: Record<id, HeroDef>` avec des skills par héros, + choix persisté dans le profil), spécialisations de tours, plusieurs maps, cloud save, leaderboards, monétisation, sons/musique.

## Décisions ouvertes

- **Or dégressif vs fixe** : fixe en v0 ; réévaluer après playtest si le snowball rend la mi-partie triviale.
- Formule Éclats : robinet principal de la méta, valeurs actuelles posées au doigt mouillé, à équilibrer dès que la v0 est jouable.
- **Deux monnaies (Éclats / Sceaux)** : choix volontaire pour équilibrer indépendamment tours et héros. Si le playtest montre que ça embrouille plus que ça ne motive, fusionner en une seule monnaie.
- **Mode de jeu** : l'Histoire compte désormais 20 chapitres scriptés en deux actes (ADR-049/050, décision explicite du joueur plutôt que les Failles infinies initialement prévues comme seul contenu post-ch.10). Les Failles infinies (scaling agressif, leaderboard) restent la cible v1 pour l'ENDGAME (après ch.20) ; l'historique des runs est déjà persisté pour préparer ça.
- **Soin du héros post-boss** : idée notée (pas encore designée) — après un gros combat (mini-boss vague 5/10, futur boss ch.10), trouver un moyen de lui rendre de la vie (regen passive après un délai, palier de soin au clear de vague, objet consommable...). À trancher : mécanique automatique ou récompense active du joueur ? Lié au respawn 8s actuel (§Héros) et au boss multi-phases ch.10 (encore à scoper, voir `.ai/context.md`).
- **Wording des écrans** : « Armurerie » plutôt que « Boutique » (connotation achat réel) et « Chroniques » plutôt que « Runs » — à challenger au playtest si les joueurs ne s'y retrouvent pas.
- **Taux de revente des tours** : 65% posé arbitrairement dans la fourchette 60-70% demandée — à affiner au playtest (trop haut = repositionnement gratuit permanent, trop bas = personne ne vend).
- **Contenu généré des ch.2-10** : placeholder assumé pour tester la progression — chaque chapitre devra être repassé à la main (carte dédiée, vagues scénarisées, lore) avant d'être considéré final.
- **Passe d'équilibrage nº1** (playtest : « ch.1 infaisable en 3★, specs trop faibles ») : calibrée au **bot de simulation** (stratégies scriptées jouées par la sim headless — méthode à réutiliser pour toute passe future). Résultat : exposant PV 1.15→1.12, or +30%, départ 120→160, specs +25-35% de puissance et −20 ◆. Mesure post-passe : une stratégie mixte sans micro finit le ch.1 château intact ; le 3★ exige de garder le héros en vie (micro). À re-vérifier manette en main.
