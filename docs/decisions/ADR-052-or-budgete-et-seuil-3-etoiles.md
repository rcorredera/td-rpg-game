# ADR-052 — L'or in-run devient un budget, et les 3 étoiles un seuil

**Statut** : accepté
**Contexte** : audit de faisabilité et de cohérence des chapitres 11-20 après l'ajout
du deuxième acte (ADR-049/050/051), en préparation du mode Failles infinies.

## Constat

Trois mesures au banc d'essai (`npm run balance`, autoplay sur 20 chapitres × 3
politiques × plusieurs profils méta) :

1. **L'or in-run débordait.** Le plafond de dépense d'un chapitre vaut
   `emplacements × 537` (537 = tour rang 3 + spécialisation). Le ratio
   `or disponible / plafond` valait 0,48 au ch.1, franchissait 1 au ch.10 et
   atteignait **2,80 au ch.20** — 9 001 pièces pour 6 emplacements. Passé le ch.12,
   tout était construit et amélioré au maximum dès la vague 6 : l'or n'était plus une
   contrainte, et le reste du chapitre se jouait sans décision.

2. **La forge ne décidait donc plus rien.** Forge minimale pour 3★, tous unlocks
   achetés : 0 aux ch.1-8, 0 aux ch.14-18. Le joueur n'avait aucune raison
   d'améliorer ses tours pour finir la campagne.

3. **Les 3 étoiles n'étaient pas difficiles, elles étaient binaires.** Le critère
   était l'absence *totale* de dégât au château : un seul PV perdu sur dix vagues
   faisait retomber à 2★. Résultat mesuré : 3★ *impossibles* aux ch.3, 13 et 19 même
   à forge 6, et *triviales* aux ch.14 à 18 à forge 0.

Une quatrième observation a décidé du mécanisme retenu : l'or par kill **diverge par
construction** dans un mode à vagues infiniment croissantes. Les Failles reproduiraient
le débordement du ch.20, en pire et sans borne.

## Décision

### 1. L'or d'un chapitre est budgété (`EconomyRules`)

`economy.chapterBudget[i]` fixe l'or total d'un chapitre, hors or de départ. Les
`goldReward` du bestiaire cessent d'être des montants : ils deviennent une **clé de
répartition**. `resolveBudget` (dans `core/sim.ts`, résolu une fois au `createRun`)
en déduit deux choses :

- `killGoldScale` : facteur appliqué à chaque `goldReward`, tel que les kills versent
  `economy.killGoldShare` du budget — **25 %** ;
- `waveIncome[]` : les **75 %** restants, versés à la fin de chaque vague nettoyée, au
  prorata du poids de la vague.

Le partage 75/25 plutôt que 100/0 : à 0 % de kill, laisser fuir un ennemi ne coûte
plus rien économiquement et la boucle « je tue vite, je suis payé » disparaît. Un
plancher de 1 pièce garde ce retour lisible sur la piétaille, dont le montant à
l'échelle d'un chapitre tardif tomberait à zéro par arrondi.

Budgets calibrés à `emplacements × 537 × ratio`, ratio de **0,50 (ch.1) à 0,84
(ch.19)** : l'or seul ne finance jamais une défense complète. Les chapitres à boss
dédié (10 et 20) reçoivent **1,05** — 12 vagues sur *moins* d'emplacements, le ratio
par slot les affamait au point de rendre le ch.10 invincible même à forge 6.

### 2. Les 3 étoiles passent à un seuil

`rating.perfectHpPct` = **0,90**. 3★ = au moins 90 % des PV de château conservés et
héros jamais mort. Le tout-ou-rien ne pouvait pas être un objectif que la méta
rapproche : il était franchi ou non, jamais approché.

### 3. Les étoiles paient

`rewards.shardsPerStar` = **12 Éclats par étoile**, multiplicateur de chapitre
compris — 3★ au ch.20 valent 187 Éclats, soit deux rangs de forge. C'est le lien
explicite entre « maîtriser un chapitre » et « avoir des tours plus fortes », que
l'ancien barème confiait implicitement à l'or de la partie.

## Conséquences

Mesuré après changement (autoplay, tous unlocks, meilleure des 3 politiques) :

| | avant | après |
|---|---|---|
| Or restant en fin de ch.20 | 4 210 | 2 133 |
| Ratio or/plafond au ch.20 | 2,80 | 1,05 |
| Chapitres 3★ à forge 0 | 18 sur 20 | 11 sur 20 |
| Forge minimale pour 3★ (ch.3 / 9 / 16 / 18) | 6 / 1 / 0 / 0 | 6 / 5 / 3 / 5 |
| Runs pour épuiser le puits d'Éclats | 30 | 22 |

Les 20 chapitres restent tous clairables — le ch.20 demande forge 5 à l'étalon
artificiel, ce qui est l'intention : le boss final doit se payer à la forge.

Aux ch.12, 13, 19 et 20, ce qui bloque encore les 3★ de l'étalon n'est plus le
château mais les **morts du héros** (1 à 4 par run). C'est le comportement voulu :
les dégâts au château se répondent par l'investissement en tours, la survie du héros
par le pilotage et les Sceaux. L'autoplay est un étalon reproductible, pas un bon
joueur (ADR-018) — il pilote mal le héros.

**Pour les Failles infinies** : `defaultChapterBudget` couvre les chapitres hors
table. Un mode à vagues infinies n'aura pas besoin d'une table mais d'une *formule*
de budget par vague — le mécanisme, lui, est déjà en place, et c'est ce qui garantit
que l'or n'y divergera pas. La troisième monnaie du mode reste à définir.

## Ce que cette décision ne traite pas

L'audit a relevé deux autres incohérences, laissées à un livrable dédié car elles
touchent au bestiaire et aux sprites :

- **Le deuxième acte a supprimé le ciel** : les 9 créatures des ch.11-19 sont toutes
  terrestres, le boss final aussi. La part de PV volants tombe de 9-21 % (acte 1) à
  6-7 % (acte 2). L'anti-aérien — donc l'arbitrage Archerie/Catapulte — cesse d'être
  une décision après le ch.10.
- **La difficulté de l'acte 2 est en dents de scie** : les chapitres « nuée » (14, 15)
  sont nettement plus faciles que les chapitres « cuirassé » (13, 16), parce que le
  newcomer du chapitre décide de tout.
