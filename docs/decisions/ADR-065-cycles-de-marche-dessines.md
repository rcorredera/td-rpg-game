# ADR-065 — Cycles de marche dessinés, générés en UNE image et calés sur une ligne de sol

## Statut
Accepté (2026-08-21)

## Contexte

ADR-064 a corrigé un défaut structurel de l'animation procédurale — les pieds décollaient.
Le PO juge le résultat encore insuffisant : « c'est vilain quand même ».

L'animation par frames dessinées avait été écartée, et pour une raison que je croyais
rédhibitoire : un générateur ne redessine pas *le même* personnage dans une autre pose,
couleurs et proportions dérivant d'une image à l'autre.

**Le PO a proposé de demander les poses dans UNE SEULE image.** Cette objection tombe
alors : les poses sont dessinées d'un seul tenant, avec le même personnage sous les yeux
du modèle. Vérifié sur l'orc — même armure cloutée, même hache dans la même main, mêmes
verts sur les quatre poses. Ce qui bloquait ne bloque plus.

Mieux, la planche livrée contient une **ligne de sol dessinée**, demandée dans le prompt.
Elle n'est pas un défaut à effacer : c'est la référence commune qui garantit que les quatre
paires de pieds sont à la même hauteur — précisément ce qu'aucun traitement ne peut
inventer.

## Décision

### Les poses d'une créature sont générées ENSEMBLE, jamais séparément

Une image, N poses côte à côte, même direction, même échelle, arme dans la même main. La
cohérence vient de la génération unique ; aucun post-traitement ne la rattraperait.

### Les frames sont calées sur la LIGNE DE SOL, pas sur leur boîte

C'est le cœur du procédé. Aligner les poses sur le bas de leur boîte englobante écraserait
l'élévation voulue du corps — en marche, le bassin monte au passage de la jambe et descend
au contact. Les caler sur la ligne dessinée **préserve cette élévation et supprime la
dérive involontaire**. C'est la différence entre « le corps monte » et « le sprite saute ».

Mesuré sur l'orc : les poses de passage sont 9 px plus hautes que les poses de contact —
le rebond, produit spontanément par le générateur — pour un écart de pieds de 2 px
seulement, soit 0,4 px à la taille du jeu.

### La ligne se reconnaît à sa CONTINUITÉ, pas à son étendue

Piège coûteux : à hauteur des torses, quatre personnages côte à côte couvrent eux aussi
85 % de la largeur. Le premier critère écrit les confondait. Ce qui les sépare est le taux
de remplissage — 75 % pour la bande des torses, **100 % pour la ligne**.

### Elle s'efface là où elle est LIBRE

La ligne passe derrière les pieds : l'effacer en bloc percerait une fente dans chaque
botte. On sonde quelques pixels au-dessus — du fond, la ligne est seule et part ; du
dessin, on est sous une silhouette et on garde tout.

### L'ancrage horizontal suit le HAUT du corps

Aligner sur le centre de la boîte ferait glisser la pose : la boîte s'élargit quand la
jambe s'avance ou que l'arme balance. La tête et les épaules, elles, restent en place.
Mesuré : **0,6 px de dispersion sur 247**, contre plusieurs pixels pour un calage sur la
boîte. La superposition des quatre poses le montre — tête et torse nets, seules les jambes
et la lame s'ouvrent en éventail.

### Une créature animée n'est PAS déformée en plus

Ses poses portent déjà le mouvement. Y superposer l'écrasement procédural le compterait
deux fois : le corps s'écraserait par-dessus des jambes qui plient déjà. Une créature à
planche prend donc la pose neutre en marche, et garde la respiration à l'arrêt.

Les deux lectures partagent `walkCyclePos` : une créature animée et sa voisine statique
doivent battre à la même cadence pour une même vitesse de déplacement.

### Le miroir sert à l'ORIENTATION, pas à doubler un cycle

Le jeu retourne déjà les sprites selon le sens de marche. Mais un retournement inverse
aussi l'équipement : fabriquer le pas opposé en miroir ferait **changer la hache de main à
chaque pas**. Les temps d'un même cycle se génèrent donc, ils ne se déduisent pas.

En revanche, le miroir est gratuit et légitime pour les DIRECTIONS : générer cinq angles
sur 180° (face, 3/4 face, profil, 3/4 dos, dos) et retourner pour les trois autres est la
méthode classique du sprite 8 directions. **Reporté** : on ne sait pas encore si le cycle
tient à l'échelle du jeu sur tout le bestiaire, et les angles multiplieraient par cinq un
pari non validé.

## Conséquences

- `npm run sprite -- <source> <destination> --strip` produit la planche à cases régulières
  et rapporte les dispersions — le rapport est ce qui permet de distinguer un rebond voulu
  d'une dérive d'échelle, arbitrage que l'outil ne peut pas rendre.
- L'orc est la première créature animée : 4 poses, 262 Ko contre 60 pour son sprite fixe.
  **Le coût est réel** : à ce tarif, un bestiaire entièrement animé pèserait ~6 Mo. À
  arbitrer avant de généraliser — soit en abaissant la résolution de case, soit en
  n'animant que les créatures les plus vues.
- Le registre gagne `frames` sur une entrée d'ennemi ; tout le reste du bestiaire garde son
  sprite unique et son animation procédurale. Les deux régimes coexistent.
- Le Bestiaire affiche la **première pose** d'une planche : sans cela sa vignette montrerait
  la planche entière, soit quatre créatures écrasées dans la case.
- ADR-064 reste entièrement valable : l'ancrage par les pieds est ce sur quoi des frames
  dessinées se posent sans tressauter.
- La planche livrée est en **profil**, alors que les 23 autres sprites sont de face. C'est
  un choix de direction artistique global — le profil se lit mieux pour une créature qui
  longe un chemin — et il reste à trancher avant de générer la suite.

## Alternatives écartées

**Générer chaque pose séparément.** L'objection d'origine, et elle tient toujours : le
personnage dérive d'une image à l'autre. C'est la génération EN UNE IMAGE qui débloque,
pas l'animation par frames en soi.

**Demander au générateur les poses miroir.** Inutile et risqué : le miroir se calcule sans
erreur, une génération peut rater.

**Effacer la ligne de sol en la demandant absente du prompt.** Elle est ce qui aligne les
pieds. La retirer du prompt reviendrait à jeter la seule référence commune.

**Aligner les poses sur le bas de leur boîte englobante.** Écraserait le rebond du corps —
qui est précisément ce qu'on cherchait à obtenir.
