# ADR-014 — Fonds générés sur canvas et harmonisation du terrain

## Statut
Accepté (2026-08-11). Prolonge ADR-012 (identité visuelle) et s'appuie sur ADR-010 (viewport).

## Contexte
Après le socle (format, cibles tactiles, icônes, navigation), il restait le reproche de fond du
PO : « c'est toujours pas beau ». Deux causes précises :

- **Les écrans étaient des aplats** `#1a140e`. Aucune matière, aucune profondeur, et un titre au
  même poids visuel que le reste.
- **Le terrain de combat était vert fluo.** La tuile d'herbe du pack Kenney TD est un vert émeraude
  très saturé qui écrase tout le reste et jure avec la palette parchemin/or du campement. Le décor
  (buissons) s'y perdait, faute de contraste.

## Décision

**Textures de fond générées sur canvas au boot** (`render/backdrop.ts`), plutôt que des images
embarquées : même technique que les curseurs (`render/ui.ts`), déjà éprouvée ici. Pas de poids
d'asset, pas de licence, pas d'image par ratio d'écran, et un fond qui s'adapte à n'importe quelle
taille de vue.

- `TEX_GRAIN` : dalle répétable — marbrures larges + grain fin. Le bruit est **déterministe**
  (fonction sinus, pas `Math.random`) : deux lancements donnent le même fond, donc une capture de
  référence reste comparable.
- `TEX_VIGNETTE` : dégradé radial étiré à la vue, qui referme les bords.
- Repli explicite sur l'aplat historique si la texture ne peut pas être créée : jamais d'écran vide.
- **Bandeau de titre** : fond assombri, filets latéraux effilés, sous-titre en capitales espacées.
  Le titre est le seul élément qui doit crier — il est traité comme tel au lieu de partager le poids
  de tout le reste.

**Harmonisation du terrain.** Point technique qui a coûté plusieurs essais mesurés à l'écran :
`setTint` **multiplie**, donc il assombrit sans jamais désaturer. Teinter l'herbe la rendait juste
plus sombre, toujours aussi verte. La solution retenue combine :

1. un `setTint` doux sur la tuile d'herbe (assombrissement) ;
2. un **voile chaud semi-transparent posé sur TOUT le terrain** — herbe, décor et routes ensemble.
   Appliqué à l'herbe seule, il laissait décor et pads en vert fluo au-dessus d'un sol assourdi ;
3. une **vignette** sur la zone de jeu, qui concentre le regard au centre.

Le décor est détaché par une **ombre portée**, pas par une teinte sombre : teinté, il virait à la
tache noire (essayé, rejeté à l'écran).

## Conséquences

- Campement et terrain partagent enfin la même gamme chromatique.
- Le fond suit toute taille de vue sans image à préparer, et reste net à toute densité.
- Le voile est un objet de plus par terrain — négligeable, et reconstruit avec lui au resize.
- Les éléments de **lisibilité de jeu** restent volontairement vifs par-dessus le voile : anneaux
  dorés des slots, barres de PV, FX. Assourdir le décor ne doit pas assourdir l'information.
- Les tuiles du pack ne sont pas modifiées : le swap de skin d'ADR-005 reste intact, seul le rendu
  est ajusté. Un futur skin devra revoir ces réglages (ils sont concentrés dans `buildTerrain`).

## Alternatives écartées
- **Images de fond embarquées** : poids, licence à suivre, et une déclinaison par ratio d'écran.
- **Remplacer la tuile d'herbe par une texture générée** : maîtrise totale de la couleur, mais
  contourne le registre de skin d'ADR-005 pour un gain qu'un voile obtient déjà.
- **Teinter chaque élément du terrain séparément** : autant de valeurs à maintenir, et le résultat
  se désaccorde au premier ajout d'un type de décor.
