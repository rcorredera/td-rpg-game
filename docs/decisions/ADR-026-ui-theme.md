# ADR-026 — L'habillage des menus devient une donnée

**Statut** : accepté · **Date** : 2026-08-12

## Contexte

Constat de playtest : « le marron il me tend, tu peux pas proposer quelque chose de
plus joli ? ».

Le chrome des menus était figé sur une gamme parchemin/bois/or. Les couleurs étaient
déjà centralisées dans `theme.ts` — mais en valeurs littérales : en changer revenait à
réécrire le fichier, et comparer deux directions à reconstruire l'application entre
chaque essai. Le fond (`backdrop.ts`) portait en plus ses propres couleurs en dur.

Le PO distingue par ailleurs explicitement deux sujets : « les menus c'est un truc pour
moi et ensuite les niveaux où on joue c'est autre chose ». La portée d'un habillage de
menu doit donc être bornée.

## Décision

Une palette devient une **donnée** : `render/uiTheme.ts` définit un type `UiTheme` et
plusieurs palettes ; `theme.ts` en dérive `UI_TINT`, `TEXT` et `ACCENT`, et
`backdrop.ts` y prend son aplat et ses marbrures.

Trois directions, volontairement distinctes :

| Thème | Gamme | Intention |
|---|---|---|
| **Braise** | parchemin, bois, or | l'habillage d'origine, conservé |
| **Nocturne** *(défaut)* | ardoise bleu nuit, or | le froid remplace le brun ; l'or est gardé, c'est lui qui porte l'esprit médiéval |
| **Arcane** | pourpre profond, or rosé | plus « faille » que « donjon », en écho aux portails du jeu |

Un paramètre d'URL `?theme=` bascule la palette **sans reconstruire**. C'est un outil de
décision, pas une option de jeu : aucune interface ne l'expose et une valeur inconnue
retombe silencieusement sur le défaut.

### Portée bornée, et vérifiée

Un thème habille **les menus**. Les couleurs du champ de bataille — terrain, biomes,
familles ennemies, barres de vie — restent dans `palette.ts` et `biomes.ts`. Un test le
garantit : lier les deux ferait changer le jeu en changeant l'habillage des menus, alors
que ce sont deux jugements séparés.

### Ce que les tests vérifient

Pas le goût, mais ce qui rendrait un thème inacceptable :

- **le fond reste sombre** dans chaque palette — texte clair et accents dorés le
  supposent, un thème clair casserait toute la lisibilité sans qu'aucun écran ne le
  signale ;
- **le contraste texte/panneau** dépasse un seuil, pour le texte courant comme pour le
  texte secondaire ;
- **le panneau actif se distingue de l'inactif**, sans quoi l'état « verrouillé » ne se
  lit plus ;
- **les trois directions diffèrent réellement** — deux palettes trop proches ne
  serviraient à rien.

## Conséquences

Choisir une direction artistique se fait désormais en comparant trois écrans réels, pas
en imaginant le résultat. Ajouter une quatrième palette est une entrée de plus dans un
objet.

Le défaut passe à **Nocturne**. « Braise » reste disponible : la question posée était de
proposer autre chose, pas d'effacer l'existant.

## Alternatives écartées

- **Remplacer directement les valeurs de `theme.ts`.** Le plus court, mais on ne compare
  rien : il faut reconstruire entre chaque essai, et l'ancienne direction est perdue.
- **Un sélecteur de thème dans les options.** Séduisant, mais c'est une décision de
  direction artistique, pas une préférence de joueur — offrir le choix reviendrait à ne
  pas trancher, et multiplierait les combinaisons à vérifier.
- **Reteinter aussi le champ de bataille.** Explicitement hors sujet : le PO juge les
  menus et le jeu séparément, et les biomes viennent d'être calibrés (ADR-023).
