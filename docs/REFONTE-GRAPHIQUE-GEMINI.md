# Refonte graphique — table de correspondance & prompts Gemini

Document de travail (PO). Chaque ligne = **un fichier à remplacer sur place**, même chemin,
même nom. Le code n'a alors rien à changer : `sprites.ts` / `assets.ts` / `icons.ts` pointent
déjà dessus (point de swap unique, ADR-005/012).

## Méthode : tu génères, tu déposes, je fais le reste

1. Tu génères les créatures avec le préambule + leur prompt spécifique.
2. **Tu déposes les JPEG tels quels**, sans rien détourer, en les nommant d'après leur
   `defId` (`troll.jpeg`, `dark_knight.jpeg`…). Un dossier commun suffit, tu me donnes le
   chemin.
3. Je convertis en PNG, je passe `npm run sprite` — qui **retire le fond blanc lui-même**
   (ADR-063), décape la frange, rogne, adoucit le bord et réduit à 256 px —, je place le
   fichier sous son `defId`, je recâble `assets.ts`, je lance tests / lint / build et je
   contrôle le rendu en jeu.

**Ne détoure plus rien sous Photoshop.** C'était contre-productif : une sélection dure
supprime l'anticrénelage et rend les pixels de frange totalement opaques — la reprise
« plus propre » du scorpion était pire que la première (1 067 → 3 552 pixels clairs en
bordure). L'outil s'appuie sur une propriété vraie de tous ces sprites : fond uni clair,
contour noir fermé.

Les noms de fichiers actuels viennent des packs sources, pas du jeu — d'où le renommage.

### Convention de nommage

**`<defId>.png`, snake_case strict**, identique à l'id dans `src/content/enemies.ts` /
`towers.ts`. Le nom de fichier devient dérivable de l'entité. Fin du mélange kebab/snake.

| defId | Nom actuel | Nouveau nom |
|---|---|---|
| `rat` → **`diablotin`** (ADR-061) | `imp.png` | `diablotin.png` |
| `scorpion` | `scorpion.png` | inchangé |
| `goblin` | `goblin-knight.png` | `goblin.png` |
| `wraith` | `ghost.png` | `wraith.png` |
| `bat` | `bat-ai.png` | `bat.png` |
| `orc` | `orc-fang.png` | `orc.png` |
| `troll` | `troll.png` | inchangé |
| `dark_knight` | `dark-knight.png` | `dark_knight.png` |
| `gargoyle` | `gargoyle-ai.png` | `gargoyle.png` |
| `brute` | `brute-zombie.png` | `brute.png` |
| `ogre` | `ogre.png` | inchangé |
| `golem` | `steel-golem.png` | `golem.png` |
| `warlord` | `warlord.png` | inchangé |
| `wyvern` | `wyvern-ai.png` | `wyvern.png` |
| `bog_sprite` … `the_gravedigger` (acte II) | `bog_sprite.png` … | inchangés (déjà conformes) |
| héros | `hero-ai.png` | `hero.png` |

Tours — suffixe pour le palier et la spécialisation :

| Sprite | Nom actuel | Nouveau nom |
|---|---|---|
| Archerie paliers 1-2 | `tower-archer-ai.png` | `tower_archer.png` |
| Archerie palier 3 | `tower-archer-3-ai.png` | `tower_archer_t3.png` |
| Spé. Arc long | `tower-archer-longbow-ai.png` | `tower_archer_spec_longbow.png` |
| Spé. Volée | `tower-archer-volley-ai.png` | `tower_archer_spec_volley.png` |
| Givre paliers 1-2 | `tower-frost-ai.png` | `tower_frost.png` |
| Givre palier 3 | `tower-frost-3-ai.png` | `tower_frost_t3.png` |
| Spé. Givre ardent | `tower-frost-frostfire-ai.png` | `tower_frost_spec_frostfire.png` |
| Spé. Blizzard | `tower-frost-blizzard-ai.png` | `tower_frost_spec_blizzard.png` |

Le suffixe de spé reprend le `specId` tel quel (`spec_longbow`, `spec_frostfire`…).

À la fin de la série, le dossier `skin-craftpix/` ne contiendra plus rien de CraftPix : il
sera renommé (`skin-ai/` ou équivalent) et le README des licences mis à jour, via un ADR.

## Règles à respecter, sinon ça casse

1. **Je m'occupe du renommage et du recâblage.** `assets.integrity.test.ts` échoue si un
   fichier cité n'existe pas, ou si un fichier présent n'est chargé par personne — donc pas
   de dépôt « en avance » d'un asset sans entité correspondante.
2. **Dépose les JPEG bruts, fond blanc compris.** Le détourage est fait par l'outil
   (ADR-063) : remplissage depuis les bords, qui épargne les zones claires ENFERMÉES dans
   le dessin (reflets d'armure, yeux, dents). Ce que le prompt doit garantir, c'est un
   **fond uni clair** et un **contour noir fermé** — les deux conditions du procédé.
3. **Ne rogne pas, ne redimensionne pas, ne retouche pas.** L'outil rogne au pixel près sur
   l'alpha et réduit à 256 px de grand côté. À la main, on laisse toujours du jeu — et les
   tailles d'affichage (`size` dans `sprites.ts`) supposent un sprite serré : du vide autour
   donne un sprite qui paraît deux fois trop petit en jeu.
4. **Proportions natives libres** (`fitSquare` s'en charge, ADR-046) — pas besoin de carré.
5. **Ne pas remplacer les `.svg` par des `.png`** : ils sont chargés via `load.svg` avec une
   taille de rasterisation. Un PNG à la place échoue au chargement. Voir « Cas particulier SVG ».
6. **Licences** : tout ce qui est régénéré par IA sort du périmètre CraftPix/CC0 — ça simplifie.
   `public/assets/README.md` devra être mis à jour à la fin.

## Préambule commun à coller devant CHAQUE prompt

Calé sur le style RÉEL des sprites en place (`diablotin.png`, `hero-ai.png`, `the_gravedigger.png`) :
cartoon fantasy, contour noir épais, vue frontale, silhouette compacte verticale.

> Style : **art de jeu cartoon fantasy, couleurs saturées avec modelé peint à l'intérieur des
> formes** (volumes, ombres et lumières, pas des aplats plats), **épais contour NOIR uniforme
> sur tout le pourtour du personnage**. Vue **frontale, à hauteur d'œil, sujet face au
> spectateur** — surtout pas de profil, pas de plongée. Proportions **stylisées, pas
> réalistes** : tête surdimensionnée, corps trapu.
> **Cadrage PORTRAIT : le sujet doit être plus haut que large**, debout ou dressé, membres
> ramenés près du corps (pas de bras écartés à l'horizontale).
> **Fond parfaitement transparent** (PNG alpha), aucun sol, aucune ombre portée, aucun décor.
> **Le contour extérieur doit être NOIR et rien d'autre : aucun liseré blanc, aucun halo,
> aucune bordure de sticker ou de découpe autour de la silhouette.**
> Sujet unique, centré, cadré serré. Aucun texte, aucun cadre, aucun logo.
> Doit rester lisible réduit à 50 px de haut : **silhouette franche**, détails minimaux.

⚠ Ne pas employer le mot « sticker » dans le prompt : Gemini ajoute alors un **liseré blanc de
découpe** autour du personnage, qui se verra en jeu autour de chaque sprite.

### Bloc POSE — à ajouter au préambule des créatures

Les sprites sont **statiques** : `render/assets/animation.ts` fabrique le mouvement de façon
procédurale sur la transform (rebond, inclinaison, écrasement à l'appui — ADR-017). Le sprite
ne fournit pas le mouvement, il fournit une **pose qui doit rester crédible pendant qu'on la
fait rebondir et pencher**. Et la même pose sert quand l'unité est **à l'arrêt** (`idlePose`,
ennemi bloqué au contact du héros) : donc mi-enjambée, oui ; pose d'attaque figée, non.

> Pose : **en pleine marche vers l'avant, vue de face**. Une jambe nettement en avant, l'autre
> en appui derrière, **pieds écartés à la largeur des épaules** — assise large et stable.
> Buste très légèrement penché en avant, bras dissymétriques en balancier (l'un avancé, l'autre
> reculé), **jamais collés au torse ni tendus à l'horizontale**. La créature doit avoir l'air
> **d'avancer vers le spectateur**, pas de poser ni de se recroqueviller.
> Attitude générale de progression, pas d'attaque : aucune arme brandie au-dessus de la tête,
> aucun saut, aucun déséquilibre extrême.

**Volants** (`bat`, `gargoyle`, `wyvern`) : `flyPose` simule le battement d'ailes par une
**compression horizontale du sprite**. Leurs ailes doivent donc être **déployées à
l'horizontale, largement ouvertes et symétriques** — une aile repliée ou de trois quarts rend
la compression illisible. Pas de pose de marche pour eux : corps en vol, pattes repliées.

### Exception d'angle — créatures NON bipèdes

La vue frontale vaut pour les créatures **à station verticale** (diablotin, gobelin, orc,
troll, ogre, chevalier noir, héros…). Une créature à **corps horizontal** vue de face perd sa
silhouette : les membres se superposent en une masse, et l'appendice caractéristique (queue,
piquants) pointe vers le spectateur au lieu de se découper. C'est ce qui rend le scorpion
actuel lisible à 36 px alors qu'une version frontale devient un pâté.

> Pour ces créatures, remplacer la ligne « vue frontale » par :
> **Vue de 3/4 en plongée, le dos et la carapace visibles, l'avant du corps tourné vers le
> bas-gauche de l'image.** L'appendice caractéristique (queue, dard, piquants) doit se
> **découper nettement sur le vide**, jamais se superposer au corps ni pointer vers le
> spectateur. Membres bien séparés les uns des autres, en pleine marche.

Concernées : `scorpion`, `scarlet_prickler`, et toute future créature rampante ou à quatre
pattes. Les créatures sans membres (`bog_sprite`, `the_gravedigger`) restent frontales — leur
silhouette ne dépend pas de l'angle.

**Exception format** : `bat-ai.png`, `gargoyle-ai.png`, `wyvern-ai.png` sont des volants ailes
déployées — eux doivent être **plus larges que hauts**. Remplacer alors la ligne « cadrage
PORTRAIT » par « cadrage PAYSAGE, envergure déployée ».

### Deux écarts qui cassent le jeu, pas seulement l'esthétique

- **Format horizontal sur un sprite terrestre.** `fitSquare` cale le **plus grand côté** sur la
  taille cible. Un diablotin en 2:1 avec `size: 38` fait 38 px de large et ~20 px de haut :
  deux fois plus petit à l'œil que l'actuel, et écrasé au ras du sol.
- **Absence de contour noir.** C'est lui qui rend le bestiaire lisible à 38-60 px sur un
  terrain chargé. Sans cerne, la créature se fond dans le décor une fois réduite.

---

## 1. Ennemis — acte I (`public/assets/skin-craftpix/`)

| Fichier | Entité (`defId`) | Taille en jeu | Prompt spécifique |
|---|---|---|---|
| ~~`diablotin.png`~~ ✅ | Diablotin de faille (`diablotin`) | 38 | **FAIT** — livré et intégré. |
| ~~`scorpion.png`~~ ✅ | Scorpion des sables | 36 | **FAIT** — livré et intégré. |
| `goblin-knight.png` | Gobelin | 46 | Gobelin vert-de-gris en armure de bric-à-brac, casque cabossé trop grand, courte épée rouillée et bouclier de planches. Air hargneux, silhouette trapue. |
| `ghost.png` | Spectre (`wraith`) | 50 | Spectre encapuchonné translucide, bas du corps s'effilochant en brume bleu pâle, capuche vide avec deux points de lumière froide. Semi-transparent, pas de pieds. |
| `bat-ai.png` | Chauve-souris | 52 | Chauve-souris démoniaque **ailes largement déployées** (format nettement plus large que haut, ~2:1), membrane brun-pourpre nervurée, gueule ouverte, petits yeux rouges. Ennemi volant : posture en vol. |
| `orc-fang.png` | Orc | 54 | Orc guerrier massif à la peau vert olive, défenses inférieures proéminentes, plastron de cuir clouté, hache large à une main. Épaules très larges. |
| `troll.png` | Troll | 56 | Troll gris-bleu voûté, bras démesurés touchant presque le sol, nez crochu, gourdin de bois brut, peau rugueuse verruqueuse. |
| `dark-knight.png` | Chevalier noir | 58 | Chevalier en armure de plates noire mate, heaume clos fendu d'une visière rougeoyante, cape déchirée sombre, épée longue pointée vers le bas. Élégant et menaçant, pas monstrueux. |
| `gargoyle-ai.png` | Gargouille | 60 | Gargouille de pierre grise animée, **ailes de pierre déployées** (format large), gueule ouverte, cornes recourbées, fissures laissant filtrer une lueur ambrée. Ennemi volant. |
| `brute-zombie.png` | Brute | 62 | Mort-vivant colossal et boursouflé, chair grisâtre suturée, un bras hypertrophié, chaînes brisées aux poignets, mâchoire pendante. |
| `ogre.png` | Ogre | 66 | Ogre bedonnant à la peau brun-rose, une seule dent supérieure, pagne de peaux, massue cloutée sur l'épaule. Très large, petite tête. |
| `steel-golem.png` | Golem de fer | 70 | Golem de plaques de fer rivetées, articulations visibles, tête sans visage avec une fente lumineuse bleue, poings surdimensionnés, rouille sur les arêtes. |
| `warlord.png` | Chef de guerre | 72 | Seigneur de guerre orc en armure lourde ornée de trophées, cape de fourrure, casque à cornes, énorme épée à deux mains plantée devant lui. Silhouette de boss. |
| `wyvern-ai.png` | Vouivre | 78 | Vouivre (dragon bipède) **ailes grandes ouvertes**, écailles vert-bronze, longue queue à dard, cou tendu et gueule ouverte. Ennemi volant le plus imposant de l'acte I. |

## 2. Ennemis — acte II, ch. 11-20 (`public/assets/skin-craftpix/`)

| Fichier | Entité | Taille | Prompt spécifique |
|---|---|---|---|
| `bog_sprite.png` | Gelée Enragée | 36 | Blob de gelée vert marécage translucide, bulles et débris pris à l'intérieur (os, brindilles), pseudopode levé, surface luisante. Sans membres. |
| `scarlet_prickler.png` | Piqueur Écarlate | 36 | Petite créature-oursin écarlate sur pattes fines, longs piquants dressés, œil unique cerclé de noir. Vif et agressif. |
| `frontier_raider.png` | Pillard des Frontières | 50 | Bandit humain encapuchonné en cuir clouté, écharpe masquant le bas du visage, deux dagues courbes, ceinture de fioles. Silhouette agile. |
| `rift_marauder.png` | Maraudeur des Failles | 50 | Guerrier corrompu par la Faille, armure fêlée laissant s'échapper une lumière **violette**, un bras cristallisé, regard vide luminescent. |
| `shade_warder.png` | Gardien des Ombres | 52 | Sentinelle d'ombre élancée, corps de fumée noire tenu par des sangles d'armure argentées, lame courbe fine, halo sombre autour des épaules. |
| `veiled_assassin.png` | Assassin Voilé | 54 | Assassin drapé de voiles gris-bleu, visage entièrement masqué, poignards inversés dans chaque main, posture accroupie prête à bondir, écharpes en mouvement. |
| `four_eyed_warden.png` | Gardien à Quatre Yeux | 58 | Aberration trapue à **quatre yeux** en losange sur un visage sans nez, peau bleu-gris coriace, épaulières de pierre, bâton-totem. |
| `corrupted_hermit.png` | Ermite Corrompu | 64 | Vieil ermite en haillons, dos courbé sur un bâton noueux, moitié du corps envahie de cristaux violets et de racines noires, longue barbe emmêlée. |
| `howling_bones.png` | Ossements Hurlants | 68 | Amas de squelettes fusionnés en une seule créature hurlante, cages thoraciques imbriquées, crânes multiples, flamme verte pâle dans les orbites. |
| `the_gravedigger.png` | Le Roi Fangeux (boss) | 82 | **Boss final** : roi mort-vivant colossal couronné de fer tordu, manteau de boue et de racines, pelle-hache immense, silhouette dominante et large. Doit écraser tous les autres sprites par la présence. |

## 3. Tours & héros (`public/assets/skin-craftpix/`)

> **Variante du préambule pour les bâtiments** (cf. `tower-archer-ai.png` en place) : vue
> **3/4 quasi isométrique, à hauteur d'œil ou très légère contre-plongée** — on voit une face
> avant et une face latérale, jamais le toit du dessus. Cadrage **vertical**, base incluse mais
> **sans terrain sous la base**. Même contour noir épais et mêmes aplats saturés que les
> créatures. Le palier 3 doit se lire comme une évolution du palier 1 (même matériau, même
> couleur dominante, même angle), pas comme une autre tour.

| Fichier | Rôle | Prompt spécifique |
|---|---|---|
| `tower-archer-ai.png` | Archerie, paliers 1-2 | Tourelle d'archerie en bois et pierre, plateforme couverte d'un toit de bardeaux, meurtrières, échelle, carquois posés. Modeste, deux niveaux. |
| `tower-archer-3-ai.png` | Archerie, palier 3 | Même tour agrandie : trois niveaux, créneaux de pierre, bannière, toit renforcé, poutres sculptées. Évolution évidente de la précédente. |
| `tower-archer-longbow-ai.png` | Spé. « Arc long » | Tour d'archerie surmontée d'une **grande arbalète à carreau unique** montée sur pivot, câbles tendus, carreau massif chargé. Silhouette élancée et perçante. |
| `tower-archer-volley-ai.png` | Spé. « Volée » | Tour d'archerie surmontée d'un **râtelier d'arcs mécaniques en éventail**, gerbe de flèches prêtes. Silhouette large, notion de tir groupé. |
| `tower-frost-ai.png` | Givre, paliers 1-2 | Tour de pierre bleutée coiffée d'un **cristal de glace** flottant, givre rampant sur les murs, brume froide à la base. |
| `tower-frost-3-ai.png` | Givre, palier 3 | Même tour augmentée : cristal plus grand entouré d'éclats orbitaux, arcs de glace, stalactites, lueur cyan plus intense. |
| `tower-frost-frostfire-ai.png` | Spé. « Givre ardent » | Tour de givre dont le cristal est traversé d'une **flamme orange** : tourbillon mêlant glace bleue et feu, contraste chaud/froid marqué. |
| `tower-frost-blizzard-ai.png` | Spé. « Blizzard » | Tour de givre surmontée d'un **tourbillon de neige en spirale**, éclats de glace en rotation, blanc-cyan dominant, effet de vent circulaire. |
| `hero-ai.png` | **Héros** (unité mobile) | ⚠ **préambule CRÉATURES** (vue frontale), pas celui des bâtiments. Chevalier-héros trapu vu de face, armure d'acier clair à liserés or, heaume à visière ouverte, grand bouclier armorié à gauche, épée à droite. Doit se distinguer instantanément des ennemis par la clarté de l'armure. |

## 4. Emblèmes du Campement (raster couleur, jamais teintés)

| Fichier | Rôle (`EMBLEM`) | Prompt |
|---|---|---|
| `tiny-swords/buildings/castle-blue.png` | `bastion` — tuile Histoire | **Préambule BÂTIMENTS** (3/4 isométrique). Château fort compact, donjon central, deux tourelles à toits bleus, herse, bannières. Cadre 320×256, fond transparent, **sans terrain**. |
| `tiny-swords/ui/icon-06.png` | `armory` — Armurerie | Icône-objet 64×64 : bouclier héraldique croisé d'une épée, métal et cuir, colorée, léger relief, fond transparent. |
| `tiny-swords/ui/icon-05.png` | `chronicles` — Chroniques | Icône-objet 64×64 : deux épées croisées, gardes dorées, lames claires, fond transparent. |
| `tiny-swords/ui/icon-12.png` | `sound` — bouton son | Icône-objet 64×64 : note de musique / lyre dorée. **Doit rester lisible à alpha réduit** (l'état muet baisse l'opacité de tout le bouton). |
| `icons/bestiary-book.png` | `bestiary` — Bestiaire | Grimoire fermé de 3/4, cuir sombre à ferrures de laiton, fermoir, tranche dorée, marque-page rouge. Portrait ~192×286, fond transparent. |

> Les 3 icônes-objets 64×64 (`icon-05/06/12`) suivent le style **pixel art Tiny Swords**, pas le
> cartoon du bestiaire : petites, colorées, contour sombre, lisibles à leur taille native. Ne pas
> leur appliquer le préambule créatures.

## 5. Icônes de sorts du héros (⚠ SVG)

| Fichier | Rôle | Prompt |
|---|---|---|
| `icons/tornado.svg` | Tourbillon | **Glyphe blanc plein sur fond transparent**, style pictogramme game-icons.net : tornade stylisée en spirale, aucun dégradé, aucune couleur, contour fermé, cadre 512×512. |
| `icons/flying-flag.svg` | Ralliement | Glyphe blanc plein : bannière au vent sur une hampe, plis marqués, silhouette pleine, 512×512. |
| `icons/arrow-cluster.svg` | Sort de compte | Glyphe blanc plein : gerbe de trois flèches divergentes, empennes visibles, silhouette pleine, 512×512. |

## 6. Icônes d'UI maison (⚠ SVG)

Toutes en **glyphe blanc plein sur transparent**, viewBox 64×64, teintées à l'exécution
(`setTint`) : **aucune couleur, aucun dégradé, aucun contour gris** — sinon la teinte produit
de la boue (rappel : `setTint` MULTIPLIE).

| Fichier | Rôle | Prompt |
|---|---|---|
| `icons/ui-scroll.svg` | Histoire | Parchemin déroulé vu de face, rouleaux haut et bas, glyphe blanc plein, 64×64. |
| `icons/ui-portal.svg` | Faille | Portail ovale en anneau avec vortex concentrique au centre, glyphe blanc plein. |
| `icons/ui-lock.svg` | Verrouillé | Cadenas fermé, anse épaisse, corps rectangulaire, glyphe blanc plein. |
| `icons/ui-castle.svg` | Donjon | Donjon crénelé à trois tours, glyphe blanc plein, silhouette symétrique. |
| `icons/ui-star.svg` | Note pleine | Étoile à cinq branches pleine, blanche. |
| `icons/ui-star-empty.svg` | Note vide | Même étoile, **contour épais uniquement**, intérieur transparent. Doit se superposer pixel pour pixel à `ui-star.svg`. |
| `icons/ui-fullscreen.svg` | Plein écran | Quatre équerres d'angle pointant vers l'extérieur, blanches, centrées, parfaitement symétriques. |
| `icons/ui-fullscreen-exit.svg` | Quitter plein écran | Mêmes équerres pointant vers l'intérieur. Symétrie exacte exigée (l'ancien glyphe Unicode était décentré). |
| `icons/ui-chevron-down.svg` | Défilement | Simple chevron vers le bas, trait épais, bouts arrondis. |
| `icons/ui-shield.svg` | Icône PWA uniquement | Écu héraldique plein. Sert au `manifest.webmanifest`, pas au jeu. |

## 7. Chrome d'UI 9-slice (⚠ à ne PAS confier à Gemini)

Ces planches ne sont pas des images libres : `uiSkin.ts` les découpe en grille 3×3 de pièces
de 64 px aux offsets 0 / 128 / 256, puis recompose un nine-slice. Une image générée librement
**cassera le découpage**.

| Fichier | Rôle | Contrainte de géométrie |
|---|---|---|
| `tiny-swords/ui/paper-special.png` | Panneaux / modales | 9 pièces de 64 px isolées dans du vide, canevas 320×320, offsets 0/128/256. Volute d'angle ≤ 17 px. |
| `tiny-swords/ui/btn-big-blue(.png/-pressed.png)` | Bouton standard | Même grille ; l'état pressé garde exactement la même géométrie, seul l'ombrage change. |
| `tiny-swords/ui/btn-big-red(.png/-pressed.png)` | Bouton primaire | Idem. |
| `tiny-swords/ui/ribbons-small.png` / `ribbons-big.png` | Rubans de titre | Rangées de couleurs, variantes pointe / arrondie alternées, mesurées par le code. |
| `tiny-swords/ui/bar-{small,big}-{base,fill}.png` | Jauges | Bandes à 3 tranches. |

Si tu veux vraiment refaire ce lot : ADR dédié + réécriture de la géométrie de `uiSkin.ts`.

## 8. Réserve non branchée (facultatif)

`tiny-swords/decor/*`, `tiny-swords/fx/*`, `tiny-swords/buildings/tower-*`, `kenney-ui/*`,
`kenney-td/sheet.png` : en réserve ou réduits aux FX. Inutile de les régénérer maintenant.

## Cas particulier SVG

`skin-medieval/*.svg` et `icons/*.svg` sont chargés par `load.svg`. Gemini ne produit pas de
SVG exploitable. Deux options :

- **A (recommandée)** : générer en PNG, puis je bascule le loader de `load.svg` à
  `load.image` pour ces clés (modif localisée dans `assets.ts` / `icons.ts` + ADR). Pour les
  icônes d'UI, garder impérativement le **blanc pur sur transparent** pour que `setTint`
  continue de fonctionner.
- **B** : garder les SVG actuels et ne refaire que le raster.

| Fichier SVG restant | Rôle | Prompt si option A |
|---|---|---|
| `skin-medieval/keep-bastion.svg` | Le Bastion (base) | Petit château-donjon de pierre vu de 3/4 en plongée, toit conique bleu ardoise, porte cloutée, bannière au sommet. Carré, fond transparent, sans terrain. |
| `skin-medieval/pad-slot.svg` | Emplacement de tour | Dalle de pierre octogonale au sol, vue en plongée, joints visibles, légère mousse aux bords. **Discrète** : ne doit pas concurrencer les tours. |
| `skin-medieval/tower-catapult.svg` | Catapulte, paliers 1-2 | Plateforme de bois portant une catapulte à bras unique, contrepoids, cordages, panier chargé d'une pierre. |
| `skin-medieval/tower-catapult-3.svg` | Catapulte, palier 3 | Même engin renforcé : double contrepoids, ferrures, plateforme de pierre, projectiles empilés. Évolution lisible du précédent. |

## Quand tu auras remplacé

Préviens-moi, je passe : `npm test` (dont `assets.integrity.test.ts`), `npm run lint`,
`npm run build`, contrôle visuel en jeu (tailles, proportions, marges transparentes, teintes
d'icônes), puis mise à jour de `public/assets/README.md` (provenance / licences) et ADR si la
nature des assets change.
