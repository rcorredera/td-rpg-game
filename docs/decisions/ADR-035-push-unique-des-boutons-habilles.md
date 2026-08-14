# ADR-035 — Point d'entrée unique pour l'état enfoncé des boutons habillés

## Statut
Accepté (2026-08-14). Corrige une incohérence relevée par le PO au repos (« le mode push des
boutons n'est pas cohérent avec le style de base »), et complète ADR-032.

## Contexte

`uiButton` (`render/components/button.ts`) — le composant de base, utilisé dans onze fichiers
(menus, modales, onglets, rangées de liste, bouton « ⟵ Camp »…) — et la barre d'actions du HUD de
run (`render/game/hud.ts`) rendaient chacun leur propre langage visuel pour le même geste :

- `uiButton` composait un **scale-squish** : conteneur ramené à 0,96 à l'appui, puis 1,04 au
  relâchement (hérité d'avant l'habillage Tiny Swords, où la teinte + le grossissement étaient le
  SEUL signal disponible en l'absence de planche « enfoncée » dessinée).
- La barre du HUD, elle, ne touchait à AUCUNE échelle : elle affichait la planche enfoncée du pack
  telle quelle et décalait le libellé de 3 px pour suivre le creux qu'elle dessine (`PRESS_DY`,
  câblé dans `wireHudPress` — ADR-032, validé par quatre retours de playtest MOBILE).

Une fois l'habillage du pack actif (le cas quasi permanent en jeu, `uiSkinActive` renvoie vrai dès
que la planche est chargée), `uiButton` cumulait donc DEUX signaux pour le même appui : la planche
elle-même, dessinée plus plate par l'artiste, ET un ressort artificiel par-dessus — alors que le
HUD n'affichait que le premier. D'où la remarque du PO : deux boutons visibles sur le même écran
(HUD de run et bouton « ⟵ Camp », tous deux habillés par le même pack) ne « poussaient » pas pareil.
`hud.ts` reconnaissait d'ailleurs déjà la duplication dans son propre commentaire
(« D'où la duplication de l'habillage ici »), sans qu'elle ait été résorbée.

## Décision

**`skinPressVisual` (`render/components/button.ts`) devient le point d'entrée UNIQUE du « push »
du pack**, partagé par `uiButton` et par `Hud.wireHudPress` : il repose la texture
(`uiSkinSetTexture`, ADR-032) et décale les libellés/icônes de `SKIN_PRESS_DY` (3 px, valeur
héritée de l'ancien `PRESS_DY`) pour qu'ils suivent la plaque plus plate.

`uiButton` ne compose plus de scale-squish quand le skin est actif — la planche porte déjà le
signal, tel que dessiné par l'artiste. Le scale-squish (0,96 à l'appui) reste le repli du mode
Kenney SANS planche enfoncée dessinée, où il demeure le seul signal disponible. Le grossissement
au survol (1,04, desktop uniquement) est inchangé des deux côtés : orthogonal au « push », il
signale le survol de la souris, pas l'appui.

## Conséquences

- Un seul chemin de code décide de ce qu'« enfoncé » veut dire pour un bouton habillé — un futur
  bouton n'a plus à choisir entre deux idiomes.
- Vérifié en pilotant `window.__game` depuis la console (capture d'écran indisponible en session,
  cf. ADR-034) : appui/relâchement simulés sur le bouton « ⟵ Camp » (`uiButton`) et sur un bouton
  du HUD (« Auto ») donnent la MÊME transition (`ts_btn` → `ts_btn_press`, libellé décalé de
  +3 px), et le conteneur de `uiButton` ne bouge plus d'échelle pendant l'appui.
- `PRESS_DY` (`render/game/constants.ts`) est supprimé au profit de `SKIN_PRESS_DY`
  (`render/components/button.ts`) — une seule constante, au même endroit que la fonction qui
  l'utilise.

## Alternatives écartées

- **Aligner `hud.ts` sur `uiButton`** (ajouter le scale-squish à la barre du HUD) : le squish
  cumulé à la planche déjà plus plate double le signal — précisément le défaut relevé côté
  `uiButton`. L'approche du HUD est en outre la seule des deux validée par playtest mobile réel
  (ADR-032).
- **Garder les deux implémentations séparées mais synchronisées « à la main » (mêmes constantes
  recopiées)** : c'est l'état précédent, qui a déjà divergé une fois sans qu'aucun test ne le
  voie — une valeur recopiée finit toujours par diverger (même leçon qu'ADR-030 pour une
  géométrie recopiée).
