# Assets — provenance & licences

| Dossier | Pack | Auteur | Licence | Source |
|---|---|---|---|---|
| `kenney-td/` | Tower Defense (top-down) — ~300 sprites + tilesheet + SVG | Kenney (kenney.nl) | **CC0** | miroir opengameart.org |
| `kenney-ui/` | UI Pack — boutons/panneaux (plusieurs couleurs) + polices Kenney Future | Kenney (kenney.nl) | **CC0** | miroir opengameart.org |
| `kenney-ui-rpg/` | UI Pack RPG Expansion — curseurs gantelet/main/épée, panneaux RPG | Kenney (kenney.nl) | **CC0** | miroir opengameart.org |
| `kenney-td/` | **Tower Defense (top-down)** — planche `sheet.png` 64×64 (tourelles, tanks, avions, tuiles, FX) — **SKIN ACTIF** | Kenney (kenney.nl) | **CC0** | kenney.nl (zip officiel) |
| `kenney-tiny/` | Tiny Dungeon + Tiny Town — 16×16 — skin médiéval **alternatif** (inactif) | Kenney (kenney.nl) | **CC0** | kenney.nl (zip officiel) |
| `icons/` | Icônes de sorts (tornado, flying-flag, arrow-cluster, arrow-flights) | **Lorc** — game-icons.net | **CC BY 3.0** ⚠ crédit obligatoire | raw.githubusercontent.com/game-icons/icons |
| `../fonts/` | Cinzel (titres, capitales gravées) + Alegreya (textes) | Natanael Gama / Juan Pablo del Peral | **OFL 1.1** | github.com/google/fonts |

CC0 = domaine public : usage commercial autorisé, crédit non obligatoire (mais sympa : « Kenney.nl »).
OFL 1.1 = libre y compris commercial ; ne pas revendre les polices seules.

Note : les **curseurs** ne viennent plus du pack `kenney-ui-rpg` (PNG 30px, flous) — ils sont
dessinés à la volée sur canvas dans `src/render/ui.ts` (nets à tout DPR, servis en image-set 2x).

⚠ **CC BY 3.0 (icônes)** : crédit obligatoire à l'écran (crédits du jeu) avant toute distribution :
« Icons by Lorc — game-icons.net — CC BY 3.0 ». Les fonds noirs des SVG d'origine ont été retirés
(glyphe blanc sur transparent, teintable par Phaser).

Intégration : `kenney-tiny/` (planches `dungeon.png` + `town.png`, frames 16×16, grille 12×11,
index = `row*12 + col`) remplace progressivement le rendu procédural de `src/render/` via le registre
**`src/render/sprites.ts`** (point de swap unique — voir ADR-005). La sim n'est pas concernée (ADR-001).
Couche payante future (Tiny Swords 64×64 animé, peinture) : se branchera en éditant `sprites.ts`/`assets.ts`.
