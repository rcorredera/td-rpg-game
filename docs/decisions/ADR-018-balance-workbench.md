# ADR-018 — Banc d'essai d'équilibrage headless

**Statut** : accepté · **Date** : 2026-08-11

## Contexte

Deux constats de playtest, à deux mois d'écart, disent la même chose : « tout était
acheté au ch.4 » (GDD §Méta), puis « j'ai fait le niveau 3 et j'ai tout débloqué dans
l'armurerie ». Entre les deux, la forge a été ajoutée pour élargir le puits — le
symptôme est revenu quand même, parce que le vrai défaut n'était pas là.

Chaque passe d'équilibrage a été calibrée avec un **bot de simulation jetable**
(GDD §Décisions : « stratégies scriptées jouées par la sim headless — méthode à
réutiliser pour toute passe future »). Cet outil n'a jamais été commité. Résultat :
la méthode est réinventée à chaque fois, les mesures ne sont pas reproductibles, et
personne ne peut vérifier une affirmation d'équilibrage six semaines plus tard.

Or le contenu à venir est d'un tout autre ordre : un type d'ennemi par chapitre, des
boss aux vagues 5 et 10, davantage de volants, dix cartes distinctes. Régler tout ça
en jouant à la main est irréaliste — une partie prend plusieurs minutes, il en
faudrait des centaines.

Trois valeurs d'équilibrage vivaient par ailleurs **en dur dans `computeResult`**
(Éclats par vague, bonus de PV, bonus de victoire), hors de portée d'ADR-003. C'est
précisément ce qui les a laissées dériver pendant que le reste bougeait.

## Décision

Ajouter `src/balance/`, un **banc d'essai qui tourne sans navigateur**, livré et
testé au même titre que le reste. `npm run balance`.

- **`datasheet.ts`** — lecture analytique du content : PV par vague, DPS mono-cible
  et de pointe, investissement, fenêtre de tir, masse d'un chapitre, part de PV
  volants.
- **`autoplay.ts`** — joueur artificiel rejouant un chapitre entier, selon trois
  politiques (`spread`, `focus`, `mixed`) et avec ou sans pilotage du héros.
- **`economy.ts`** — santé de la méta : source contre puits, runs avant saturation.
- **`report.ts` / `cli.ts`** — mise en forme et seul point d'E/S.

Le barème de fin de run **déménage dans le content** (`ContentPack.rewards`), avec un
`shardsChapterMult` optionnel — le levier prévu contre le farm du premier chapitre.
Ce déplacement ne change **aucune valeur** : c'est une mise en conformité ADR-003,
et le rééquilibrage se fera ensuite, mesures en main.

### Ce qui rend cet outil digne de confiance

Un banc d'essai qui diverge de la simulation est **pire qu'aucun banc d'essai** : il
ne casse rien, il conseille simplement des ajustements sur des chiffres inventés.
`datasheet` et `economy` dupliquent forcément des formules de `sim.ts` pour les
projeter sans jouer ; chacune est donc confrontée à la sim elle-même, pas à une
valeur écrite à la main — PV comparés vague par vague sur tous les chapitres,
dégâts au château comparés à un impact réel, Éclats et Sceaux comparés au résultat
d'un run effectivement joué.

Le déterminisme d'ADR-001 (aucun RNG) est ce qui rend tout cela possible : deux
mesures d'un même réglage sont identiques, donc un écart observé vient bien du
réglage. Un test le verrouille.

### Ce que ce n'est pas

Les politiques ne sont pas de bons joueurs, ce sont des **étalons reproductibles**.
Leurs constantes règlent l'étalon et non le jeu : elles ne relèvent pas d'ADR-003 et
n'ont rien à faire dans `src/content/`. Aucune n'entre dans la simulation.

Un chapitre gagné par une politique et perdu par une autre ne dit pas « le jeu est
mal réglé » : il dit *où regarder*.

## Conséquences

Le banc a payé dès sa première exécution, en révélant quatre défauts qu'aucun n'avait
été vu en jouant :

- **La récompense ne dépend pas du chapitre.** Terminer le ch.9 rapporte ×1,11 le
  ch.1. Rejouer la carte la plus facile est strictement optimal, et l'armurerie se
  vide en 2 runs pour 10 chapitres — les sorts du héros aussi.
- **La difficulté n'est pas monotone.** Le ch.3 est perdu par deux politiques sur
  trois, alors que les ch.4 à 9 sont gagnés. Plus un chapitre est tardif, plus ses
  vagues sont grosses, plus elles rapportent d'or, plus il devient facile.
- **L'or cesse d'être une contrainte.** Le ch.10 se termine avec 1 800 à 3 800 pièces
  inutilisables : la défense est plafonnée par les 6 emplacements, identiques sur
  toutes les cartes. Il n'y a plus de décision économique passé la mi-partie.
- **Les Sceaux récompensent le mauvais placement.** Mesuré : un héros posté en fin de
  parcours tue *moins* mais fait *gagner* des chapitres que le laisser à l'entrée
  perd. Comme la monnaie est indexée sur ses kills, elle paie le placement le moins
  efficace.
- **Le triangle de rôles n'existe pas.** Une défense d'archeries seules gagne 9
  chapitres sur 10 ; un mélange des trois tours n'en gagne que 5 ; catapulte seule et
  givre seul, aucun. Choisir sa tour n'est pas une décision — c'est un piège.

Coût accepté : les formules d'analyse dupliquent celles de la sim. Les tests miroirs
sont ce qui rend cette duplication tenable — sans eux, cet ADR serait à refuser.

`vite-node` est déjà présent (dépendance de vitest) : aucune dépendance ajoutée.
`cli.ts` déclare localement la surface Node dont il a besoin plutôt que de tirer
`@types/node`, qui exposerait les globals Node à tout le projet — `core/` et
`render/` doivent continuer à se les voir refuser au typecheck (ADR-001).

## Alternatives écartées

- **Un tableur.** C'est l'outil historique du game design, et il reste bon pour
  explorer une courbe. Mais il modélise le jeu au lieu de l'exécuter : il ne verra
  jamais qu'un ennemi est bloqué par le héros, ni qu'une tour ne couvre pas la
  deuxième voie. Il diverge silencieusement du code.
- **Une surcouche de debug dans le jeu.** Utile pour observer une partie en cours, et
  toujours souhaitable un jour — mais elle exige de jouer, donc ne permet pas de
  balayer 10 chapitres × 3 stratégies en une seconde. Complémentaire, pas
  substituable.
- **Refaire un bot jetable.** C'est le statu quo, et la raison pour laquelle ce
  travail est refait aujourd'hui.
