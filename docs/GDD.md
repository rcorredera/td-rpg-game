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
| **Histoire** | Liste des 10 chapitres (ch.1 jouable, le reste « Bientôt »), état conquis par chapitre | Mode principal, remplace « Partir au combat » |
| **Failles infinies** | Porte dédiée au hub — **mode séparé, pas un chapitre**, **verrouillé tant que l'Histoire n'est pas achevée** (Roi-Charogne terrassé = ch.10 conquis). Avant : 🔒 + compteur de chapitres. Après : teaser v1 | Boucle différente (sans fin, leaderboard) ≠ Histoire (scénarisée, finie) ; l'endgame récompense la campagne |
| **Armurerie** | 3 onglets : Arsenal (unlocks ◆), Forge (bonus tours ◆), Héros (sorts ⚜ + teaser 2e héros) | Tout ce qui s'achète avec les monnaies *gagnées en jeu* |
| **Chroniques** | Top 5 des runs (avec chapitre) | Hauts faits → futur leaderboard des Failles |

Le lore (intro, noms et textes de chapitres) est du **content** : il sera adapté à partir du fichier de contexte fourni à part — format attendu dans `docs/LORE.md`.

**Direction artistique** : **cartoon militaire / sci-fi CC0** (pack **Kenney Tower Defense top-down**, vectoriel lisse 64×64), via une couche de rendu swappable — ADR-005. Terrain en tuiles (herbe + routes estampées) ; ennemis (tanks + avion), unité-héros, tours (socle octogonal + canon) et base/QG en sprites. Les tours sont **composées** (socle + tête de canon, différenciées par tête/teinte : canon simple = Tourelle, mortier = Mortier zone, canon bleu = Canon cryo). Mini-boss = même sprite agrandi/reteinté (pas de frame dédiée). Le « juice » (bob, à-coup de combat, flip, déflagration à la mort) est appliqué sur la transform des sprites, jamais dans la sim. Barres de PV, anneaux de statut, portées/auras en overlay vectoriel par-dessus. UI : Kenney UI, polices Cinzel/Alegreya, curseurs dessinés sur canvas.

> Le registre `render/sprites.ts` est le **point de swap unique** (planche TD 23×13, `frame = row*23 + col`). La couche payante visée plus tard (pack animé / peinture / commande, une fois gameplay + lore rodés) se branchera en éditant ce seul fichier — sans toucher au reste du rendu ni à la sim.

> **Wording** : noms in-game adaptés au sci-fi (Éclaireur, Blindé, Char lourd, Drone ; Tourelle, Mortier, Canon cryo + specs). La saga / les titres de chapitres / le lore profond attendent le **fichier de contexte lore du PO** (docs/LORE.md) ; le gameplay ne change pas (mapping 1:1 médiéval→militaire).

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

**Rendu net (HiDPI)** : le framebuffer est rendu à la densité de l'écran (DPR×, plafonné à 2) avec recadrage caméra — les coordonnées restent en 800×600 logique — et les textes sont rasterisés en haute résolution. Corrige le texte flou constaté au playtest.

**Backlog animations** (playtest : « peu d'animations ») : fait — marche bondissante des terrestres, flottement des volants, flammes de brûlure, étoile de spécialisation pulsée, effets du Ralliement. À venir : FX de mort (pièces d'or qui sautent), transitions d'écrans, pulsation de l'or au gain, icônes animées du HUD.

**Curseur** : gantelet de bronze (pack Kenney UI RPG, CC0) en curseur par défaut, main beige sur les éléments cliquables — l'esprit Warcraft sans toucher à des assets sous copyright.

**Sorts en icônes** : les boutons de sorts du HUD sont des **boutons-icônes carrés** (tornade = Tournoiement, étendard = Ralliement, nuée de flèches = Pluie de flèches — icônes Lorc/game-icons.net, CC BY 3.0, crédit obligatoire aux crédits du jeu) avec le cooldown en secondes sous l'icône.

**Choix de rang 4** : chaque option de spécialisation affiche ses **deltas chiffrés** (`⚔ 26→105 ⊙ 150→235 …`, ou les paramètres d'aura) en plus de son pitch — cohérent avec la règle « l'achat se décide en voyant le gain ».

**État de l'intégration** : chrome d'UI sur **Kenney UI** (`render/ui.ts`). **Monde sur le pack Kenney Tower Defense top-down** (CC0, vectoriel) via la couche swappable (ADR-005) : terrain en tuiles, ennemis (tanks/avion)/héros/tours/base en sprites retained-mode. **Polish fait** : décor dispersé (buissons/plantes, hors routes via distance-au-segment), pads de tour propres (plateforme à cible) **+ anneau doré pulsé et croix « + » sur les slots vides** (lisibilité « construire ici »), ennemis agrandis, **flammes/explosions sprites** (#296, tweenées) sur tir/mort/impact base, **chemins lissés** (spline Catmull-Rom *visuelle* à travers les waypoints — la sim suit toujours les segments linéaires, ADR-001), **menu de slot au-dessus des entités** (depth 2000). **Reste** : herbe encore un peu plate (texture/teinte de fond), rotation du canon de tourelle vers la cible, fond de menu décoré.

## Audio (plan — sourcing sans budget)

Hors scope v0 pour l'implémentation, mais le sourcing est tranché : **bibliothèques libres, coût zéro** — ni enregistrement, ni génération payante.

| Source | Licence | Usage |
|---|---|---|
| **Kenney.nl** (packs audio) | CC0 (aucun crédit requis) | Premier choix : UI, impacts, packs RPG/médiéval cohérents |
| **freesound.org** | filtrer CC0/CC-BY | Compléments ponctuels (créditer si CC-BY) |
| **OpenGameArt.org** | CC0/CC-BY/GPL | SFX + musiques de jeu |
| **Pixabay** (SFX & musique) | licence Pixabay (libre) | Ambiances, musiques de menu |
| **jsfxr / sfxr** | outil libre | Générer des blips rétro custom en 30s, zéro asset |

Intégration prévue : audio Phaser, mapping **événement → son dans le content** (les `SimEvent` existants — shot, explosion, enemyDied, castleHit, heroDied — couvrent déjà tous les déclencheurs gameplay ; ajouter les sons UI), volume global + mute persistés dans le profil. Attention mobile : l'audio web ne démarre qu'après le premier tap (autoplay policy).

## Étoiles (notation des chapitres)

Chaque victoire de chapitre est notée 1-3 ★ (défaite = 0, chapitre non conquis) :

| Note | Condition |
|---|---|
| ★★★ | Château intact **et** héros jamais mort (sans-faute) |
| ★★ | Victoire imparfaite (château touché **ou** héros mort) |
| ★ | Héros mort **et** château très entamé (> 50% des PV perdus — seuil `rating.heavyDamagePct` dans le content) |

La **meilleure** note est conservée par chapitre (jamais dégradée), affichée dans la liste Histoire et sur l'écran de victoire. Intention : la rejouabilité douce — finir la campagne d'abord, la « 3-étoiler » ensuite. Futur robinet possible : bonus d'Éclats au premier 3★ d'un chapitre (à décider).

## Campagne — plan (ADR-004)

10 chapitres **tous jouables** : le ch.1 est conçu à la main, les ch.2-10 ont un **contenu généré provisoire** (deux layouts alternés — « Faille » avec portail, « Tenailles » avec deux sources permanentes — et des vagues au volume croissant ; ch.10 : 12 vagues + mini-boss ×12 en attendant le vrai boss). Noms de chapitres = placeholders à remplacer via le fichier de lore. **Déblocage séquentiel : conquérir le chapitre N ouvre le N+1** ; les chapitres verrouillés affichent « ??? » et un cadenas. À concevoir au fil de l'eau :

- **Ch.10 — Le Roi-Charogne, boss multi-phases** : un boss qu'on tue… et qui revient plus fort. Design cible : à la mort de chaque phase, respawn avec plus de PV et une capacité supplémentaire (ex. phase 1 marche, phase 2 invoque des gobelins, phase 3 AoE qui assomme les tours). Nécessite une extension de la sim (états de boss, capacités scriptées) — à chiffrer avant le ch.10.
- **Multi-chemins** : une carte peut avoir plusieurs sources d'arrivée (`MapDef.paths`, chaque spawn choisit son chemin). Convention : tous les chemins mènent au château. Supporté par la sim dès maintenant (testé).
- **Portails de Faille** : un chemin marqué `portal` n'apparaît que lorsqu'il sert. Règle : **annoncé pendant la phase building précédente** (« ⚠ Une Faille s'ouvrira à la prochaine vague ! »), actif le temps de la vague, puis disparaît. Supporté sim + rendu ; premier usage prévu dans les chapitres à venir.
- **Tailles de cartes** : décision ouverte — tout est en 800×600 logique aujourd'hui ; des cartes plus grandes imposeraient scroll/zoom (coût UX mobile non trivial). À trancher quand on conçoit les ch.2+.

## Bestiaire

**Écran in-game** (porte du Campement) à **découverte progressive** : croiser une créature en run débloque sa page — lore + caractéristiques (PV, vitesse, or, dégâts château, riposte, volant). Non croisée = « ??? ». La découverte est trackée par la sim (`seenEnemies`) et fusionnée dans le profil en fin de run. Les stats affichées viennent du content : l'écran sert aussi de **suivi interne** de ce qui existe. Chaque monstre a 2 lignes de lore (provisoires, à harmoniser avec le fichier de lore). Les mini-boss sont présentés comme variantes renforcées, pas comme entrées séparées.

**À étoffer (session dédiée)** : le casting v0 (gobelin/orc/brute/chauve-souris) ne tiendra pas 10 chapitres. Lister : nouveaux monstres, PV/vitesse/récompenses, **compétences spéciales** (la structure actuelle `EnemyDef` ne couvre que des stats passives — soigneur, invocateur, enragé, sapeur de tours demanderont une extension sim). À nourrir aussi avec le fichier de lore (noms).

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
| Givre | **Cœur de blizzard** — aura de givre continue, ne tire plus | **Givrefeu** — gèle ET brûle 1.5% PV max/s (4s) |

La brûlure (% des **PV max**) est le contre aux sacs à PV ; le blizzard est un débuff de zone permanent (synergie avec les tours à dégâts) ; la spécialisation compte dans le remboursement à la revente. Une tour spécialisée porte une étoile dorée. Intention : décisions de build différenciées en fin de run — et les ennemis renforcés des chapitres avancés rendent ces puissances nécessaires.

**Vente** : une tour se revend à **65% de l'investissement total** (construction + upgrades) — taux dans le content, fourchette cible 60-70% à affiner au playtest. Assez punitif pour que poser une tour reste un engagement, assez généreux pour autoriser la correction d'erreur et le repositionnement tactique en fin de partie.

**Lisibilité des coûts** : dans le menu de construction/amélioration, une option inabordable est visible mais désactivée — coût en rouge, cadre grisé. Le joueur voit *ce qui existe* et *ce qui lui manque*, il ne devine pas.

**Lisibilité des améliorations** : chaque entrée du menu affiche ses chiffres — à la construction, les stats de base et le rôle (« zone · ignore les volants ») ; à l'amélioration, les **deltas** (`⚔ 12→20 · ⊙ 130→145 · 1.4→1.6/s`). Sur la carte, sélectionner une tour montre sa portée actuelle (cercle blanc) **et la portée du niveau suivant en pointillés dorés** — l'achat se décide en voyant le gain.

**Différences entre tours expliquées** : le Bestiaire a un onglet **Défenses** — une page par tour avec lore, rôle tactique mis en avant (la ligne « ⚠ ne touche PAS les volants » de la catapulte est l'info clé), progression niv.1→3 et coûts. Toujours visible (c'est l'arsenal du joueur), y compris les tours verrouillées à la méta.

## Héros

Unité déplaçable au tap, **confinée au champ de bataille** (`BATTLEFIELD`, 800×600 logiques) : depuis le viewport adaptatif (ADR-010) l'écran déborde de la carte, et un tap dans ce hors-champ ramène la cible au bord au lieu de faire déserter le héros. Même règle pour la Pluie de flèches, qui se recentre dans la carte plutôt que de brûler son cooldown dans le vide — toute action visée au tap passe par `clampToBattlefield`. **Bloque ET attaque en mêlée** (DPS continu) l'ennemi terrestre le plus avancé à portée — c'est le cœur des décisions tactiques de dernière seconde ; l'ennemi bloqué riposte. Le combat doit être lisible à l'écran (lame animée vers la cible + impact). PV, respawn 8s. **Ralliement** est lisible aussi : onde de portée dorée au lancement, et chaque tour boostée porte un anneau pulsé + chevrons ascendants pendant toute la durée du buff. Deux compétences à cooldown : Tournoiement (AoE contact) et Ralliement (buff cadence des tours proches). Talents/équipement : v1.

## Ennemis (v0)

Gobelin (rapide/fragile), Orc (standard), Brute (lent/tanky), Chauve-souris (volante, ignorée par la catapulte → force la diversité). Mini-boss vagues 5 et 10 (multiplicateur de PV).

## Économie — formules

- PV ennemi vague *n* (0-based) : `base × 1.12^n` (était 1.15 — abaissé à la passe d'équilibrage nº1 : l'or est linéaire, l'exponentielle l'écrasait dès la vague 7). Le mode Faille passera sur un exposant plus agressif + modificateurs.
- **Dégâts au château** : un ennemi qui atteint la base **explose** (fx + flash) et inflige `damageToCastle × (PV_max/PV_base)^0.5` — plus le monstre est renforcé (scaling de vague, mini-boss), plus ça fait mal : un mini-boss ×4 PV tape ×2. Exposant dans le content (`scaling.castleDamageExponent`). La base a une **barre de PV toujours visible** sur la carte (vert → jaune → rouge) + compteur `PV/PVmax` au HUD.
- Or par kill : valeur fixe par archétype (voir `src/content/index.ts`) — +30% à la passe nº1.
- Or de départ : 160 (dans le content désormais, plus en dur dans la sim).
- **Éclats fin de run** : `max(plancher, vagues×5 + bonusPV + bonusVictoire)` où bonusPV = `(PV restants / PV max) × 20` si victoire, bonusVictoire = 25, plancher = 3 dès qu'une vague est entamée. Principe : **une défaite paie toujours**, ne jamais punir l'essai.
- **Sceaux ⚜ fin de run** (monnaie du héros) : `floor(kills du héros / 4) + 2 si victoire`. Comptent les kills en mêlée et au Tournoiement (pas la Pluie de flèches : sort de compte, pas du héros). Intention : récompenser l'usage **actif** du héros, pas le camping. Deux monnaies séparées pour pouvoir équilibrer les robinets indépendamment — fusion possible plus tard si ça complexifie pour rien (voir Décisions ouvertes).

## Méta v0

Organisée dans l'**Armurerie** (+ Chroniques) — voir §Lore & présentation pour la structure :

**Arsenal** — 3 unlocks en Éclats :

| Unlock | Coût | Intention |
|---|---|---|
| Tour de givre | 30 | Le joueur joue ~2 runs avec 2 tours, puis débloque le 3e pilier (courbe d'apprentissage) |
| Pluie de flèches | 50 | Sort de compte castable en run, gros cooldown |
| Remparts renforcés | 40 | +10 PV château, premier palier passif |

**Forge** — amélioration des troupes en Éclats : par tour, **4 niveaux** à +10% de dégâts permanents (20/45/80/130 ◆). Une tour verrouillée à la méta doit d'abord être débloquée. Puits de dépense long terme des Éclats — étendu après constat de playtest : tout était acheté au ch.4.

## Équipement du héros — design (implémentation : session dédiée)

Réponse au mur de progression méta : une **page Équipement** dans l'Armurerie et du **loot aléatoire**.

- **3 emplacements** : Arme (dégâts de mêlée), Armure (PV / vitesse), Relique (effets de sorts — recharge, rayon).
- **Loot en fin de run victorieux** : un jet de butin pondéré par chapitre et par étoiles (3★ = meilleures chances). Raretés : Commun / Rare / Épique.
- **Contrainte technique posée** : le tirage vit **côté méta** (`ProfileService`, `Math.random` autorisé), jamais dans la sim — le déterminisme d'ADR-001 n'est pas négociable. La sim reçoit les stats agrégées de l'équipement via `createRun(profile)`, comme la forge.
- Doublons → recyclage en Sceaux (pas d'inventaire infini à gérer).
- À chiffrer : tables de loot dans le content, écran d'équipement, affichage des stats du héros.

**Héros** — sorts à 3 niveaux, payés en **Sceaux ⚜** : Tournoiement (dégâts/rayon ↑, recharge ↓) et Ralliement (cadence/durée ↑, recharge ↓), 4 ⚜ puis 8 ⚜ par sort. L'onglet affiche aussi un emplacement « ??? — bientôt » : teaser du 2e héros (roster v1).

**Chroniques** — top 5 des runs (vagues, kills, victoire, date), persisté dans le profil. Base du futur leaderboard des Failles : le jour où un serveur existe, ces entrées remontent telles quelles.

## Hors scope v0 (mémo pour v1+)

Failles infinies, arbre de talents héros, équipement/loot, **roster de héros** (plusieurs héros aux archétypes et capacités distincts, sélection avant run — côté code : `ContentPack.hero` deviendra `heroes: Record<id, HeroDef>` avec des skills par héros, + choix persisté dans le profil), spécialisations de tours, plusieurs maps, cloud save, leaderboards, monétisation, sons/musique.

## Décisions ouvertes

- **Or dégressif vs fixe** : fixe en v0 ; réévaluer après playtest si le snowball rend la mi-partie triviale.
- Formule Éclats : robinet principal de la méta, valeurs actuelles posées au doigt mouillé, à équilibrer dès que la v0 est jouable.
- **Deux monnaies (Éclats / Sceaux)** : choix volontaire pour équilibrer indépendamment tours et héros. Si le playtest montre que ça embrouille plus que ça ne motive, fusionner en une seule monnaie.
- **Mode de jeu** : la v0 est un mode Histoire court — 10 vagues puis victoire, pas de vagues illimitées. Les Failles infinies (scaling agressif, leaderboard) restent la cible v1 ; l'historique des runs est déjà persisté pour préparer ça.
- **Soin du héros post-boss** : idée notée (pas encore designée) — après un gros combat (mini-boss vague 5/10, futur boss ch.10), trouver un moyen de lui rendre de la vie (regen passive après un délai, palier de soin au clear de vague, objet consommable...). À trancher : mécanique automatique ou récompense active du joueur ? Lié au respawn 8s actuel (§Héros) et au boss multi-phases ch.10 (encore à scoper, voir `.ai/context.md`).
- **Wording des écrans** : « Armurerie » plutôt que « Boutique » (connotation achat réel) et « Chroniques » plutôt que « Runs » — à challenger au playtest si les joueurs ne s'y retrouvent pas.
- **Taux de revente des tours** : 65% posé arbitrairement dans la fourchette 60-70% demandée — à affiner au playtest (trop haut = repositionnement gratuit permanent, trop bas = personne ne vend).
- **Contenu généré des ch.2-10** : placeholder assumé pour tester la progression — chaque chapitre devra être repassé à la main (carte dédiée, vagues scénarisées, lore) avant d'être considéré final.
- **Passe d'équilibrage nº1** (playtest : « ch.1 infaisable en 3★, specs trop faibles ») : calibrée au **bot de simulation** (stratégies scriptées jouées par la sim headless — méthode à réutiliser pour toute passe future). Résultat : exposant PV 1.15→1.12, or +30%, départ 120→160, specs +25-35% de puissance et −20 ◆. Mesure post-passe : une stratégie mixte sans micro finit le ch.1 château intact ; le 3★ exige de garder le héros en vie (micro). À re-vérifier manette en main.
