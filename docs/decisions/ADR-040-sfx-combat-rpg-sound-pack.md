# ADR-040 — SFX de combat : RPG Sound Pack (CC0) plutôt que Kenney

## Statut
Accepté (2026-08-18). Retouche d'ADR-037 après playtest du PO.

## Contexte

Playtest du PO sur les SFX d'ADR-037 : le clic UI (`click_001`, Kenney) jugé trop sec, et les
SFX de dégâts (tirs/impact/mort ennemi/mort héros) jugés **trop proches les uns des autres** et
**pas assez médiévaux**. Diagnostic confirmé en relisant les sources : ADR-037 avait puisé dans
*Impact Sounds* de Kenney (impacts génériques bois/métal/tissu, pensés pour un jeu quelconque) et
*Interface Sounds* (sons d'UI), faute d'un pack de combat fantasy dédié chez Kenney — vérifié à
nouveau ici, toujours aucun.

Recherche élargie à OpenGameArt.org : plusieurs candidats à sonorité RÉELLEMENT médiévale (arc,
lame, magie) trouvés, mais en CC-BY ou CC-BY-SA (crédit obligatoire, voire partage à l'identique).
Le PO a tranché : CC-BY accepté (le jeu porte déjà un crédit CC-BY pour les icônes de sorts,
ADR-012/Lorc), CC-BY-SA écarté. Le **RPG Sound Pack** (artisticdude, 405 favoris) s'est révélé
**CC0** — mieux que la contrainte acceptée, retenu sans hésitation.

## Décision

Remplacement du CONTENU de 5 des 8 fichiers `public/assets/audio/sfx-*.ogg` (noms de fichiers
INCHANGÉS, donc **aucune modification de code** — seul le contenu audio change) :

| Rôle | Avant (ADR-037, Kenney) | Après (RPG Sound Pack, CC0) |
|---|---|---|
| Tir catapulte | `impactWood_heavy` (thud générique) | `battle/swing2.wav` (swing d'arme) |
| Tir givre | `glass_001` (tintement verre) | `battle/magic1.wav` (whoosh magique) |
| Impact/explosion | `impactSoft_heavy` (thud générique) | `battle/spell.wav` (déflagration magique) |
| Mort d'ennemi | `impactSoft_medium` (thud générique) | `NPC/gutteral beast/mnstr3.wav` (grognement de créature) |
| Mort du héros | `impactPunch_heavy` (coup générique) | `inventory/armor-light.wav` (cliquetis d'armure) |

**Conservés tels quels** : tir d'archerie (`pluck_001`, Kenney — déjà distinct, un pincement de
corde évoque bien une corde d'arc) et dégât château (`impactBell_heavy`, Kenney — une cloche
d'alarme reste le bon signifiant, déjà distincte du reste). Clic UI déjà traité séparément
(`select_001` remplace `click_001`, même changement de contenu sans impact code).

## Conséquences

- Chaque rôle a désormais une texture sonore VRAIMENT distincte (swing d'arme / whoosh magique /
  déflagration / grognement / cliquetis d'armure) plutôt que des variantes d'un même « thud »
  Kenney générique — répond directement au « se ressemblent trop entre eux » du playtest.
- CC0 : aucun crédit à ajouter à l'écran, contrairement à ce que le PO avait accepté en dernier
  recours (CC-BY). `public/assets/README.md` documente la source (page OpenGameArt) malgré
  l'absence de fichier de licence dans l'archive elle-même — la page du pack fait foi.
- Aucun changement dans `render/audio.ts` : les clés/fichiers `SfxKey`/`FILES` étaient déjà nommés
  par RÔLE, pas par source (ADR-005 appliqué à l'audio) — remplacer le contenu d'un fichier ne
  touche jamais le code qui le charge, exactement le bénéfice visé par cette discipline.
- `sfx-impact.ogg` passe de ~6,5 Ko à ~49 Ko (le fichier source, `spell.wav`, dure 3,25 s contre
  moins d'une seconde pour les autres SFX) — reste négligeable à l'échelle du dossier `audio/`
  (dominé par `music-menu.ogg`, ~1,4 Mo).

## Alternatives écartées

- **Candidats CC-BY d'OpenGameArt** (`jc-sounds-fantasy-sfx-pack-vol-1`, `archers-shooting`) :
  écartés une fois le RPG Sound Pack (CC0) trouvé — même résultat sonore visé, sans contrainte
  d'attribution.
- **Candidats CC-BY-SA** (`bow-arrow-shot`, `arrow-hit-twang`) : explicitement écartés par le PO
  (partage à l'identique jugé trop contraignant pour une distribution future du jeu).
