# ADR-045 — Créatures volantes : illustrations générées par IA

## Statut
Accepté (2026-08-19)

## Contexte
Après ADR-044, seuls 3 ennemis restaient en SVG maison généré (ADR-016) : chauve-souris,
gargouille, vouivre — les 3 seules créatures volantes, faute d'unité volante dans les
deux packs CraftPix (ADR-043/044). Le joueur juge ce SVG "pas joli" et veut le
remplacer partout.

Claude Code n'a pas d'outil de génération d'image. Le joueur a généré les 3
illustrations lui-même avec un autre modèle, à partir de prompts fournis (style CraftPix :
contour épais, aplats cel-shadés, silhouette aile déployée bien lisible) et me les a
transmises pour intégration.

## Décision
- **`bat`, `gargoyle`, `wyvern` passent en PNG généré par IA**, dans
  `public/assets/skin-craftpix/{bat,gargoyle,wyvern}-ai.png` — même dossier et même
  table `CRAFTPIX` que les sprites CraftPix, le préfixe `-ai` distingue seulement la
  provenance dans le nom de fichier.
- **Post-traitement nécessaire avant intégration**, aucune des images fournies n'était
  directement exploitable :
  - Fond non transparent malgré la demande explicite de transparence dans le prompt
    (`transparent background`) — deux générations sur trois ont rendu un DAMIER PEINT
    (pixels opaques imitant visuellement une grille de transparence) plutôt qu'un
    vrai canal alpha ; la troisième (vouivre) un fond gris uni. Détouré par un
    remplissage par diffusion (flood fill) depuis les bords de l'image, sur un critère
    de désaturation/luminosité (damier) ou de proximité de teinte (fond uni) — jamais
    par un simple remplacement de couleur global, qui aurait aussi percé les reflets
    blancs des yeux/crocs à l'intérieur des personnages.
  - Filigrane "Contenu généré par l'IA" intégré à l'image (vouivre) : effacé (mis à
    alpha 0) avant le rognage à la boîte englobante opaque.
  - Résolution native ~1024×1024, largement surdimensionnée pour un sprite de jeu
    (76 à 130 fois plus lourd que les PNG CraftPix équivalents) — réduite à 380-480 px
    de côté (`InterpolationMode.HighQualityBicubic`), le boss (vouivre) gardant la
    plus grande taille (ADR-022).
- **Aucune animation planche par planche** : le jeu anime déjà tout par transformation
  procédurale (`render/animation.ts`, ADR-017 — `flyPose` notamment) appliquée à UNE
  texture statique par créature. Générer plusieurs frames n'aurait servi à rien ; ça
  reste vrai pour ces 3 sprites comme pour tout le reste du bestiaire.
- **Piège de vérification découvert en cours de route** (documenté aussi dans
  `.ai/pitfalls.md`) : l'outil `Read` de prévisualisation d'image a rendu la vouivre
  détourée comme si son fond était resté opaque, alors que le fichier avait bien un
  canal alpha correct (vérifié pixel par pixel via `System.Drawing`, puis confirmé par
  un vrai navigateur). Ne jamais conclure d'un échec de détourage sur la seule
  prévisualisation `Read` pour ce genre de fichier — vérifier par lecture de pixels ou
  par un rendu navigateur réel.

## Conséquences
- **Plus aucun ennemi en SVG maison généré** : les 3 derniers `foe-*.svg` (bat,
  gargoyle, wyvern) sont supprimés — le skin médiéval maison (ADR-016) ne couvre plus
  que le héros et le chrome (tours, Bastion, dalles).
- `render/sprites.ts` ne change pas : même point de swap unique (ADR-005).
- **Limite assumée, distincte de celle d'ADR-043/044** : provenance et droits d'usage
  d'une image générée par IA à des fins commerciales dépendent des conditions du
  service utilisé par le joueur — non vérifié ici, à sa charge avant toute publication
  publique.

## Alternatives écartées
- **Redessiner ces 3 SVG à la main** — écarté : le joueur a explicitement demandé un
  remplacement complet du SVG généré, pas une repasse dessinée.
- **Détourage par remplacement de couleur global (une seule passe, sans diffusion)** —
  écarté après un premier essai laissant un résidu de grille visible sous les
  personnages : une bordure anti-aliasée du damier ne matche pas exactement les deux
  teintes de référence, donc une partie du fond restait opaque en îlots isolés.
