# LORE — Bastion (fichier de contexte)

> **Statut : placeholder.** Ce fichier sera remplacé/alimenté par le product owner.
> Quand le lore définitif arrive, on adapte `src/content/index.ts` (noms et textes
> des chapitres, intro) à partir d'ici — le code n'a pas besoin de changer (ADR-004).

## Ce que le jeu attend de ce fichier

Pour **l'intro** (premier lancement) :
- 4-5 lignes max, qui posent l'univers et disent au joueur quoi faire.

Pour **chaque chapitre** (20 depuis ADR-049/051, en deux actes) :

| Champ | Contrainte | Exemple actuel |
|---|---|---|
| Nom | court, affiché dans la liste Histoire | « La Route du Bastion » |
| Lore | 1-3 lignes, affiché sous la liste | « Les éclaireurs gobelins sondent vos défenses… » |
| Ambiance/intention | libre — guide le design de la carte et des vagues | escarmouche d'ouverture |

Utile aussi, si tu en as : noms de lieux (pour les cartes), noms de monstres
(pour le bestiaire, 24 créatures aujourd’hui), et tout ce qui touche aux DEUX
boss — le Roi-Charogne (fin du premier acte) et Le Roi Fangeux (boss final).

## Lore provisoire en place (à remplacer)

- **Univers** : an 312 du Vieux Royaume. Les hordes du Roi-Charogne déferlent du
  Nord ; le Bastion est la dernière place forte de la vallée.
- **Acte I (ch.1-10)** — **Ch.1 — La Route du Bastion** : les éclaireurs gobelins
  sondent les défenses. **Ch.2-9** : noms et lore GÉNÉRÉS provisoires. **Ch.10 —
  Le Roi-Charogne** : boss INTERMÉDIAIRE depuis ADR-049/050 — il ne conclut plus
  l'Histoire, mais reste le pic de mi-parcours.
- **Acte II (ch.11-20)** — ajouté par ADR-051. **Ch.11-19** : noms et lore générés
  provisoires, une créature nouvelle par chapitre. **Ch.20 — Le Roi Fangeux** :
  vrai boss final, dont la chute débloque les Failles infinies.

⚠ Le nombre de chapitres n'est écrit nulle part en dur : tout se dérive de
`CONTENT.chapters` (déblocage des Failles, courbe d'Éclats, invariant de Forge —
voir `.ai/pitfalls.md`). Ajouter un acte III ne demanderait donc que du contenu.
