# ADR-038 — Réglages audio : catégories, master, volume

## Statut
Accepté (2026-08-15). Étend ADR-037 (système audio, SFX + mute global).

## Contexte

ADR-037 posait un mute global unique (`Profile.muted`). Le PO a demandé un contrôle plus fin :
pouvoir couper indépendamment la musique, les notifications (sons d'UI) et les dégâts (SFX de
gameplay), plus un interrupteur « tout » et un réglage de volume — avant même qu'une musique de
fond existe, pour que son ajout futur respecte une préférence déjà persistée.

## Décision

**`Profile.muted: boolean` → `Profile.audio: AudioSettings`** (`core/types.ts`) :
```ts
interface AudioSettings {
  master: boolean;       // coupe tout SANS effacer les préférences par catégorie
  music: boolean;         // réservé — aucun son n'y est encore rattaché (ADR-037)
  notifications: boolean; // sons d'UI (clic…)
  damage: boolean;        // SFX de gameplay (tirs, impact, morts, dégât château)
  volume: number;         // 0..1, global, appliqué par-dessus le mix de chaque son
}
```
`muted` n'avait jamais été committé/déployé : pas de migration à assurer depuis lui, seulement
depuis un vieux profil de prod qui n'a NI `muted` NI `audio` (`DEFAULT_AUDIO_SETTINGS`, source
unique du profil neuf ET du repli de migration — dupliquer ce défaut aurait fini par diverger,
même leçon que les géométries recopiées de `.ai/pitfalls.md`).

**Piège de copie évité** : `DEFAULT_AUDIO_SETTINGS` est un objet UNIQUE — chaque `Profile` doit en
recevoir une COPIE (`{ ...DEFAULT_AUDIO_SETTINGS }`), sinon `toggleAudioFlag` sur un profil
muterait la constante partagée par tous les profils neufs suivants (reproduit puis corrigé en
test : `profile.test.ts` couvre explicitement « deux profils neufs, pas un objet partagé »).

**`ProfileService`** : `audioSettings()`, `toggleAudioFlag(flag)` (`AudioFlag` = catégorie ou
`"master"`), `stepVolume(±1)` (pas de 10 %, bornée [0, 1], résidus flottants arrondis).

**`render/audio.ts`** — le problème central : `playSfx` est appelé depuis `uiButton`
(`render/components/button.ts`), point d'entrée unique de TOUT bouton du jeu (une centaine
d'écrans). Faire transiter `ProfileService` jusque-là aurait plombé tous ces appelants pour un
seul besoin. Solution : un CACHE module-level (`current: AudioSettings`), mis à jour par
`applyAudioSettings(scene, settings)` — appelé au `create()` de chaque scène et à chaque
changement de réglage. Même principe que `scene.sound.mute`/`.volume`, déjà un état global Phaser
partagé par toutes les scènes d'un même `Phaser.Game` (ADR-037) : le cache de catégories suit la
même logique pour la partie que Phaser ne porte pas nativement.

**Cœur pur testé** : `sfxEnabled(settings, key): boolean` (= `settings.master &&
settings[catégorie(key)]`) ne prend PAS la scène en paramètre — testable sans Phaser
(`audio.test.ts`), suit la règle du skill secure-dev-standards (« tout traitement… doit avoir un
cœur pur et testé »). `playSfx`/`applyAudioSettings` restent les seules fonctions à toucher
`scene.sound`.

**UI — modale plutôt que vue dédiée** : le bouton son du bandeau du Campement (ADR-037) ouvre
désormais `uiModal` (déjà utilisé pour l'intro/la confirmation de sortie) au lieu de couper
directement — 4 interrupteurs + volume ne se prêtent pas à un simple clic. Pas de nouvelle vue de
hub (`hubLayout`/tuile de navigation, ADR-025) : la charge ne le justifie pas, et une modale
réutilise l'existant sans nouveau composant.

**Volume en paliers de 10 % (boutons −/+), pas de slider à glisser** : aucun composant slider
n'existe dans `render/components/`, et un slider correct sur mobile dans une zone potentiellement
défilante rouvrirait les pièges déjà documentés d'ADR-013 (action au relâchement, `DRAG_SLOP`,
abandon si le geste dérive). Le PO a demandé « gérer le volume », pas une précision au pixel — un
bouton reste tactile par construction (`touchSize`, ADR-011) sans code de geste supplémentaire.

**Rebuild plutôt que mise à jour en place** : `uiModal`/`uiButton` ne renvoient pas de référence
mutable vers leur contenu interne (limite déjà documentée pour `uiButton`, ADR-037/pitfalls). Le
contenu de la modale est reconstruit entièrement (`content.removeAll(true)` puis redessiné) à
chaque clic sur un interrupteur ou un bouton de volume.

## Conséquences

- Toute mutation de réglage DOIT repasser par `applyAudioSettings(scene, profileSvc.audioSettings())`
  après persistence (`ProfileService` ne fait que persister — dissocier les deux aurait laissé
  l'UI et le SoundManager désynchronisés du profil sauvegardé).
- Vérifié en pilotant `window.__game` en session headless : ouverture de la modale, bascule de
  chaque interrupteur (label ON/OFF, persistance localStorage), pas de volume (texte %,
  `scene.sound.volume`), et un vrai clic sur « Fermer » passant par `uiButton` → `playSfx`
  (comptage des instances `Sound` actives avant/après, pas un appel direct à `scene.sound.play`
  qui aurait contourné le filtrage).
- 11 nouveaux tests (5 dans `audio.test.ts` sur le routage catégorie/master, 4 dans
  `profile.test.ts`, 2 dans `save.test.ts` sur la migration).

## Alternatives écartées

- **Un volume par catégorie plutôt qu'un seul volume global** : le PO a dit « gérer le volume »
  au singulier — sur-ingénierie non demandée pour ce livrable, à reconsidérer si le besoin se
  précise.
- **Passer les réglages en paramètre de `playSfx` à chaque appel** plutôt qu'un cache
  module-level : aurait exigé de faire transiter `ProfileService`/`AudioSettings` jusqu'à
  `uiButton`, donc jusqu'à tous ses appelants — changement de signature massif pour un seul besoin,
  quand `scene.sound.mute`/`.volume` prouvent déjà que l'état global fonctionne pour ce jeu.
- **Étendre `UiModal`/`UiButton` pour exposer leurs objets internes**, afin de mettre à jour
  l'affichage en place plutôt que de tout reconstruire : changerait une API partagée par tous les
  appelants pour ce seul cas d'usage — même arbitrage qu'ADR-037 pour le bouton mute.
