# ADR-064 — Les pieds restent au sol : l'animation par écrasement, pas par translation

## Statut
Accepté (2026-08-20)

## Contexte

Les sprites sont statiques et le mouvement est calculé sur la transform (ADR-017). Le PO
juge le résultat inutilisable : « le petit sautillement, ça passe pas du tout ».

Il a raison, et la cause est structurelle, pas un problème de réglage :

- `placeEnemy` posait le pivot à **`setOrigin(0.5, 0.62)`**, donc au MILIEU DU CORPS.
  L'écrasement et l'inclinaison pivotaient sur un point flottant, sans rapport avec un
  appui au sol.
- `walkPose` renvoyait un `dy` allant jusqu'à **4,6 px**, qui translatait le sprite
  entier. Les pieds décollaient à chaque pas.
- L'écrasement, lui, plafonnait à **6 %** — six fois plus faible que la translation, donc
  invisible.

Un sprite qui montre ses deux pieds posés et qui s'élève ne marche pas : il saute sur
place. C'est exactement ce que l'œil lisait.

La question sous-jacente du PO était : faut-il passer à des cycles d'animation dessinés,
au prix de « 300 sprites » ? Non — et le nombre n'est pas le vrai obstacle.

## Décision

### Un sprite par créature, définitivement

**Le blocage de l'animation par frames n'est pas le volume, c'est la COHÉRENCE.** Les
sprites sont générés (ADR-061), et un générateur ne redessine pas *le même* personnage
dans une autre pose : couleurs, proportions et détails dérivent d'une image à l'autre. Un
cycle de quatre frames donnerait quatre créatures légèrement différentes qui clignotent —
défaut bien pire que l'absence d'animation, et qu'aucun volume de production ne corrige.

On garde donc un sprite unique par créature, et on répare le modèle de mouvement.

### Les pieds restent au sol, c'est le corps qui travaille

Les unités sont ancrées par les **pieds** (`setOrigin(0.5, 1)`). Trois effets, tous
acquis d'un seul changement :

1. L'écrasement compresse **vers le sol** : le sommet du corps monte et descend, la base
   ne bouge pas. C'est du mouvement vertical sans décollage.
2. L'inclinaison pivote **au point d'appui**, comme un corps qui reporte son poids — et
   non à la taille, ce qui donnait un dandinement d'objet posé sur un axe.
3. Le sommet réel du sprite, dont dépend l'accroche de la barre de PV (ADR-047), se lit
   directement au lieu d'être reconstruit depuis un ratio.

Le changement de pivot est compensé par `LEGACY_ORIGIN_Y` : le décalage reproduit
exactement le rectangle qu'occupait l'ancrage précédent. **Aucune unité ne bouge à
l'écran** — sans cette compensation, tout le bestiaire remonterait d'un tiers de sa
hauteur.

### Le mouvement vertical passe par l'écrasement

`WALK_LIFT_MAX` (2 px) borne la translation d'un marcheur. Ce n'est pas un réglage
esthétique mais la limite au-delà de laquelle l'illusion casse, et un test la garde.

L'écrasement passe de 6 % à 12 % pour les plus lourds, et il est phasé sur le **contact
du pied** — maximal à l'impact, nul en milieu d'appui. Mesuré en jeu sur l'orc : 3,5 px
d'amplitude verticale réelle, contre un écrasement auparavant imperceptible.

### Le balancement fait la démarche

`UnitPose` gagne un `dx` : le poids passe d'un appui sur l'autre. C'est lui qui fait lire
une démarche — un corps qui monte et descend sans jamais se déporter saute, il ne marche
pas. L'amplitude suit la masse : une brute roule des épaules (±3 px), un diablotin
trottine sans se déporter (±1 px).

Le reste du caractère suit la même logique : les légers gardent un peu de rebond et
s'inclinent plus (vivacité), les lourds s'écrasent et roulent (masse).

### Une dissymétrie d'un pas à l'autre

Le cycle a deux appuis, donc une période de 0,5. Sans terme 1-périodique, deux unités
déphasées d'exactement une demi-période auraient une pose **identique** — le déphasage ne
servirait à rien précisément pour l'écart le plus probable. Un léger déséquilibre entre
les deux pas rend le cycle 1-périodique, et se justifie de toute façon : aucune démarche
n'est parfaitement régulière.

## Conséquences

- `idlePose` respire par l'écrasement et non plus par un décalage vertical : une unité
  qui monte et descend sur place à l'arrêt flotte, exactement comme le marcheur d'avant.
- `flyPose` est inchangé et reste le seul à user d'un `dy` ample — un volant n'a aucun
  appui à trahir, et un vol sans amplitude ne serait pas un vol. Un test garde cette
  asymétrie de contrat entre marcheurs et volants.
- **Le héros n'est pas touché.** Il a son propre bob (1,5 px, bien moins criant) et
  surtout un cycle de frappe dont l'arc de lame est calé sur sa position ; changer son
  ancrage demanderait de reprendre cette géométrie pour un gain marginal. À faire si
  l'écart se voit une fois les monstres en place.

## Alternatives écartées

**Des cycles d'animation dessinés.** L'obstacle n'est pas le nombre d'images mais
l'incohérence du personnage d'une génération à l'autre (voir ci-dessus).

**Déformation par maillage (`Phaser.GameObjects.Rope`).** C'est la technique qui donnerait
le plus — le bas planté, le haut du corps qui suit avec du retard. Mais `Rope` est
**WebGL uniquement**, et le jeu tourne en `Phaser.AUTO` avec repli canvas sur une cible
mobile : les créatures disparaîtraient purement et simplement sur un appareil sans WebGL.
À reconsidérer seulement avec un repli explicite.

**Découper chaque sprite en parties (tête, torse, jambes) et animer un pantin.** Qualité
maximale et compatible canvas, mais demande un découpage MANUEL par créature — soit
exactement le travail par sprite qu'on cherche à éviter, déplacé du dessin vers la
segmentation.

**Baisser simplement l'amplitude du `dy`.** Atténue le symptôme sans le traiter : un
sprite qui se translate peu reste un sprite rigide qui flotte, il ne marche pas davantage.
