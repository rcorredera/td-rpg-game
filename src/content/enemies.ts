// ============================================================
// content/enemies.ts — Catalogue des créatures : stats et lore de Bestiaire
// (ADR-003, extrait de `index.ts` par ADR-057).
// Lore provisoire, à harmoniser avec `docs/LORE.md`.
// ============================================================

import type { EnemyDef } from "../core/types";

export const ENEMIES: Record<string, EnemyDef> = {
  goblin: {
    id: "goblin", name: "Gobelin",
    lore: "Maigre, hurlant, jeté en avant par centaines.\nUn gobelin seul n'est rien ; la horde, elle, submerge.",
    hp: 38, speed: 75, flying: false, goldReward: 8, damageToCastle: 1, meleeDps: 8,
  },
  orc: {
    id: "orc", name: "Orc",
    lore: "Le fantassin du Roi-Charogne. Avance au pas, encaisse, progresse.\nLà où l'un tombe, deux comblent le rang.",
    hp: 90, speed: 50, flying: false, goldReward: 15, damageToCastle: 2, meleeDps: 14,
  },
  brute: {
    id: "brute", name: "Brute",
    lore: "On a voulu l'arrêter avec un mur. Le mur a cédé.\nLente, massive, indifférente aux flèches.",
    hp: 260, speed: 30, flying: false, goldReward: 36, damageToCastle: 4, meleeDps: 22,
  },
  bat: {
    id: "bat", name: "Chauve-souris",
    lore: "Sortie des failles, elle ignore routes et barrages au sol.\nLes catapultes ne peuvent rien contre ce qui vole.",
    hp: 30, speed: 95, flying: true, goldReward: 9, damageToCastle: 1, meleeDps: 0,
  },

  // ---- Créatures posant chacune une QUESTION à laquelle une tour répond (ADR-022).
  // Une créature qui ne neutralise aucune tour n'ajoute que de la difficulté.

  // Question : la saturation. Réponse : les dégâts de zone.
  // Reskin CraftPix (ADR-044) : diablotin plutôt que rongeur — le nom suit
  // l'image, pas l'inverse. L'identifiant est resté `rat` deux reskins durant,
  // à ne désigner plus aucune créature du jeu ; aligné en `diablotin` par
  // ADR-061, avec remappage des sauvegardes (`meta/save.ts`).
  diablotin: {
    id: "diablotin", name: "Diablotin de faille",
    lore: "Ils sortent du sol par vagues, violets et innombrables.\nUn seul ne vaut pas une flèche. C'est bien le problème.",
    hp: 14, speed: 100, flying: false, goldReward: 4, damageToCastle: 1, meleeDps: 4,
  },
  // Question : le ciel, mais lourd. Réponse : de l'anti-aérien VRAIMENT investi.
  gargoyle: {
    id: "gargoyle", name: "Gargouille",
    lore: "Descendue des corniches du Vieux Royaume, la pierre lui tient lieu de peau.\nElle vole : vos catapultes la regarderont passer.",
    hp: 115, speed: 42, flying: true, goldReward: 26, damageToCastle: 3, meleeDps: 0,
  },
  // Question : l'armure. Réponse : les gros coups, ou le feu qui ronge les PV max.
  // Reskin CraftPix (ADR-044) : automate d'acier plutôt que pierre — le
  // trait qui compte (armure 11) ne change pas.
  golem: {
    id: "golem", name: "Golem de fer",
    lore: "Les flèches s'y ébrèchent sans laisser de marque.\nIl faut le briser, ou le laisser brûler de l'intérieur.",
    hp: 330, speed: 24, flying: false, goldReward: 42, damageToCastle: 5, meleeDps: 26,
    armor: 11,
  },
  // Question : le contrôle. Réponse : la puissance brute — le givre ne le touche pas.
  wraith: {
    id: "wraith", name: "Spectre",
    lore: "Le froid ne mord pas ce qui est déjà glacé.\nIl traverse la vallée sans jamais ralentir le pas.",
    hp: 58, speed: 88, flying: false, goldReward: 16, damageToCastle: 2, meleeDps: 12,
    slowImmune: true,
  },
  // Question : la saturation, en plus dur que le diablotin. Réponse : dégâts de zone soutenus.
  scorpion: {
    id: "scorpion", name: "Scorpion des sables",
    lore: "Il file bas, sous la portée des premières flèches.\nUn seul dard ne perce rien ; la nuée, si.",
    hp: 20, speed: 95, flying: false, goldReward: 5, damageToCastle: 1, meleeDps: 5,
    armor: 2,
  },
  // Question : l'encaissement mono-cible. Réponse : les tours à zone plutôt que le focus.
  troll: {
    id: "troll", name: "Troll",
    lore: "Il se relève de tout ce qui ne le tue pas d'un coup.\nUne massue en avant, et derrière lui plus rien ne recule.",
    hp: 130, speed: 45, flying: false, goldReward: 20, damageToCastle: 2, meleeDps: 18,
  },
  // Question : l'armure intermédiaire, entre la brute et le golem. Réponse : les gros coups.
  ogre: {
    id: "ogre", name: "Ogre",
    lore: "Il porte son rocher comme d'autres un bouclier.\nCe qui l'égratigne l'agace ; ce qui le brise, il ne l'a pas vu venir.",
    hp: 300, speed: 26, flying: false, goldReward: 40, damageToCastle: 5, meleeDps: 24,
    armor: 6,
  },
  // Question : l'élite rapide et cuirassée. Réponse : du mono-cible investi, pas du volume.
  dark_knight: {
    id: "dark_knight", name: "Chevalier noir",
    lore: "Il ne porte plus de couleurs, seulement une lame et un serment rompu.\nCe qui le ralentit ne l'arrête pas.",
    hp: 200, speed: 55, flying: false, goldReward: 34, damageToCastle: 3, meleeDps: 20,
    armor: 4,
  },

  // ---- Boss. Créatures à part entière et non une brute agrandie : un boss doit
  // se reconnaître à sa silhouette avant de se lire à sa barre de vie.
  warlord: {
    id: "warlord", name: "Chef de guerre",
    lore: "Il porte les couleurs du Roi-Charogne et la hache qui a ouvert la Herse.\nCe qui tombe devant lui, il l'enjambe.",
    hp: 480, speed: 26, flying: false, goldReward: 90, damageToCastle: 8, meleeDps: 40,
  },
  wyvern: {
    id: "wyvern", name: "Vouivre",
    lore: "La dernière chose que virent les Portes du Nord.\nAucun mur n'a jamais arrêté ce qui passe au-dessus.",
    hp: 700, speed: 38, flying: true, goldReward: 150, damageToCastle: 10, meleeDps: 0,
  },

  // ---- Deuxième acte (ch.11-20, ADR-049) : stock CraftPix non utilisé lors du
  // tri initial (ADR-043/044) — 20 variantes examinées au total sur les deux
  // packs, 11 déjà consommées par le bestiaire actuel (round 1 ET round 2, à
  // revérifier systématiquement contre LES DEUX ADR, pas seulement le premier —
  // 3 sprites triés ici l'ont d'abord été SUR des doublons non détectés avant
  // vérification croisée). 9 variantes réellement disponibles, une par chapitre
  // 11-19. Le boss dédié du ch.20 (ci-dessous, tout en bas) et le remplaçant du
  // ch.11 sont deux images IA générées par le joueur (ADR-050, pipeline
  // hero/tours ADR-045/047) — même détourage (flood-fill, `-noHoles` : palette à
  // hautes-lumières pâles, la passe des poches enfermées mangeait les reflets).
  // Question : la saturation rapide, en fin de campagne. Réponse : dégâts de zone soutenus, encore.
  bog_sprite: {
    id: "bog_sprite", name: "Gelée Enragée",
    lore: "Elle n'a plus de forme fixe depuis qu'elle a traversé la Faille.\nCe qui la touche s'y enfonce ; ce qui s'y enfonce n'en ressort pas propre.",
    hp: 45, speed: 100, flying: false, goldReward: 10, damageToCastle: 1, meleeDps: 6,
  },
  // Question : l'encaissement passif (bouclier), sans armure chiffrée. Réponse : la constance des tours à cadence.
  shade_warder: {
    id: "shade_warder", name: "Gardien des Ombres",
    lore: "Son bouclier n'a jamais rendu un coup ; il n'a jamais eu besoin de le faire.\nCe qui frappe dessus s'épuise avant lui.",
    hp: 170, speed: 45, flying: false, goldReward: 24, damageToCastle: 2, meleeDps: 16,
    armor: 3,
  },
  // Question : l'armure ET la portée de mêlée (frappe avant d'être atteint). Réponse : les gros coups, en avance.
  four_eyed_warden: {
    id: "four_eyed_warden", name: "Gardien à Quatre Yeux",
    lore: "Quatre yeux ne dorment jamais tous à la fois.\nSa lance tient le rang à distance que nulle épée n'atteint.",
    hp: 260, speed: 40, flying: false, goldReward: 38, damageToCastle: 3, meleeDps: 26,
    armor: 8,
  },
  // Question : l'encaissement pur, au sommet du deuxième acte. Réponse : les tours à zone, encore et toujours.
  corrupted_hermit: {
    id: "corrupted_hermit", name: "Ermite Corrompu",
    lore: "Il a prié dans cette vallée jusqu'à ce que la vallée réponde.\nCe qui reste de lui ne prie plus, mais encaisse toujours.",
    hp: 340, speed: 22, flying: false, goldReward: 44, damageToCastle: 4, meleeDps: 16,
    armor: 5,
  },
  // Question : la saturation, en plus rapide et plus nombreux que le Lutin. Réponse : dégâts de zone, à jour.
  scarlet_prickler: {
    id: "scarlet_prickler", name: "Piqueur Écarlate",
    lore: "Un seul dard écarlate ne vaut rien. La nuée entière, en une saison.\nOn ne les compte plus, on compte ce qu'ils coûtent.",
    hp: 55, speed: 105, flying: false, goldReward: 12, damageToCastle: 1, meleeDps: 8,
  },
  // Question : l'encaissement lourd ET l'immunité au ralentissement. Réponse : la puissance brute, le givre ne suffit plus.
  howling_bones: {
    id: "howling_bones", name: "Ossements Hurlants",
    lore: "Ce qui reste d'une armée que personne n'a enterrée.\nLe froid n'a plus rien à mordre — il n'y a plus de chair.",
    hp: 380, speed: 35, flying: false, goldReward: 48, damageToCastle: 4, meleeDps: 24,
    slowImmune: true,
  },
  // Question : le volume mono-cible, en plus rapide qu'un Maraudeur. Réponse : rien de neuf, la cadence suffit.
  frontier_raider: {
    id: "frontier_raider", name: "Pillard des Frontières",
    lore: "Le premier à porter un visage d'homme depuis le Roi-Charogne.\nIl ne sert ni les failles ni les tombes — seulement lui-même.",
    hp: 220, speed: 60, flying: false, goldReward: 36, damageToCastle: 3, meleeDps: 28,
  },
  // Question : le mono-cible à distance de sécurité (l'arme a une portée visuelle
  // longue), mais mécaniquement une mêlée standard — pas de nouvelle mécanique de
  // tir à distance ennemi dans cette itération. Réponse : rien de neuf.
  // Sprite reconverti en armes "fuites des Failles" plutôt qu'arme moderne, pour
  // rester cohérent avec le lore (ADR-049) sans réintroduire un motif sci-fi
  // écarté par le tri d'origine (ADR-043/044).
  rift_marauder: {
    id: "rift_marauder", name: "Maraudeur des Failles",
    lore: "L'arme qu'il porte n'a pas été forgée dans ce monde.\nElle est tombée d'une Faille, et lui avec.",
    hp: 160, speed: 58, flying: false, goldReward: 26, damageToCastle: 2, meleeDps: 24,
  },
  // Question : l'élite rapide à haut DPS, faible en PV. Réponse : la focalisation avant qu'il n'atteigne le Bastion.
  veiled_assassin: {
    id: "veiled_assassin", name: "Assassin Voilé",
    lore: "Il ne charge jamais deux fois la même route.\nCe qui le touche une fois le tue ; ce qui le rate une fois ne le revoit pas.",
    hp: 180, speed: 90, flying: false, goldReward: 50, damageToCastle: 3, meleeDps: 42,
  },

  // ---- Boss dédié du ch.20 (ADR-050) — jamais en vague normale, comme Chef de
  // guerre/Vouivre pour le premier acte. Image générée par le joueur : une
  // ooze couronnée de cristaux, pas un mort-vivant — nom et lore suivent
  // l'image plutôt que le nom réservé par erreur ("Le Fossoyeur", pensé pour
  // un sprite qui n'a finalement jamais existé).
  the_gravedigger: {
    id: "the_gravedigger", name: "Le Roi Fangeux",
    lore: "Ce qui reste du dernier trésor du Bastion a fondu en lui, cristal après cristal.\nIl ne porte pas sa couronne : elle a poussé à travers sa peau.",
    hp: 950, speed: 28, flying: false, goldReward: 230, damageToCastle: 12, meleeDps: 50,
    armor: 6,
  },
};
