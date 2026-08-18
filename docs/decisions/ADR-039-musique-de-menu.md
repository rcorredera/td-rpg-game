# ADR-039 — Musique de menu (boucle fabriquée par montage)

## Statut
Accepté (2026-08-18). Referme le point resté ouvert d'ADR-037/038 : aucune musique de fond
n'existait, faute de source CC0 Kenney bouclable.

## Contexte

Le PO a fourni un fichier (`nastelbom-fantasy-454036.mp3`, ~1 min 37, aucune métadonnée
embarquée — nom cohérent avec un export Pixabay Music) pour servir de musique de MENU
uniquement, pas de musique de run. Le fichier brut n'est pas conçu pour boucler : silence de
tête (~0,5 s) et fondu de sortie vers le silence (~4,2 s, mesuré par `silencedetect`) — bouclé
tel quel, la coupure aurait été audible (silence puis reprise brutale au volume plein).

## Décision

**Boucle fabriquée par montage ffmpeg**, pas de boucle « naturelle » du morceau original :
1. Segment actif isolé (hors silence de tête et fondu de fin) : 0,57 s → 92,7 s (~92,1 s utiles).
2. Fondu enchaîné de 4 s entre la fin (`tail`) et le début (`head`) du segment actif
   (`acrossfade`, courbes triangulaires) — la fin du fichier de boucle se fond progressivement
   dans le même matériau que son propre début, donc le raccord de bouclage ne produit ni
   silence ni saut de volume.
3. Résultat : `music-menu.ogg`, 88,13 s, Vorbis ~130 kb/s (~1,4 Mo — largement plus gros que les
   SFX de quelques Ko, attendu pour une piste longue).
4. Vérifié par `ffmpeg -stream_loop 1` (deux lectures bout à bout) : aucun silence détecté au
   point de raccord, niveaux RMS avant/après du même ordre. Pas de vérification À L'OREILLE
   possible en session — à confirmer en jeu par le PO avant de considérer le sujet clos.

**`render/audio.ts`** — musique traitée séparément des SFX : une piste longue à démarrer/arrêter
(`playMenuMusic`/`stopMenuMusic`), pas un tir-et-oublie (`playSfx`). Catégorie « musique »
(`musicEnabled(settings)`, cœur pur testé) réutilise le réglage `AudioSettings.music` déjà prévu
par ADR-038.

**Jouée UNIQUEMENT dans `MenuScene`** : démarrée (idempotente) au `create()`, arrêtée
inconditionnellement au `shutdown` de la scène (départ en run) — indépendamment des réglages, car
même `music: true` ne doit PAS jouer pendant un run. `applyAudioSettings` coupe la musique si les
réglages l'interdisent pendant qu'elle joue, mais ne la démarre jamais lui-même : seul le contexte
(ici `MenuScene`) sait s'il est un endroit qui en veut.

## Conséquences

- La modale de réglages (ADR-038) pilote désormais une vraie musique : basculer « Musique »
  l'arrête/la relance en direct, vérifié en pilotant `window.__game` (comptage d'instances
  `Sound` actives avant/après clic).
- Vérifié que la musique s'arrête bien en démarrant un run (`scene.start("game", …)`) et reprend
  au retour au Campement.
- `assets.integrity.test.ts` couvre `music-menu.ogg` sans modification (regex étendue à `.ogg`
  depuis ADR-037).
- ⚠ La boucle redémarre du début à chaque `scene.restart()` du Campement (resize/rotation,
  ADR-025) — léger accroc audible à cette occasion, accepté : `MenuScene` reconstruit déjà tout
  son écran à neuf au resize, la musique suit la même logique.
- Licence à confirmer avec le PO avant fusion : le nom de fichier laisse penser à un export
  Pixabay Music (licence Pixabay, libre y compris commercial) mais aucune métadonnée ne le
  garantit — `public/assets/README.md` documente la provenance déclarée, à corriger si besoin.

## Alternatives écartées

- **Garder le fichier original sans montage, boucler tel quel** : le fondu de sortie vers le
  silence aurait rendu la coupure de boucle flagrante (silence puis reprise au volume plein).
- **Fondu simple en fin de piste (fade-out/fade-in) plutôt qu'un crossfade enchaîné** : laisse un
  bref moment de silence à chaque boucle — acceptable pour une transition ponctuelle, pas pour
  une ambiance censée tourner en continu pendant toute la navigation du Campement.
