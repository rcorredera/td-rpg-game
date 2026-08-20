// ============================================================
// content/index.ts — Assemblage du ContentPack et valeurs d'équilibrage
// transverses (ADR-003).
//
// Aucune stat en dur dans core/ ou render/. Modifier ici = rééquilibrer.
// Depuis ADR-057 les gros catalogues vivent à côté : `towers.ts`, `enemies.ts`,
// `maps.ts` (géométrie des ch.2-20) et `waves.ts` (génération). Ce fichier garde
// ce qui n'appartient à aucun d'eux : chapitres, héros, économie, déblocages,
// récompenses, notation.
//
// Coordonnées logiques : 960x540, 16:9 (ADR-027 — le rendu scale). Convention de
// bord : entrées à x/y≈-20, sorties côté château à x≈980 / y≈560.
// ============================================================

import type { ContentPack, UnlockDef } from "../core/types";
import { ENEMIES } from "./enemies";
import { TOWERS } from "./towers";
import { makeChapter } from "./waves";
import {
  CH2_MAP, CH3_MAP, CH4_MAP, CH5_MAP, CH6_MAP, CH7_MAP, CH8_MAP, CH9_MAP, CH10_MAP,
  CH11_MAP, CH12_MAP, CH13_MAP, CH14_MAP, CH15_MAP, CH16_MAP, CH17_MAP, CH18_MAP,
  CH19_MAP, CH20_MAP,
} from "./maps";
export type { UnlockDef };

export const CONTENT: ContentPack = {
  // hpExponent : PV vague n = base × 1.15^n. castleDamageExponent : un mini-boss ×4 PV
  // inflige ×2 dégâts au château (racine carrée) — GDD §Économie.
  scaling: { hpExponent: 1.12, castleDamageExponent: 0.5 },


  towers: TOWERS,

  enemies: ENEMIES,

  // Mode Histoire (ADR-004) : 20 chapitres en deux actes (ADR-049/051), tous jouables.
  // Le ch.1 est écrit à la main, les ch.2-20 ont un contenu GÉNÉRÉ (makeWaves/makeChapter).
  // Noms et lore = placeholders en attente du fichier de contexte (docs/LORE.md).
  chapters: [
    {
      id: "ch1", name: "La Route du Bastion", biome: "meadow", playable: true,
      lore: "Les éclaireurs gobelins sondent vos défenses.\nRepoussez les dix premières vagues du Roi-Charogne.",
      map: {
        castleHp: 20,
        // Chemin en S, entrée à gauche, château à droite. Tous les chemins finissent au château.
        paths: [
          {
            waypoints: [
              { x: -20, y: 135 }, { x: 300, y: 135 }, { x: 300, y: 288 },
              { x: 660, y: 288 }, { x: 660, y: 400 }, { x: 980, y: 400 },
            ],
          },
        ],
        slots: [
          { x: 180, y: 212 }, { x: 396, y: 207 }, { x: 204, y: 360 },
          { x: 480, y: 360 }, { x: 564, y: 216 }, { x: 756, y: 335 },
        ],
      },
      // 10 vagues. Mini-boss vagues 5 et 10 (GDD).
      waves: [
        // Les quatre premières vagues restent aérées : le chapitre 1 est la seule
        // école du joueur, et il n'y a pas encore la Tour de givre pour l'aider.
        { spawns: [{ enemyId: "goblin", count: 6, intervalS: 1.1, delayS: 1 }] },
        { spawns: [{ enemyId: "goblin", count: 8, intervalS: 0.95, delayS: 1 }, { enemyId: "orc", count: 2, intervalS: 2.5, delayS: 4 }] },
        { spawns: [{ enemyId: "orc", count: 5, intervalS: 1.7, delayS: 1 }, { enemyId: "bat", count: 4, intervalS: 0.9, delayS: 6 }] },
        { spawns: [{ enemyId: "goblin", count: 9, intervalS: 0.7, delayS: 1 }, { enemyId: "bat", count: 4, intervalS: 0.9, delayS: 5 }] },
        { spawns: [{ enemyId: "orc", count: 6, intervalS: 1.05, delayS: 1 }], miniBoss: { enemyId: "brute", hpMult: 2.5 } },
        { spawns: [{ enemyId: "goblin", count: 12, intervalS: 0.5, delayS: 1 }, { enemyId: "orc", count: 4, intervalS: 1.4, delayS: 6 }] },
        { spawns: [{ enemyId: "bat", count: 10, intervalS: 0.55, delayS: 1 }, { enemyId: "orc", count: 4, intervalS: 1.4, delayS: 4 }] },
        { spawns: [{ enemyId: "brute", count: 3, intervalS: 3.5, delayS: 1 }, { enemyId: "goblin", count: 10, intervalS: 0.55, delayS: 3 }] },
        { spawns: [{ enemyId: "orc", count: 8, intervalS: 0.85, delayS: 1 }, { enemyId: "bat", count: 8, intervalS: 0.65, delayS: 5 }] },
        { spawns: [{ enemyId: "goblin", count: 14, intervalS: 0.4, delayS: 1 }, { enemyId: "brute", count: 2, intervalS: 4.0, delayS: 4 }], miniBoss: { enemyId: "brute", hpMult: 2.6 } },
      ],
    },
    // Ch.2-10 : contenu généré provisoire, noms placeholders (à remplacer via docs/LORE.md).
    // Déblocage séquentiel : conquérir le chapitre précédent (géré côté UI/profil).
    makeChapter(2, "Les Faubourgs en cendres", "ash", "Les survivants affluent. Les hordes aussi.", CH2_MAP),
    makeChapter(3, "Le Gué des Orcs", "marsh", "Deux routes mènent au Bastion. Les orcs le savent.", CH3_MAP),
    makeChapter(4, "La Forêt Murmurante", "forest", "Quelque chose déchire le voile entre les mondes.", CH4_MAP),
    makeChapter(5, "Les Carrières", "quarry", "La pierre du Bastion vient d'ici. Elle est rouge, désormais.", CH5_MAP),
    makeChapter(6, "Le Col du Gel", "frost", "Le froid ne les arrête pas. Rien ne les arrête.", CH6_MAP),
    makeChapter(7, "Les Tertres", "barrow", "Les morts d'hier grossissent les rangs d'aujourd'hui.", CH7_MAP),
    makeChapter(8, "La Herse Brisée", "ruins", "La première muraille est tombée. Reste la vôtre.", CH8_MAP),
    makeChapter(9, "Les Portes du Nord", "tundra", "Au-delà : son royaume. Il vous attend.", CH9_MAP),
    // Ch.10 : boss INTERMÉDIAIRE depuis ADR-049/050 (l'Histoire continue au ch.20).
    makeChapter(10, "Le Roi-Charogne", "blight", "Le maître des hordes en personne — mais pas la fin.", CH10_MAP),
    // Ch.11-20 : deuxième acte (ADR-049/050). Même convention que ch.2-10 : contenu
    // généré provisoire, noms placeholders (à remplacer via docs/LORE.md).
    makeChapter(11, "Marais Fangeux", "marsh", "Ce qui a fondu dans la Faille remonte à la surface.", CH11_MAP),
    makeChapter(12, "Ombres du Cloître", "ruins", "Le silence, ici, n'a jamais été un signe de paix.", CH12_MAP),
    makeChapter(13, "Passe des Lances", "barrow", "Quatre yeux montent la garde depuis des siècles.", CH13_MAP),
    makeChapter(14, "Sanctuaire Corrompu", "blight", "Ce qui priait ici prie encore, autrement.", CH14_MAP),
    makeChapter(15, "Écarlate", "ash", "La nuée ne se compte plus. Elle se combat.", CH15_MAP),
    makeChapter(16, "Charnier Gelé", "frost", "Le froid n'a plus rien à mordre — il n'y a plus de chair.", CH16_MAP),
    makeChapter(17, "Frontières Rompues", "quarry", "Les premiers visages humains depuis le Roi-Charogne.", CH17_MAP),
    makeChapter(18, "Cicatrice des Failles", "tundra", "La Faille n'a jamais vraiment refermé.", CH18_MAP),
    makeChapter(19, "Voile Nocturne", "forest", "Il ne charge jamais deux fois la même route.", CH19_MAP),
    // Final : le vrai boss de fin (ADR-049/050). Mini-boss x1 en 12e vague, sans
    // multiplicateur de difficulté supplémentaire par chapitre — il n'est utilisé
    // qu'ici (`the_gravedigger`, jamais en trash).
    makeChapter(20, "Trône Fangeux", "blight", "Le Roi Fangeux vous attend. Il n'attendra pas longtemps.", CH20_MAP),
  ],

  hero: {
    name: "Chevalier",
    hp: 220, speed: 110, meleeDps: 30, meleeRange: 42, respawnS: 8,
    // Sorts à 3 niveaux, upgrades payés en Sceaux (GDD §Méta).
    skills: {
      // 4 niveaux par sort, et non 3 : à 24 Sceaux au total le puits se vidait en
      // 2 runs alors qu'un run en rapporte 2 à 4 (mesuré au banc). 56 Sceaux tient
      // désormais une douzaine de parties (ADR-021).
      whirlwind: {
        levels: [
          { damage: 45, radius: 70, cooldownS: 9 },
          { damage: 70, radius: 80, cooldownS: 8 },
          { damage: 100, radius: 90, cooldownS: 7 },
          { damage: 145, radius: 100, cooldownS: 6 },
        ],
        upgradeCosts: [4, 8, 16],
      },
      rally: {
        levels: [
          { fireRateMult: 1.6, radius: 150, durationS: 5, cooldownS: 18 },
          { fireRateMult: 1.8, radius: 160, durationS: 6, cooldownS: 16 },
          { fireRateMult: 2.0, radius: 175, durationS: 7, cooldownS: 14 },
          { fireRateMult: 2.3, radius: 190, durationS: 8, cooldownS: 12 },
        ],
        upgradeCosts: [4, 8, 16],
      },
    },
  },

  // Forge (méta, Éclats) : +10% de dégâts par niveau, 4 niveaux par tour
  // (puits d'Éclats long terme — coûts agressifs assumés).
  // Forge : 6 rangs par tour au lieu de 4, coûts en escalier (2 325 Éclats au total
  // contre 825). C'est le puits long terme des Éclats, et surtout la condition du
  // dernier chapitre : sans elle le boss final n'est pas abattable (ADR-024).
  forge: { damageMultPerLevel: 0.10, upgradeCosts: [20, 45, 80, 130, 200, 300] },

  // Économie in-run (ADR-052). L'or d'un chapitre est BUDGÉTÉ et non émergent : au
  // per-kill pur, le ch.20 versait 9 001 pièces pour 6 emplacements — soit 2,8 fois
  // le plafond de dépense (537 pièces la tour rang 3 + spécialisation). Passé le
  // ch.12, l'or cessait d'être une contrainte, tout était maxé dès la vague 6, et la
  // forge ne décidait plus rien. Les budgets ci-dessous valent
  // « emplacements x 537 x ratio », ratio montant de 0,50 (ch.1) à 0,84 (ch.19) : l'or
  // seul ne finance JAMAIS une défense complète, l'écart se comble à la forge.
  // Les chapitres à boss dédié (10 et 20) reçoivent la part pleine (1,05) : 12 vagues
  // sur MOINS d'emplacements, le ratio par slot les affamait — mesuré, le ch.10 y
  // devenait invincible même forge 6.
  economy: {
    sellRefundRate: 0.65, // GDD : 60-70%, à affiner au playtest
    startingGold: 160,
    // 25 % aux kills : assez pour garder le retour « j'ai tué, j'ai été payé » sur
    // chaque créature, trop peu pour qu'une vague plus fournie enrichisse le joueur.
    killGoldShare: 0.25,
    chapterBudget: [
      1610, 2220, 2300, 2380, 2460, 2530, 2610, 2690, 2760, 3940,
      2920, 3000, 3070, 3150, 3230, 3310, 3380, 3460, 3540, 3380,
    ],
    // Hors table (Failles infinies, chapitres à venir) : la médiane du premier acte.
    defaultChapterBudget: 2500,
  },

  // Armurerie. Six paliers échelonnés plutôt que trois : à 120 Éclats au total, le
  // catalogue se vidait en 2 runs alors que le jeu compte 10 chapitres (ADR-021).
  // Chaque entrée porte son effet — la simulation les applique sans les connaître.
  // La méta vend des PALIERS DE PUISSANCE, plus des tours entières. Verrouiller la
  // Tour de givre rendait le chapitre 1 très rude tant qu'on ne l'avait pas achetée —
  // et un joueur bloqué ne peut pas gagner de quoi se débloquer. Les trois tours sont
  // donc disponibles d'emblée, et c'est leur PLAFOND DE NIVEAU qui progresse : rang 2
  // d'entrée, rang 3 puis spécialisations à l'armurerie (ADR-024).
  unlocks: [
    { id: "castle_hp_1", name: "Remparts renforcés", desc: "+10 PV de château à chaque partie.", cost: 40, castleHp: 10 },
    { id: "tower_specs", name: "Doctrines de siège", desc: "Débloque les spécialisations de rang 4.", cost: 60, allowSpecialize: true },
    { id: "spell_arrow_rain", name: "Pluie de flèches", desc: "Sort de compte utilisable en partie (longue recharge).", cost: 55, accountSpell: true },
    { id: "war_chest", name: "Coffre de guerre", desc: "+70 pièces d'or au début de chaque bataille.", cost: 75, startingGold: 70 },
    { id: "hero_respawn_1", name: "Serment du Chevalier", desc: "Le héros revient au combat 3 s plus tôt.", cost: 90, heroRespawnS: 3 },
    { id: "castle_hp_2", name: "Donjon de pierre", desc: "+15 PV de château supplémentaires.", cost: 130, castleHp: 15 },
  ],

  // Barème de fin de run. Ces valeurs vivaient en dur dans `computeResult` : hors
  // de portée d'ADR-003, elles n'ont jamais été rééquilibrées avec le reste, d'où
  // une méta saturée en 2 runs (mesurable via `npm run balance`).
  rewards: {
    shardsPerWave: 5,
    shardsCastleBonus: 20,
    shardsVictoryBonus: 25,
    shardsFloor: 3,
    // Un chapitre tardif doit payer nettement plus qu'un rejeu du premier, sinon
    // farmer la carte la plus facile est strictement optimal (mesuré : ×1,11 seulement
    // entre le ch.1 et le ch.10 à l'origine). Progression douce mais nette, ×1 → ×3
    // sur le premier acte (ch.1-10) — étendue au même pas (+0,22/chapitre) sur le
    // deuxième acte (ch.11-20, ADR-049/050) pour atteindre ×5,2 au vrai boss final.
    // Sans cette extension, ch.20 retombait au multiplicateur par défaut ×1 (index
    // hors tableau) et le ratio dernier/premier repassait sous ×1,2 — repéré par
    // `economy.test.ts`.
    shardsChapterMult: [
      1, 1.22, 1.44, 1.66, 1.88, 2.1, 2.32, 2.54, 2.76, 3,
      3.22, 3.44, 3.66, 3.88, 4.1, 4.32, 4.54, 4.76, 4.98, 5.2,
    ],
    // Éclats par étoile (ADR-052), multiplicateur de chapitre compris : 3 étoiles au
    // ch.20 valent 3 x 12 x 5,2 = 187 Éclats, soit deux rangs de forge. C'est le pont
    // entre « maîtriser un chapitre » et « des tours plus fortes » — sans lui, le
    // sans-faute ne rapportait qu'un bonus de PV de château presque identique à une
    // victoire arrachée.
    shardsPerStar: 12,
    heroBlockSecondsPerSceau: 9,
    sceauxVictoryBonus: 2,
    sceauxPerHeroDeath: 1,
  },

  // Étoiles (GDD §Étoiles). "Beaucoup touché" = plus de 50 % des PV perdus. Les 3
  // étoiles demandent 90 % des PV conservés et non 100 % (ADR-052) : à l'exigence
  // stricte, une seule fuite sur dix vagues suffisait à les interdire — mesuré, les
  // ch.3, 13 et 19 étaient 3-étoiles-impossibles même forge 6, pendant que les
  // ch.14 à 18 les donnaient à forge 0. Un seuil en fait un objectif que la méta
  // rapproche, ce que le tout-ou-rien ne pouvait pas faire.
  rating: { heavyDamagePct: 0.5, perfectHpPct: 0.9 },

  accountSpell: { damage: 60, radius: 90, cooldownS: 25 },
};

// ---------- Unlocks méta (écran compte) ----------
// Vit désormais DANS le ContentPack (`CONTENT.unlocks`) : chaque déblocage porte ses
// effets, que `createRun` applique sans les connaître. Le catalogue passe de 3 à 6
// entrées et de 120 à 420 Éclats — à 120, il se vidait en 2 runs pour 10 chapitres
// (ADR-021). Réexporté ici : c'est le nom sous lequel l'UI et la méta le lisent.
export const UNLOCKS: UnlockDef[] = CONTENT.unlocks;
