# ADR-061 — Refonte graphique du bestiaire : nommage par `defId` et chaîne de nettoyage

## Statut
Accepté (2026-08-20)

## Contexte

Le PO reprend l'ensemble des sprites du monde avec Gemini, un par un. Trois problèmes
se posent avant même la première image.

**1. Les noms de fichiers viennent des packs sources, pas du jeu.** `imp.png` est le
`rat`, `ghost.png` est le `wraith`, `goblin-knight.png` est le `goblin`,
`steel-golem.png` est le `golem`. Le dossier mélange en plus kebab-case
(`dark-knight.png`) et snake_case (`bog_sprite.png`), et les sprites générés portent
un suffixe `-ai` qui n'a de sens que pendant la transition d'ADR-045. Comprendre quel
fichier correspond à quelle entité impose d'ouvrir `assets.ts` à chaque fois.

**2. Le style à viser n'était pas écrit.** Les premiers essais sont partis sur une vue
3/4 en plongée et des proportions réalistes, alors que le bestiaire en place est en
vue frontale, cartoon, à contour noir épais. Rien ne le documentait : la référence
n'existait que dans les fichiers eux-mêmes.

**3. La chaîne Gemini → jeu produit des artefacts systématiques.** Gemini livre un
JPEG sur fond blanc ; la compression crée un dégradé entre le contour noir et le fond.
Après détourage manuel dans Photoshop, il reste une frange claire d'un à quatre pixels
tout autour du sujet — 1 067 pixels sur le premier scorpion, 3 552 sur sa reprise en
sélection dure. Cette frange survit à la réduction et donne un liseré blanc autour de
chaque créature à l'écran. S'y ajoutent des fragments de sélection isolés, des marges
transparentes énormes (jusqu'à 37 % de la largeur), et une résolution de 1024 px pour
des sprites affichés à 62 px au maximum.

## Décision

### `rat` devient `diablotin`, et le renommage d'un `defId` se migre

Aligner le fichier sur le `defId` a mis au jour que le `defId` lui-même mentait :
`rat` porte le nom affiché « Diablotin de faille » depuis le reskin CraftPix (ADR-044),
et le jeu ne contient aucun rongeur. Nommer le fichier `rat.png` aurait figé
l'erreur dans une troisième couche. L'identifiant est donc aligné : `diablotin`.

Ce renommage n'est PAS un simple remplacement de texte. **Le bestiaire d'un profil
est une liste de `defId` écrite sur le disque** (`Profile.bestiary`,
`meta/save.ts`) : sans remappage, la créature redevient silencieusement « non
découverte » chez tout joueur existant, et la page de Bestiaire qu'il avait gagnée
disparaît. Ni le typage ni les tests de contenu ne le signaleraient.

`meta/save.ts` gagne donc une table `RENAMED_ENEMY_IDS` appliquée au chargement,
qui remappe et dédoublonne (un profil ayant croisé la créature avant ET après
porterait sinon les deux identifiants). **Toute future renomination d'un `defId`
doit y ajouter son entrée** — c'est la seule raison d'être de cette table.

Deux autres identifiants s'écartent de leur nom affiché — `bog_sprite` / « Gelée
Enragée », `the_gravedigger` / « Le Roi Fangeux ». Ils ne sont PAS traités ici :
contrairement à `rat`, ils décrivent encore correctement la créature, et chaque
renommage a un coût de migration. À trancher si le besoin se présente.

### Nommage : `<defId>.png`, snake_case strict

Le nom de fichier se dérive de l'identifiant de l'entité dans `content/enemies.ts` et
`content/towers.ts`. Plus de table de correspondance à mémoriser, plus de mélange de
casse, plus de suffixe `-ai` : la provenance d'un asset est une note de licence, pas
une information à porter dans le nom.

Pour les tours, le palier et la spécialisation deviennent des suffixes dérivés eux
aussi : `tower_archer.png`, `tower_archer_t3.png`, `tower_archer_spec_longbow.png` —
le suffixe de spécialisation reprend le `specId` tel quel.

Le renommage se fait **au fil de la reprise**, une entité à la fois, pas en une passe
de masse : un renommage sans nouvelle image n'apporte rien et brouillerait l'historique
de la refonte.

### Le style de référence est écrit, pas déduit

Deux documents portent désormais la refonte :

- `docs/REFONTE-GRAPHIQUE-GEMINI.md` — les règles : formats, contraintes techniques,
  table de renommage, ce qu'il ne faut pas régénérer.
- `docs/PROMPTS-GEMINI.md` — un prompt complet et autonome par entité, à copier-coller.

Trois contraintes y sont consignées parce qu'elles ne se devinent pas depuis les
fichiers, et qu'elles ont chacune coûté un aller-retour :

1. **La pose doit être une marche.** Les sprites sont statiques et
   `render/assets/animation.ts` fabrique le mouvement sur la transform (rebond,
   inclinaison, écrasement à l'appui — ADR-017). Une pose recroquevillée, pieds joints,
   n'offre aucun appui à faire rebondir. Et la même pose sert à l'arrêt (`idlePose`,
   ennemi bloqué au contact) : donc mi-enjambée, jamais une pose d'attaque figée.
2. **Les volants ont les ailes déployées à l'horizontale et symétriques.** `flyPose`
   simule le battement par une compression horizontale du sprite ; une aile repliée
   rend la compression illisible.
3. **Les créatures à corps horizontal sont vues de 3/4 en plongée, pas de face.** Un
   scorpion de face superpose ses huit pattes en une masse et pointe son dard vers le
   spectateur. C'est l'angle, pas le dessin, qui le rendait illisible à 36 px.

Le mot « sticker », employé pour décrire le contour épais, fait ajouter à Gemini un
liseré blanc de découpe : il est explicitement proscrit dans les prompts.

### Chaîne de nettoyage automatisée, et non manuelle

Le nettoyage ne se fait plus dans Photoshop mais par programme, sur une propriété
vraie de tout le bestiaire : **le contour d'un sprite est NOIR**. Donc tout pixel clair
qui touche le vide est un résidu de détourage, jamais du dessin. La règle est
mécanique, sans réglage à l'œil, et se vérifie : après passage, il reste 0 pixel clair
en bordure sur les deux premiers sprites, contre 3 552 et 703 avant.

Quatre étapes : suppression de la frange claire par passes successives, suppression
des fragments isolés, rognage au plus près de l'alpha, puis réintroduction d'un léger
anticrénelage (une sélection dure produit un alpha binaire, donc un bord crénelé).

### Résolution de stockage : 256 px de grand côté

Les sprites ne sont jamais affichés au-delà de **62 px** (portrait du Bestiaire,
`render/menu/helpers.ts`) et **82 px** en jeu (le boss). Stocker 1024 px n'apporte
rien qu'une image plus lourde. 256 px laisse déjà un facteur 3 pour les écrans à forte
densité, et correspond à l'ordre de grandeur des sprites CraftPix en place (~200-280 px).

Effet mesuré sur les deux premiers : 450 et 508 Ko en sortie de Photoshop, 47 et 62 Ko
après réduction. Les sprites IA déjà en place (`hero-ai.png` 177 Ko, `wyvern-ai.png`
201 Ko) sont au-dessus : la série devrait ramener `skin-craftpix/` de 4,5 Mo à ~1,5 Mo.

## Conséquences

- `diablotin.png` (ex-`imp.png`, defId `rat` → `diablotin`) et `scorpion.png` sont repris ;
  `assets.ts`, `enemies.ts`, `waves.ts`, `sprites.ts` et la migration de `save.ts` suivent.
- Les sprites régénérés sortent du périmètre de licence CraftPix. `skin-craftpix/`
  porte désormais un mélange ; le dossier sera renommé et le README des licences
  refondu **quand la série sera terminée**, pas à chaque fichier.
- **Les `size` de `sprites.ts` ne sont PAS ajustés maintenant.** Le cadrage portrait et
  la pose de marche donnent des silhouettes plus élancées que les sprites CraftPix :
  à `size` égal, un nouveau sprite occupe moins de surface qu'un ancien. La hiérarchie
  de taille reste cohérente **entre nouveaux sprites**, et ce qui détonne pendant la
  transition est le mélange ancien/nouveau. Les tailles seront revues d'un bloc à la
  fin, sur un ensemble homogène — les régler au coup par coup reviendrait à calibrer
  sur une référence qui change à chaque livraison.
- Les icônes monochromes (`icons/*.svg`) et le skin médiéval (`skin-medieval/*.svg`)
  restent hors périmètre tant que le passage de `load.svg` à `load.image` n'est pas
  tranché. Le chrome d'UI 9-slice (`uiSkin.ts`) est exclu : sa géométrie est découpée
  par le code, une image générée librement la casserait.

## Alternatives écartées

**Renommer tous les fichiers d'un coup, avant la refonte.** Aurait produit un gros
commit de renommage sans valeur visible, et brouillé l'historique : chaque entité
mérite un commit qui montre l'ancien et le nouveau sprite ensemble.

**Corriger la frange dans Photoshop.** Tenté, et c'est ce qui a produit le pire
résultat : la sélection dure supprime l'anticrénelage et rend les pixels de frange
totalement opaques. Le PO n'a pas à arbitrer au pixel près une propriété que le code
peut déduire.

**Régler les `size` au fur et à mesure.** Chaque réglage aurait été fait par
comparaison avec des sprites eux-mêmes destinés à être remplacés.
