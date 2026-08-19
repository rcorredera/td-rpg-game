# ADR-051 — Livraison des chapitres 11-20 et du boss final

## Statut
Accepté (2026-08-19)

## Contexte
ADR-049/050 avaient préparé le terrain (bestiaire, refonte de `makeWaves`) sans encore
ajouter aucun chapitre. Cette PR livre les 10 cartes du deuxième acte (ch.11-20),
raccorde le bestiaire déjà en place aux vagues réelles, et fait de Le Roi Fangeux (ch.20)
le vrai boss final — le Roi-Charogne (ch.10) devient officiellement un boss intermédiaire.

## Décision
- **10 nouvelles cartes** (`CH11_MAP`…`CH20_MAP`) : ch.11-19 REPRENNENT la géométrie de
  ch.2-10 (paths + slots identiques), seul l'habillage change (nom, biome, lore). Choix
  délibéré après plusieurs itérations manuelles ratées (voir `.ai/pitfalls.md`) : une
  carte dessinée à l'œil viole quasi systématiquement une des cinq contraintes vérifiées
  par `datasheet.test.ts` (distance route/dalle, dalle/château, dalle/dalle, zone jouable
  HUD mobile, portée mini des tours) — réutiliser une géométrie déjà validée élimine
  cette classe d'erreurs entièrement. Ch.20 garde un tracé dédié (proche de ch.10, comme
  prévu par ADR-049/050), ajusté après plusieurs passages de l'audit.
- **`CONTENT.chapters`** passe de 10 à 20 entrées. Ch.10 : `waveCount=12`, Vouivre en
  finale ×2,8 (INCHANGÉ, `makeChapter`/`makeWaves` déjà préparés par ADR-049/050 pour
  ce cas précis). Ch.20 : `waveCount=12`, Le Roi Fangeux (`the_gravedigger`) en finale
  DÉDIÉE, jamais en trash.
- **Boss final rééquilibré** : le `hpMult` posé provisoirement à 1.4 (ADR-050, avant
  d'avoir un contexte de jeu réel pour le tester) s'est révélé trop faible — gagnable
  sans Forge par 2 politiques d'autoplay sur 3. Porté à 2.8 (aligné sur le multiplicateur
  du boss volant de ch.10) pour redevenir infranchissable sans méta complète, tout en
  restant gagnable en profil vétéran (`autoplay.test.ts`, invariant ADR-024 — qui vise
  maintenant ch.20 automatiquement, `LAST` étant calculé dynamiquement).
- **`shardsChapterMult`** (économie des Éclats) étendu de 10 à 20 valeurs (même pas de
  progression, +0,22/chapitre) : le tableau ne couvrait que les index 0-9, un chapitre
  au-delà retombait au multiplicateur par défaut ×1 et cassait le ratio dernier/premier
  attendu par `economy.test.ts` (retombé à ×1,1 au lieu de ×3 minimum).
- **Menu de sélection (`storyView.ts`)** : AUCUN changement de code nécessaire. La
  grille utilisait déjà `scrollArea`/`UiScrollList` avec un contenu dimensionné
  dynamiquement (`scroll.setContentHeight`) — passer de 10 à 20 tuiles (2 à 4 rangées de
  5) fonctionne nativement, vérifié en navigateur (scroll fluide jusqu'au ch.20).
- `sim.test.ts` : le test générique `CONTENT.chapters` a une longueur codée en dur
  (`toHaveLength(10)` → `20`) — seul changement de test nécessaire, tout le reste de la
  couverture (sprites, vagues, portée) est déjà générique et a absorbé les 10 nouveaux
  chapitres sans modification.

## Conséquences
- Le jeu passe de 100 à 200 vagues de contenu scripté total. Bestiaire du deuxième acte
  entièrement raccordé (les 9 créatures normales ET le boss apparaissent maintenant
  réellement en jeu, plus seulement dans `CONTENT.enemies`).
- `GDD.md` mis à jour : ch.10 explicitement "boss intermédiaire", ch.20 "vrai boss
  final", table Bestiaire déjà à jour depuis ADR-049/050.
- Équilibrage fin (par chapitre, pas seulement l'invariant global du dernier) NON fait
  dans cette PR — les 257 tests passent, mais aucune passe de playtest manuel n'a couvert
  chaque chapitre individuellement. À surveiller au premier vrai run complet.

## Alternatives écartées
- **Dessiner 10 géométries de carte entièrement nouvelles** — écarté après plusieurs
  itérations manuelles ayant chacune échoué à au moins une contrainte du test : le coût
  (temps + risque d'erreur) ne se justifiait pas face à la réutilisation de géométries
  déjà éprouvées, l'habillage (biome/nom/lore) suffisant à distinguer les chapitres.
- **Garder `hpMult: 1.4` pour Le Roi Fangeux** — écarté : cassait l'invariant ADR-024
  central du jeu (fin de campagne conditionnée à la méta), mesuré directement par
  `autoplay.test.ts` plutôt que supposé.
