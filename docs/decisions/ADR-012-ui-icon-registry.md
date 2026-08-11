# ADR-012 — Registre d'icônes d'UI (fin des emoji système)

## Statut
Accepté (2026-08-11). Applique à l'UI le principe de point de swap unique d'ADR-005 (sprites du monde).

## Contexte
Les cartes du campement portaient des **emoji système** (📜 🔒 🛡 📖 📯), et le HUD un 🏰. Deux
problèmes :

- **Rendu hors de notre contrôle** : un emoji est dessiné par la police système. Le même écran ne
  ressemble pas à lui-même sur Windows, iOS et Android — et sur mobile, cible du projet, on ne
  choisit rien.
- **Couleurs imposées qui cassent la palette** : les emoji sortent en polychrome. Sur fond
  parchemin/or, le 📯 apparaissait rose et le 🔒 orange vif. C'est ce qui signalait « prototype »
  le plus fort à l'écran, avant même les questions de mise en page.

Un emoji ne peut pas non plus être teinté selon un état (verrouillé, Faille, base en péril) : la
couleur fait partie du glyphe.

## Décision

**Un registre d'icônes, des SVG monochromes maison, la couleur appliquée au rendu.**

- `render/icons.ts` : `ICON` associe un **rôle** (`story`, `armory`, `bestiary`, `chronicles`,
  `rift`, `locked`, `castle`) à une clé de texture. Les écrans nomment un rôle, jamais un fichier
  ni un glyphe — changer d'iconographie ne touche que ce fichier (même principe que `sprites.ts`).
- Icônes **dessinées pour le projet** (`public/assets/icons/ui-*.svg`), pas reprises d'un pack :
  le dossier `icons/` contient déjà du game-icons.net en CC BY 3.0, qui impose un crédit à
  l'écran. Ne pas étendre cette dette pour de l'iconographie de navigation.
- **Blanc pur + trous en `fill-rule="evenodd"`**. La teinte est appliquée par `setTint`, qui
  *multiplie* : un détail dessiné en sombre resterait sombre après teinture. Un détail interne se
  fait donc par évidement, jamais par une seconde couleur.
- La couleur devient porteuse de sens : cadenas terne quand les Failles sont verrouillées, violet
  quand elles s'ouvrent, et l'icône du Bastion vire à l'or puis au rouge à mesure que la base perd
  ses PV.
- Rasterisation à 128 px : les SVG sont vectoriels mais Phaser les rasterise une fois au
  chargement, et l'icône grandit avec le plancher tactile sur mobile (ADR-011).

## Conséquences

- Rendu identique sur tout OS, à toute densité, et accordé à la palette.
- Les symboles Unicode **monochromes** conservés (`⚔ ⊙ ◆ ❤ ⚜`) : ils se rendent dans la police du
  jeu et ne posent aucun des deux problèmes ci-dessus. Seuls les emoji polychromes ont été retirés
  — y compris dans du texte, où ils ont cédé la place à des mots (`🪽` → « volant », `🏃` →
  « Vitesse », `🏰 -N PV` → « Base -N PV »), plus lisibles qu'un pictogramme minuscule.
- Le test du registre porte sur l'unicité des clés et la présence des rôles attendus : un rôle
  retiré casse au test plutôt qu'à l'écran, où une texture manquante rend un carré vert.
- **Vérification visuelle indispensable, et elle a servi** : à 26 px les glyphes semblaient
  corrects ; agrandis à 88 px, le cor de Chroniques se lisait comme un **poisson** et le vortex
  comme une **cible**. Le premier a été remplacé par une bannière étoilée, le second par des
  anneaux décalés qui donnent une perspective de tunnel. Toujours contrôler une icône agrandie.

## Alternatives écartées
- **Garder les emoji, en choisir de plus sobres** : ne règle ni le rendu dépendant de l'OS ni
  l'impossibilité de teinter.
- **Reprendre des icônes game-icons.net** : cohérent avec les icônes de sorts existantes, mais
  étend une obligation de crédit CC BY à toute la navigation, pour un gain nul face à un dessin
  maison sur des formes aussi simples.
- **Police d'icônes** : ajoute un fichier de police à charger avant le boot (déjà un point délicat,
  cf. pitfalls) et se teinte moins souplement qu'une image.
