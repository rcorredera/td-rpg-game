# ADR-068 — Le cycle de marche se cale sur le sol, et une planche s'oriente en la regardant

## Statut
Accepté (2026-08-21)

## Contexte

Le PO signale que les créatures animées « font des va-et-vient sur place en avançant », puis
précise : « quand il se déplace vers la droite il regarde vers la gauche tout en se déplaçant
vers la droite », et que le coupable est le **gobelin**, pas l'orc.

Deux défauts distincts, l'un que la remarque désigne, l'autre que l'enquête a mis au jour.

## Décision

### La planche du gobelin était retournée à l'envers

Le registre veut un profil tourné vers la DROITE (ADR-067) ; le drapeau `--profile-left`
existe pour corriger un générateur qui dessine l'inverse. **Je l'ai appliqué à une planche
qui regardait déjà à droite**, et la créature se retrouvait donc à marcher à reculons.

La cause n'est pas l'outil : c'est que j'ai lu l'orientation à l'œil sur une vignette de
1024 px réduite, et je me suis trompé **deux fois de suite**, sur l'orc comme sur le gobelin.

**Règle qui en découle : l'orientation d'une planche se vérifie en EXTRAYANT la rangée de
profil de la planche produite, jamais en regardant l'image source.** Quatre cases isolées et
agrandies lèvent l'ambiguïté en une seconde ; la source ne le permet pas.

Deux corrections d'outil sont nées de la même enquête :

- `--profile-left` ne retournait que la rangée d'indice 1. Sur une planche à une seule
  rangée — celle de l'orc — cette rangée EST le profil, et le drapeau restait silencieusement
  inopérant.
- Une pose retournée a besoin de place du côté OPPOSÉ à celui qu'elle occupe dans la source.
  Les débords de case se mesurent donc APRÈS retournement, sinon une épée qui dépassait à
  gauche se ferait trancher à droite.

### Le cycle se pilote par la DISTANCE, pas par l'horloge

Défaut mesuré en cherchant le premier : le cycle valait `620 / (vitesse / 55)` millisecondes.
Multiplié par la vitesse pour obtenir la distance au sol, celle-ci **disparaît du résultat** —
il reste exactement **34,1 px par cycle, pour toute créature**, quelle que soit sa taille.

Un gobelin de 46 px et un ogre de 66 px faisaient donc la même enjambée. Pour l'un comme pour
l'autre, le pied glissait en arrière à chaque appui, ce qui se lit comme un piétinement.

Le cycle d'une créature à planche dessinée est désormais indexé sur la distance réellement
parcourue, l'enjambée valant `1,1 × taille d'affichage` — une foulée fait environ la moitié
de la hauteur d'un humanoïde, et un cycle en compte deux. Le rendu accumule cette distance
par créature, à côté de son orientation.

Effet secondaire acquis : un ennemi bloqué au contact du héros ne pédale plus sur place,
puisqu'il ne parcourt plus de distance.

L'animation PROCÉDURALE (créatures à sprite unique) reste pilotée par le temps : elle n'a pas
de pied dessiné à trahir.

### Le bac à sable gagne une barre d'invocation

Le PO : « il manquerait une barre d'action pour invoquer un monstre plutôt que des vagues
aléatoires ». Une vignette par créature, un tap en fait apparaître une, et les taps successifs
tournent sur les quatre voies — tout envoyer par la même ne montrerait qu'un seul axe de
marche, ce qu'on vient justement observer.

Elle passe par `spawnOneEnemy`, une **commande de simulation**. Le rendu ne mute jamais
`RunState` directement (ADR-001), et une exception « juste pour déboguer » serait le premier
pas vers un rendu qui décide de l'état du jeu. La commande refuse une créature ou une voie
inconnue plutôt que d'empiler une apparition que la sim déréférencerait dans le vide, une
fraction de seconde plus tard et loin de la cause.

## Conséquences

- `FacingState` accumule la distance parcourue en plus de l'orientation.
- Le découpage en grille (ADR-067) rendait des cases allant d'un trait de coupe à l'autre,
  marges vides comprises. Elles sont désormais SERRÉES sur l'encre : `fitSquare` cale
  l'affichage sur la case (ADR-046), donc une case gonflée faisait paraître la créature plus
  petite. Corrigé au passage — les cases du gobelin passent de 287 à 236 px.
- La barre d'invocation n'existe que dans le bac à sable ; le HUD du jeu n'a pas à porter un
  outil d'atelier.

## Alternatives écartées

**Garder le pilotage par le temps en réglant la constante.** Elle vaudrait juste pour une
seule taille de créature : le problème est que la vitesse s'annule dans le calcul, pas que la
valeur soit mal choisie.

**Détecter automatiquement le sens du profil.** Tentant, mais aucun critère fiable : la
position de la tête par rapport au centre de masse dépend de l'arme et de la pose, et la
mesure a donné des signes opposés pour l'orc et le gobelin. L'œil sur la planche PRODUITE
tranche en une seconde ; un heuristique se tromperait en silence.

**Laisser le bac à sable enchaîner ses vagues.** Il faut alors passer toutes les créatures
d'avant pour atteindre celle qu'on veut voir — exactement ce que le bac à sable existait pour
éviter.
