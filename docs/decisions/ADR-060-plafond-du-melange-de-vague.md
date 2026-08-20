# ADR-060 — Plafond du pool de mélange des vagues (`default`)

**Statut** : accepté
**Contexte** : retest de la difficulté du deuxième acte (ch.11-20), point laissé
ouvert par l'ADR-052 (« la difficulté de l'acte 2 est en dents de scie »).

## Constat

La vague "mélange complet" de `makeWaves` (case `default`, coïncidant avec les
vagues de mini-boss et de boss final) ajoute **un spawn par créature débloquée
depuis le début du jeu**, sans plafond. Le pool grandit d'une créature à chaque
nouveau chapitre. Mesuré au ch.19, vague 10 :

```
orc×28, bat×23, gargoyle×4, wraith×8, troll×5, dark_knight×3, shade_warder×5,
frontier_raider×5, rift_marauder×5, veiled_assassin×3, goblin×17  (+boss)
```

**9 types distincts** en une seule vague, contre **4 au maximum** sur tout le
premier acte (où le pool — gargoyle/wraith/troll/dark_knight — plafonnait déjà
naturellement, faute d'y avoir ajouté de créature après le ch.9). L'écart de
difficulté entre chapitres consécutifs (ch.17 vs ch.18, minForge 3★ 0 puis 5)
ne suivait donc pas le newcomer du chapitre comme supposé dans l'audit
précédent, mais la **taille du pool cumulatif**, qui grossit indépendamment du
contenu propre à chaque chapitre.

## Décision

`MIX_POOL` (dans `content/waves.ts`) plafonne le mélange à `MAX_MIX_ENTRIES` = 4
types simultanés, en gardant les **plus récemment débloqués** (`.slice(-4)`) —
la créature qui vient d'entrer en scène doit rester visible dans le mélange,
l'ancienne peut s'effacer. Le premier acte est inchangé (il tenait déjà dans
cette limite) ; seul le deuxième acte se resserre.

## Conséquences

Mesuré (forge minimale pour 3★, tous unlocks, meilleure des 3 politiques) :

| Ch. | avant | après |
|---|---|---|
| 12 | jamais | 6 |
| 18 | 5 | 4 |
| 20 | 5 | 4 |

Ch.13 et 19 restent hors de portée du 3★ à n'importe quel niveau de forge — mais
**ce n'est plus un problème de contenu** : vérifié, le château y termine à
**100 % des PV** (45/45) même à la politique la plus agressive. Seules les morts
du héros (2 à 7 selon la politique) bloquent la troisième étoile, et la forge ne
peut structurellement rien y faire — elle renforce les tours, pas la survie du
héros. C'est un artefact du pilotage naïf de l'étalon artificiel (ADR-018 : « pas
un bon joueur »), pas un déséquilibre de contenu. Aucune correction de contenu
n'est justifiée sur ce point : affaiblir les cuirassés/élites de ces chapitres
compenserait une IA qui s'engage sans discernement, pas un vrai problème pour un
joueur réel.

**Point de la difficulté de l'acte 2 (ADR-052) considéré clos.**
