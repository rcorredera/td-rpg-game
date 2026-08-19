# ADR-044 — Bestiaire terrestre entièrement CraftPix

## Statut
Accepté (2026-08-19)

## Contexte
ADR-043 avait introduit 5 sprites CraftPix (scorpion, troll, ogre, chevalier noir, fantôme)
en complément du skin SVG maison, qui restait actif sur les 10 créatures d'origine. Le
joueur juge le rendu SVG généré "pas joli" et demande de le remplacer partout où c'est
possible, quitte à renommer les créatures pour coller à l'image plutôt que l'inverse.

Les deux packs CraftPix comptent 20 variantes de monstres au total ; 5 étaient déjà
utilisées (ADR-043), 15 restaient disponibles. **Aucune des 20 n'est une unité volante** —
contrainte déjà posée par ADR-043 et qui n'a pas changé.

## Décision
- **6 créatures terrestres reskinnées** depuis les variantes CraftPix restantes, en
  gardant les `id` de contenu (donc les vagues, l'équilibrage et les tests existants
  inchangés) — seul le sprite et, quand l'image ne correspond plus au nom, le
  `name`/`lore` changent :
  - `rat` — diablotin violet (pack2 variante 5). Renommé **Diablotin de faille**
    (l'image ne ressemble plus à un rongeur).
  - `goblin` — gobelin casqué à la massue (pack1 variante 5). Nom inchangé, l'image colle.
  - `orc` — orc gris aux crocs et au cimeterre (pack1 variante 8). Nom inchangé.
  - `brute` — zombie/orc trapu à la hache (pack2 variante 2). Nom inchangé, silhouette
    toujours massive.
  - `golem` — chevalier d'acier (pack1 variante 4). Renommé **Golem de fer** (l'image
    est mécanique, pas minérale) ; `armor: 11` et le reste des stats ne bougent pas.
  - `warlord` — guerrier imposant à la grande épée (pack1 variante 10). Nom inchangé.
- **`bat`, `gargoyle`, `wyvern` restent en SVG maison** : ce sont les 3 seules créatures
  volantes du bestiaire, et aucune des 20 variantes CraftPix des deux packs n'en propose.
  Le point de swap (`render/sprites.ts`) ne bouge pas pour elles.
- Fichiers ajoutés : `public/assets/skin-craftpix/{imp,goblin-knight,orc-fang,
  brute-zombie,steel-golem,warlord}.png`, rognés (padding transparent) depuis les mêmes
  deux packs qu'ADR-043.
- `render/assets.ts` : les 6 clés quittent la table `MEDIEVAL` (SVG) pour la table
  `CRAFTPIX` (PNG) — les fichiers SVG correspondants (`foe-rat.svg`, `foe-goblin.svg`,
  `foe-orc.svg`, `foe-brute.svg`, `foe-golem.svg`, `foe-warlord.svg`) restent sur le
  disque, non référencés, comme `foe-wraith.svg` depuis ADR-043.

## Conséquences
- Le skin maison SVG (ADR-016) ne couvre plus que 3 ennemis (les volants) + le héros et
  le chrome de tours/Bastion. Le bestiaire terrestre est intégralement CraftPix.
- `render/sprites.ts` ne change pas une seule ligne : les clés `spr_rat`, `spr_goblin`,
  etc. restent les mêmes, seul ce qu'elles chargent (`assets.ts`) change — le point de
  swap unique d'ADR-005 tient une nouvelle fois.
- **Limite héritée d'ADR-043, toujours valable** : licence CraftPix "free" à vérifier
  avant publication publique — non tranchée ici.

## Alternatives écartées
- **Redessiner les 3 volants en SVG amélioré** — écarté : hors demande du joueur, qui
  visait le remplacement par CraftPix, pas une repasse du skin maison.
- **Garder les noms d'origine (Rat de faille, Golem de pierre) malgré l'image** —
  écarté : le joueur a explicitement autorisé le renommage plutôt que de forcer une
  image à représenter un nom qu'elle ne montre pas.
