# ADR-021 — Remettre la méta-progression sous tension

**Statut** : accepté · **Date** : 2026-08-11

## Contexte

Constat de playtest : « j'ai fait le niveau 3 de l'histoire, j'ai pu tout débloquer
dans l'armurerie, donc soit ça coûte pas assez, soit les niveaux sont pas assez
impactants. » Le banc d'essai (ADR-018) a mesuré les deux, et la cause n'était ni
l'une ni l'autre.

Une méta tient quand la **source** (ce qu'un run rapporte) et le **puits** (ce qu'il y
a à acheter) restent en tension sur toute la durée du jeu. Les deux étaient cassés :

- **Source plate.** Terminer le chapitre 10 rapportait ×1,11 le chapitre 1 — la
  récompense valait `vagues × 5` et tous les chapitres ont dix vagues. La difficulté
  montait, la récompense non : rejouer la carte la plus facile était strictement
  optimal.
- **Puits minuscule.** L'armurerie contenait 3 déblocages pour 120 Éclats, soit **2
  runs** pour 10 chapitres. Les sorts du héros : 24 Sceaux, **2 runs** également.
- **Monnaie mal indexée.** Les Sceaux comptaient les kills du héros. Or le banc a
  mesuré qu'un héros posté en dernier rempart tue *moins* mais fait *gagner* des
  chapitres que le laisser à l'entrée perd. La monnaie payait littéralement le
  placement le moins efficace.

Deux valeurs d'équilibrage vivaient encore hors du content, dans `createRun` : le
bonus de PV de « Remparts renforcés » et l'effet de « Pluie de flèches ». Ajouter un
palier d'armurerie obligeait donc à modifier la simulation — la raison même pour
laquelle personne ne l'avait fait.

## Décision

**Les Sceaux paient le temps, pas les kills.** `RunState.heroBlockSeconds` compte les
secondes pendant lesquelles le héros retient un ennemi au corps à corps :
`floor(secondes / 9) + 2 si victoire − 1 par mort`, jamais négatif. La pénalité de
mort évite le symétrique — se jeter dans la horde pour mourir aussitôt. L'écran de fin
de run et l'onglet Héros disent désormais ce qui est récompensé : un joueur optimise
ce qu'on lui montre.

**Une courbe de récompense par chapitre.** `shardsChapterMult` passe de ×1 partout à
**×1 → ×3,32**. Le champ existait déjà, laissé à 1 en attendant la mesure.

**Un puits élargi.** L'armurerie passe de 3 à **6 paliers** et de 120 à **420 Éclats** ;
les sorts de 3 à **4 niveaux** et de 24 à **56 Sceaux**. Les deux nouveaux paliers
d'armurerie soutiennent des axes de jeu existants plutôt que d'ajouter des chiffres :
« Coffre de guerre » (+70 or de départ) ouvre d'autres débuts de partie, « Serment du
Chevalier » (retour au combat 3 s plus tôt) soutient le rôle de bloqueur que les
Sceaux récompensent désormais.

**Les déblocages portent leurs effets.** `UnlockDef` rejoint le `ContentPack` avec ses
champs `castleHp`, `startingGold`, `heroRespawnS`, `accountSpell`, que `createRun`
applique sans les connaître. Ajouter un palier est redevenu un travail de contenu.

## Conséquences

| Mesure | Avant | Après |
|---|---|---|
| Runs pour vider l'armurerie | 2 | **5** |
| Runs pour épuiser le puits d'Éclats | 10 | **14** |
| Runs pour maxer les sorts | 2 | **12** |
| Chapitre 10 rapporté au chapitre 1 | ×1,11 | **×3,32** |

Le rapport du banc affiche « aucune saturation détectée » pour la première fois.

Le banc a aussi corrigé une hypothèse fausse au passage : il supposait 110 secondes de
blocage par run. Le gain réellement mesuré est de **2 à 4 Sceaux (14 à 50 s)**. La
valeur par défaut du rapport est descendue à 35 s — la médiane mesurée — parce qu'une
hypothèse optimiste faisait croire le puits trois fois plus vite rempli qu'il ne l'est.

### Garanties

Cinq tests, dont trois nouveaux : les chapitres tardifs paient au moins ×2 le premier,
l'armurerie tient au moins 4 runs, les Sceaux ne sont jamais négatifs, les morts du
héros coûtent, et la projection sans jeu coïncide avec un run réellement joué.

**Prouvé par mutation** : remettre `shardsChapterMult` à `undefined` fait échouer la
garantie de courbe (`expected 1.105… to be greater than or equal to 2`).

## Alternatives écartées

- **Augmenter simplement les coûts.** C'était la première hypothèse du constat. Elle
  ne règle pas la source plate : avec des prix doublés, farmer le chapitre 1 reste
  strictement optimal, il faut juste le farmer deux fois plus.
- **Garder les Sceaux sur les kills et corriger ailleurs.** Aucun réglage de barème
  ne répare une métrique qui mesure la mauvaise chose. Il fallait changer ce qui est
  compté.
- **Compter les sorts lancés** plutôt que le temps de blocage. Plus simple, mais
  récompense l'usage de cooldowns disponibles de toute façon — un joueur passif les
  lance aussi. Le temps de blocage exige d'exposer le héros au bon endroit.
- **Fusionner Éclats et Sceaux** (piste ouverte au GDD). Prématuré : les deux robinets
  viennent seulement d'être réglés indépendamment, ce qui était l'intérêt de les
  séparer.
