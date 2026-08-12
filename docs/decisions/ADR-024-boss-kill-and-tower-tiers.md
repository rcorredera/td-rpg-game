# ADR-024 — Abattre le boss, et débloquer des paliers plutôt que des tours

**Statut** : accepté · **Date** : 2026-08-12

## Contexte

Trois constats d'un playtest sur mobile.

**1. On pouvait gagner un niveau en laissant passer son boss.** Un ennemi qui atteint
le château en est retiré (`alive = false`) après avoir infligé ses dégâts. La condition
de fin de vague — plus aucun ennemi vivant — était donc satisfaite, et la victoire
tombait. Le boss n'était qu'un gros sac de points de vie facultatif.

**2. La Tour de givre verrouillée rendait le chapitre 1 très rude.** Elle coûtait
30 Éclats à l'armurerie, et le joueur devait donc gagner sans elle pour se l'offrir.
C'est le pire enchaînement possible : **un joueur bloqué ne gagne pas de quoi se
débloquer.** L'ADR-020 venait par ailleurs d'établir que les trois tours forment un
triangle de rôles — un triangle dont un côté manque n'en est pas un.

**3. La méta débloquait de mauvaises choses.** Proposition du PO : rendre les tours
disponibles et vendre plutôt des **paliers de puissance**.

## Décision

**Un boss doit être abattu.** `EnemyState.boss` marque les boss de vague ; si l'un
d'eux atteint le château, la partie est perdue. Un ennemi ordinaire coûte des points de
vie, un boss coûte le niveau.

**Les trois tours sont constructibles dès la première partie.** `requiresUnlock` reste
en place pour d'éventuelles tours futures — c'est son emploi sur la Tour de givre qui
était mauvais, pas le mécanisme.

**La méta vend des paliers.** `UnlockDef` gagne `maxTowerLevel` et `allowSpecialize` ;
`RunState` porte `maxTowerLevel` et `canSpecialize`, que `upgradeTower` et
`specializeTower` respectent. Les **trois rangs** du content sont ouverts d'emblée et
c'est le **rang 4** — les spécialisations — que « Doctrines de siège » débloque.

Le menu de tour annonce le verrou (« Spécialisations verrouillées — à débloquer à
l'Armurerie ») au lieu d'afficher des options que le clic ignorerait en silence.

## Conséquences

Le chapitre 1 passe de **défaite à 9 vagues sur 10** à une **victoire trois étoiles**,
château intact. L'autoplay gagne 9 chapitres sur 10 avec un profil vierge, et le
chapitre 10 reste réservé à un joueur équipé (ADR-022).

### Un plafond mal placé casse tout

Le premier réglage plafonnait les tours au **rang 2** sans achat. Mesuré : le chapitre
1 lui-même devenait infranchissable, avec 400 pièces d'or inutilisables faute de quoi
les dépenser. C'est la même erreur que la Tour de givre verrouillée, sous une autre
forme — un plafond qui mord avant le premier achat empêche de faire le premier achat.
D'où le rang 3 d'emblée.

### Les boss ont dû être allégés

Rendre un boss éliminatoire change sa fonction : il ne grignote plus des points de vie,
il décide de la partie. Les multiplicateurs des chapitres 1 à 9 ont donc baissé
d'environ 30 % (le boss du chapitre 1 de ×4 à ×2,6). Sans cet ajustement, tous les
chapitres tombaient pile à leur dernière vague.

La Vouivre du chapitre 10 fait exception et *monte* à ×2,8 : c'est elle qui porte la
contrainte de Forge décrite plus bas, et sa valeur est un seuil mesuré, pas un réglage
au jugé.

### Effet de bord assumé sur le triangle de rôles

L'écart entre le mélange des trois tours et la meilleure tour seule se resserre : 9
contre 8 victoires, là où il était de 10 contre 7 (ADR-020). C'est structurel — **un
boss est une cible isolée, ce qui favorise le mono-cible**, et la règle en fait un
passage obligé de chaque niveau. L'écart en points de vie de château reste net (424
contre 354, soit +20 %) et les deux garanties du triangle tiennent, mais le point est à
surveiller : si l'écart continue de se réduire, il faudra durcir les vagues ordinaires
en densité plutôt que rehausser les boss.

### La Forge était facultative

Vérification faite à la demande du PO — « on ne doit pas terminer le niveau 10 avec des
tours de niveau 1 dans la Forge ». Elle ne l'était pas : rejouer la campagne avec et
sans forge maximale donnait **9 victoires sur 10 dans les deux cas**, et **5 points de
vie de château d'écart cumulés sur dix chapitres**. La Forge existait depuis des mois
comme puits d'Éclats, pas comme progression.

Elle est désormais la **condition du dernier chapitre** : le multiplicateur du boss
final est calé à ×2,8, seuil mesuré au-dessus duquel une campagne sans Forge est perdue
quelle que soit la stratégie, et où une campagne forgée l'emporte en jouant bien. Elle
passe par ailleurs de 4 à **6 rangs** par tour (2 325 Éclats au total contre 825).

Règle qui en découle : **un axe de méta qu'on peut ignorer sera ignoré.** Chaque axe
doit être mesuré avec et sans — le banc sait le faire en une seconde.

## Alternatives écartées

- **Laisser le boss retirer beaucoup de points de vie** au lieu de faire perdre. Plus
  doux, mais ça ne rétablit pas l'enjeu : un joueur avec assez de PV pourrait encore
  l'ignorer, et la demande était explicite — le boss doit être tué.
- **Baisser le prix de la Tour de givre.** Ne règle pas le problème de fond : à
  n'importe quel prix, elle reste absente de la première partie, celle qui apprend le
  jeu.
- **Vendre les rangs 2 et 3 à l'armurerie** (lecture littérale de « niveau 2 ou 3 de
  base »). Mesuré : infranchissable. Les rangs du content sont l'échelle de puissance
  *normale* d'une partie ; les vendre revient à mutiler la boucle in-run.
- **Des niveaux de spécialisation achetables**, également suggérés. Repoussé : c'est le
  puits naturel de la troisième monnaie des Failles infinies (GDD §Failles), et l'y
  placer maintenant viderait ce mode de sa substance.
