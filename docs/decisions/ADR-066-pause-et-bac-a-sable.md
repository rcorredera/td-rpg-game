# ADR-066 — Pause qui fige tout, et bac à sable d'observation

## Statut
Accepté (2026-08-21)

## Contexte

La reprise graphique (ADR-061 à 065) se juge sur le champ de bataille, et rien n'y aidait :

- **Aucune pause.** Une animation qui défile ne s'inspecte pas.
- **Aucun moyen d'atteindre une créature donnée.** Il fallait entrer dans un vrai niveau,
  poser des tours, survivre, puis attendre la bonne vague. Le boss du chapitre 20 demande
  d'avoir conquis dix-neuf chapitres.
- **Aucun niveau ne couvre les quatre directions.** Les cartes sont surtout horizontales,
  ce qui masque exactement le défaut que le PO vient de relever : un sprite de profil paraît
  juste tant qu'il longe l'axe pour lequel il a été dessiné.

## Décision

### La pause fige TOUT le champ de bataille, pas seulement la simulation

`GameScene` tient désormais son propre compteur de temps, distinct de l'horloge Phaser. Il
avance avec `update` sauf en pause, et date **aussi bien la simulation que les animations et
les effets**.

Ne figer que la simulation aurait laissé les créatures marcher sur place et les effets se
dérouler : ce n'est pas une pause, c'est un jeu cassé. Et c'est ce gel complet qui rend une
animation inspectable image par image — l'usage qui a motivé le bouton.

Le bouton est placé **au coin haut**, à côté de « Camp », et non dans la barre d'actions :
celle-ci porte déjà six boutons, et un septième la ferait déborder sur mobile ou
rétrécirait les cibles sous le plancher tactile (ADR-011). Son libellé est du TEXTE et non
un glyphe « ⏸ », qui serait rendu par la police du système (ADR-012).

### Le bac à sable est un chapitre HORS du jeu

Une carte à quatre voies — vers la droite, la gauche, le bas et le haut — et une vague par
créature, dans l'ordre du registre. Le château y a 9999 PV : on vient regarder, pas survivre.

**Il ne figure PAS dans `CONTENT.chapters`.** L'écran Histoire, le banc d'équilibrage et
tous leurs tests parcourent ce tableau ; un vingt-et-unième chapitre à 9999 PV et 24 vagues
y fausserait chaque mesure, et les tests d'équilibrage continueraient de passer — sur de
mauvais chiffres. La scène tourne donc sur un **pack de contenu dérivé** dont l'unique
chapitre est le sien, ce qui n'a demandé aucune modification de la simulation.

Il **ne rapporte rien** : ni éclats, ni étoiles, ni découvertes de bestiaire. Il donne accès
à toutes les créatures d'un coup ; les archiver reviendrait à offrir la progression que le
jeu fait gagner.

### Il s'ouvre par un drapeau d'URL, pas par une tuile

`?sandbox` fait apparaître son entrée au Campement. Pas de sixième tuile : elle changerait
toute la mise en page du hub pour un outil d'atelier, et un joueur n'a rien à y faire.

Pas non plus de garde `import.meta.env.DEV` : elle ferait disparaître l'outil des **builds
de preview**, or c'est précisément là qu'on regarde le rendu. Un drapeau d'URL survit à la
compilation, reste invisible pour qui ne le connaît pas, et n'ouvre rien de sensible.

## Conséquences

- `GameScene` reçoit son pack de contenu au lieu d'importer `CONTENT` directement. Le reste
  du jeu est inchangé.
- Les créatures du bac à sable sont réparties sur les quatre voies **à chaque vague** : sans
  cela il faudrait rejouer la vague pour voir la même créature descendre.
- Les apparitions y sont volontairement espacées. Un flot serré empile les silhouettes et
  empêche justement d'en observer une.
- Le bac à sable est couvert par ses propres tests — dont celui qui vérifie qu'il **reste
  hors de `CONTENT.chapters`**, la seule erreur qui se propagerait en silence.

## Alternatives écartées

**Une pause qui n'arrête que la simulation.** Plus simple, mais elle laisse tourner ce qu'on
veut justement figer.

**Ajouter le bac à sable aux chapitres du jeu, avec un drapeau à filtrer.** Il aurait fallu
penser à ce filtre dans l'écran Histoire, le banc d'essai et chacun de leurs tests — un
oubli quelque part, et les mesures d'équilibrage dérivent sans rien casser de visible.

**Une tuile au Campement.** Change la mise en page du hub, et expose au joueur un outil qui
ne le concerne pas.

**Un bouton conditionné à `import.meta.env.DEV`.** Absent des builds de preview, donc absent
là où il sert.
