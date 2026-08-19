# ADR-050 — Boss du ch.20 et remplacement du ch.11 (images IA du joueur)

## Statut
Accepté (2026-08-19)

## Contexte
ADR-049 laissait le boss dédié du ch.20 ("Le Fossoyeur", nom réservé) sans sprite : le
stock CraftPix des deux packs est intégralement consommé (20/20 variantes). Le joueur a
généré deux images IA (des "oozes" — créatures de gelée, une simple à deux tons, une
couronnée de cristaux) et a explicitement demandé : la couronnée devient le boss du
ch.20, la simple remplace la Gelée Enragée du ch.11 (ex-"Lutin des Tourbières", dont le
sprite CraftPix ne collait de toute façon qu'approximativement au rôle).

**Piège de transmission des images, documenté pour la prochaine fois** : le joueur a
d'abord collé les images directement dans le chat (paste), ce qui ne matérialise AUCUN
fichier sur le disque accessible aux outils — contrairement à un vrai import/glisser-
déposer de fichier, qui avait fonctionné toute la session pour le héros et les tours.
Après plusieurs tentatives infructueuses (retenter le paste, chercher dans `Downloads`,
`Temp`, les caches d'applications Claude), la cause était un import via presse-papier
plutôt que fichier ET un dossier de téléchargement sur un lecteur différent de celui
attendu (`G:\Romain\Téléchargements`, pas `C:\Users\romai\Downloads`) — toujours
demander le chemin RÉEL plutôt que de supposer l'emplacement par défaut.

**Piège de détourage, deuxième occurrence** (déjà documenté pour une tour glacée,
ADR-047) : la passe "poches de fond enfermées" de `keyout.ps1` a de nouveau mangé les
zones de hautes-lumières pâles/vertes du corps des ooze (reflets), confirmée par
l'aperçu réel une fois recadré (pas seulement l'aperçu `Read`, qui avait déjà induit en
erreur une fois cette session pour une tour). Retraité avec `-noHoles` : résultat propre.

## Décision
- **`bog_sprite` (ch.11)** : sprite remplacé par l'ooze simple, nom et lore réécrits pour
  suivre l'image (« Gelée Enragée » plutôt que « Lutin des Tourbières » — le sprite
  précédent, une variante CraftPix imp bleu, ne correspond plus). Stats de jeu
  inchangées : seul l'habillage change, pas le rôle (saturation rapide, ch.11).
- **`the_gravedigger` (ch.20, boss dédié)** : ajouté avec le sprite de l'ooze couronnée
  de cristaux. Renommé « Le Roi Fangeux » — le nom réservé par ADR-049 ("Le Fossoyeur")
  supposait un sprite de guerrier/mort-vivant qui n'a jamais existé ; le nom suit
  l'image, pas l'inverse (même principe qu'ADR-044).
- Détourage : `keyout.ps1` avec `-maxSat 60 -minVal 150 -noHoles` (recette déjà validée
  pour les sprites à hautes-lumières pâles), puis `trim.ps1` (nouveau script, cadre au
  bounding-box du canal alpha — plus simple que `keyout.ps1` quand la source a déjà un
  vrai canal alpha, ce qui est le cas ici : image PNG/JPG générée avec damier PEINT, pas
  un vrai fond, donc keyout reste nécessaire malgré tout).

## Conséquences
- Le bestiaire du deuxième acte est maintenant complet en assets : 10/10 créatures
  ch.11-20 ont leur sprite (9 normales + 1 boss). Reste à construire : les chapitres
  eux-mêmes (cartes, vagues, `makeWaves`, équilibrage) — aucune de ces 10 créatures
  n'apparaît encore dans une vague réelle.
- `X/24` au Bestiaire (vs `X/23` avant cette PR).

## Alternatives écartées
- **Garder le nom "Le Fossoyeur" malgré le nouveau sprite** — écarté : le lore ne
  correspondrait plus du tout à l'image (guerrier fossoyeur vs. ooze cristalline), même
  raison qu'ADR-044 pour renommer plutôt que forcer un nom sur une image qui ne le
  montre pas.
- **Utiliser l'ooze simple comme boss et la couronnée ailleurs** — écarté : le joueur a
  explicitement inversé cette proposition initiale (la couronnée, plus élaborée, est le
  boss ; la simple remplace un monstre existant).
