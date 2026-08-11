# ADR-022 — Un bestiaire qui pose des questions

**Statut** : accepté · **Date** : 2026-08-11

## Contexte

Demande initiale : « un type de monstre en plus par niveau, quitte à faire ensuite
des mix », plus de volants, et des boss aux vagues 5 et 10 — le tout formulé
explicitement comme un moyen, pas une fin : « les types d'ennemis c'est juste pour
ajouter de la stratégie sur les types de tour ».

Ce cadrage est le bon, et il impose son propre préalable : **un ennemi « anti-X » ne
crée de la stratégie que si la tour censée le contrer vaut la peine d'être
construite.** L'ADR-020 a réglé ce préalable ; le bestiaire pouvait alors être écrit.

Le jeu comptait quatre créatures qui posaient au fond une seule question — combien de
points de vie faut-il retirer, et le ciel est-il concerné. Aucune n'invalidait une
tour en particulier.

## Décision

Six créatures, chacune conçue pour **neutraliser une tour et en valoriser une autre**.
Une créature qui n'invalide rien n'ajoute que de la difficulté.

| Créature | Question posée | Neutralise | Valorise |
|---|---|---|---|
| **Rat de faille** | saturation (14 PV, très nombreux, très serrés) | le mono-cible | catapulte |
| **Spectre** | insensible au ralentissement | tour de givre | puissance brute |
| **Gargouille** | volant *lourd* (115 PV) | catapulte | archerie investie |
| **Golem de pierre** | cuirassé (armure 11) | tirs rapides et faibles | gros coups, brûlure |
| **Chef de guerre** | boss terrestre, vagues 5 et 10 | les tours à zone | dégâts sur cible unique |
| **Vouivre** | boss **volant**, chapitre 10 | toute défense au sol | anti-aérien |

Deux mécaniques nouvelles sur `EnemyDef`, toutes deux dans le content (ADR-003) :

- **`armor`** — réduction plate par coup. Punit les tirs rapides et faibles,
  récompense les gros coups, et **la brûlure en % des PV max l'ignore** : c'est ce
  qui donne enfin une raison de choisir « Feu grégeois » plutôt que « Trébuchet ».
- **`slowImmune`** — rend le contrôle inopérant, ce qui oblige à ne pas bâtir toute
  sa défense sur le ralentissement.

**Progression** : une créature apparaît à chacun des chapitres 2 à 5, puis les
chapitres suivants les mélangent. La troisième vague de chaque chapitre la présente
**seule**, pour qu'elle s'enseigne avant de se combiner.

Le **Bestiaire affiche les traits** (`cuirassé 11`, `insensible au froid`) à côté de
« volant ». Sa promesse est « connaître l'ennemi, c'est déjà le vaincre » : taire ce
qui décide du choix de tour la contredit.

La **taille d'affichage rejoint le registre de skin** (`SpriteRef.size`). Elle vivait
dans une cascade de ternaires de `GameScene`, illisible à dix créatures — et c'est une
propriété du skin (ADR-005), pas de la scène.

## Conséquences

Le triangle de rôles se creuse encore, la diversité étant désormais imposée par le
contenu et non seulement par les rendements :

| Composition | Victoires | PV château cumulés |
|---|---|---|
| **Les trois tours** | **8/10** | **127** |
| Archerie seule | 4/10 | 26 |
| Tour de givre seule | 0/10 | 0 |
| Catapulte seule | 0/10 | 0 |

Et surtout, une propriété que le jeu promettait sans jamais la tenir : **le dernier
chapitre est infranchissable sans méta-progression et franchissable avec** (mesuré :
défaite à 11 vagues sur 12 avec un profil vierge, victoire avec 16 PV restants pour un
profil équipé). La boucle run → monnaies → run plus fort cesse d'être décorative.

### Calibrage — trois erreurs corrigées par la mesure

Aucune n'aurait été visible sans le banc d'essai, et chacune rendait le jeu injouable :

1. **La nuée remplaçait l'ouverture** au lieu de s'y ajouter : le chapitre 4 tombait
   en une vague. La première vague reste la piétaille de base — c'est celle où le
   joueur pose ses premières tours avec 160 pièces.
2. **La vague de présentation arrivait en 2ᵉ position**, quand le joueur n'a que deux
   tours : il perdait la moitié de son château face à une mécanique imparable. Une
   mécanique ne s'enseigne pas quand elle ne peut pas être contrée. Déplacée en 3ᵉ.
3. **Le plancher d'armure à 10 %** ramenait l'archerie de base à un dixième de ses
   dégâts face au golem : la tour la plus courante devenait décorative. Porté à 25 % —
   l'armure reste très dissuasive sans être absolue.

### Garanties

Trois tests nouveaux : le dernier chapitre est perdu sans méta, gagné avec, et chacun
des chapitres 2 à 5 apporte au moins une créature de plus que le précédent.
`sprites.test.ts` couvrait déjà l'oubli d'un sprite.

## Alternatives écartées

- **Neuf créatures, une par chapitre** — la demande littérale. Quatre axes de réponse
  n'en portent pas neuf : les surnuméraires n'auraient été que des variations de
  points de vie. Six créatures donnent quinze paires, et ce sont les **mélanges** qui
  différencient les chapitres tardifs — comme suggéré dans la demande elle-même.
- **Une quatrième tour « psychique » contre des fantômes.** Le spectre rend le même
  service avec les tours existantes, en invalidant le givre. Une tour de plus se
  justifiera quand les trois actuelles auront été jouées.
- **Des résistances élémentaires** (feu/glace). Demande un système de types de dégâts
  qui n'existe pas ; `armor` couvre déjà l'idée « certains dégâts passent mal » pour
  un coût très inférieur.
- **Réutiliser une brute agrandie comme boss.** C'était l'existant. Un boss doit se
  reconnaître à sa silhouette avant qu'on lise sa barre de vie.
