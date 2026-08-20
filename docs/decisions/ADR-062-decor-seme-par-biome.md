# ADR-062 — Décor semé sur le champ de bataille, reteint par biome

## Statut
Accepté (2026-08-20)

## Contexte

Le sol est généré sur canvas depuis ADR-016 : nuances larges, touffes, grain, et une
palette par biome depuis ADR-023. Il n'a jamais contenu d'OBJET. Sur les grandes
surfaces libres — et les cartes en ont beaucoup, l'aire jouable fait 900×600 pour six
emplacements de tour — la répétition du pavage se voit, et le champ se lit comme un
aplat.

Le problème est devenu visible avec la refonte graphique (ADR-061) : des sprites peints,
à contour noir épais, posés sur un aplat sans relief, paraissent collés dessus.

Le PO a demandé si les sols et les chemins devaient être repris comme les créatures. Ils
ne peuvent pas l'être de la même façon :

- **Les sols ne sont pas des fichiers.** Les remplacer par des images imposerait
  **10 textures raccordables** (une par biome). Une tuile qui ne se raccorde pas produit
  une grille de carrés bien pire que la répétition actuelle, et un générateur d'images ne
  produit pas de tuiles seamless de façon fiable.
- **Le chemin n'est pas une image du tout.** C'est trois traits empilés le long d'une
  polyligne arrondie calculée depuis les waypoints de la carte, avec multi-chemins et
  portails de Faille. Aucun sprite ne peut le remplacer.

Or le pack Tiny Swords, déjà versionné, contient rochers et buissons — explicitement
réservés à « l'habillage des biomes (ADR-023) » dans `public/assets/README.md`, et jamais
câblés depuis. C'est une dette inscrite noir sur blanc.

## Décision

Semer des props sur le sol plutôt que refaire le sol.

### Le placement est un module PUR et testé

`render/world/decor.ts` ne dépend ni de Phaser ni du DOM. C'est le placement qui peut se
tromper — poser un buisson sur la route, ou sous un emplacement de tour — donc c'est le
placement qui est testé, pas la peinture.

Les zones interdites sont exprimées en distance à des POLYLIGNES et à des POINTS. La
distance aux polylignes, et non aux seuls waypoints : les routes du jeu sont faites de
longues lignes droites, et ne tester que les sommets laisserait tout leur milieu libre.
Le tracé pris en compte est le tracé VISUEL (`drawPath`), pas les waypoints logiques —
c'est celui que le joueur voit, et l'arrondi des virages s'en écarte.

**Grille jitterée plutôt que tirage uniforme.** Un tirage uniforme laisse des amas et des
vides francs, qui se lisent comme une intention alors que ce n'est que du bruit. Une case
par prop, position tirée à l'intérieur de la case, donne une répartition régulière sans
alignement perceptible. Les cases dont le point tombe en zone interdite sont SAUTÉES, pas
repliées à côté — un repli collerait le prop au bord de la route. Le compte rendu est donc
au plus celui demandé, souvent moins sur une carte chargée : c'est voulu.

**Déterministe**, comme le sol (pas de `Math.random`) : un chapitre rejoué garde son
décor. Un décor qui saute d'une partie à l'autre se remarque, et rendrait toute capture de
référence incomparable.

La graine dérive de l'IDENTIFIANT du chapitre, pas de son rang. Deux chapitres du même
biome ont ainsi des semis différents — c'est précisément ce que corrigeait ADR-023 pour le
sol — et insérer un chapitre ne rebat pas le décor de tous les suivants.

### Les props sont reteints par LUMINANCE, pas teintés

Les rochers et buissons du pack sont d'un vert-bleu vif. Posés tels quels sur les cendres,
le givre ou la terre gâtée, ils jureraient franchement.

`setTint` ne peut pas résoudre ça : il MULTIPLIE (ADR-014), donc il ne peut qu'assombrir
un vert vers un vert plus sombre, jamais l'amener au brun d'une terre gâtée.
`remapBufferByLuma` (`assets/colorRemap.ts`, déjà en place pour la jauge d'or) change la
TEINTE en gardant le RELIEF du dessin.

**La gamme se DÉRIVE du sol du biome** plutôt que d'être saisie à la main. Vingt valeurs à
régler pour dix biomes, c'est vingt occasions de se tromper — et un onzième biome
arriverait sans décor. Dérivée, la règle tient en deux facteurs et tout nouveau biome
hérite d'un décor cohérent. Le prop est toujours plus SOMBRE que son sol : c'est ce qui le
fait lire comme un objet posé dessus et non comme une tache de lumière, et ça le garde en
retrait des unités.

### Deux nombres par biome

`BiomeDef.decor` ne porte que `count` et `bushShare`. Une lande de cendre ou de givre est à
`bushShare: 0` — rien n'y pousse, et un buisson vert y hurlerait. La forêt monte à 0,75.

### Les buissons ne sont pas animés

Les planches du pack alignent 8 frames. Seule la première est utilisée : animer une
vingtaine de buissons de fond coûterait plus que ça n'apporte, et le décor doit rester en
retrait.

## Conséquences

- Les props sont ajoutés au container de terrain APRÈS les routes et AVANT le cadre : donc
  au-dessus du sol, mais SOUS la vignette, qui les assombrit comme le reste. Un prop resté
  lumineux dans un coin sombre attirerait l'œil exactement là où il ne se passe rien.
- `rock-01..04` et `bush-01..04` sortent de la réserve d'assets. Les nuages restent non
  câblés — la dette diminue sans disparaître.
- Une texture par (biome × famille × variante), fabriquée à la demande et gardée en cache.
  Un chapitre en fabrique au plus 8.
- **Les sols et les chemins ne sont PAS remplacés par des images.** Si le besoin revient,
  ce sera une décision séparée, avec son coût propre : 10 tuiles raccordables à produire et
  à vérifier une par une.

## Alternatives écartées

**Dix textures de sol générées par IA.** Le raccord est le point dur, pas le dessin. Une
tuile non seamless donne une grille visible — le défaut qu'on cherche justement à corriger,
en pire. Écarté d'un commun accord avec le PO.

**Texturer le chemin.** Sa géométrie est calculée par le code et varie d'une carte à
l'autre ; le texturer demande un système de bandes raccordées et de virages, sans rapport
avec un simple remplacement d'asset.

**Teinter les props avec `setTint`.** Techniquement en place et gratuit, mais incapable de
sortir de la teinte source (ADR-014). C'est l'erreur que `colorRemap.ts` existe pour éviter.

**Saisir les couleurs de décor biome par biome.** Vingt valeurs à régler, vingt occasions
de dériver, et aucun décor pour un futur biome tant que personne n'y pense.
