// ============================================================
// content/index.ts — TOUTES les valeurs d'équilibrage (ADR-003).
// Aucune stat en dur dans core/ ou render/. Modifier ici = rééquilibrer.
// Coordonnées logiques : 800x600 (le rendu scale).
// ============================================================

import type { ChapterDef, ContentPack, MapDef, WaveDef, WaveSpawn } from "../core/types";

// ---------- Cartes des chapitres 2+ (placeholders en attente du lore) ----------

// Layout "Faille" : chemin principal depuis la gauche + portail depuis le haut
// qui rejoint la route principale (convention : tous les chemins finissent au château).
const LAYOUT_RIFT: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 120 }, { x: 560, y: 120 }, { x: 560, y: 300 }, { x: 180, y: 300 }, { x: 180, y: 460 }, { x: 820, y: 460 }] },
    { waypoints: [{ x: 400, y: -20 }, { x: 400, y: 300 }, { x: 180, y: 300 }, { x: 180, y: 460 }, { x: 820, y: 460 }], portal: true },
  ],
  slots: [
    { x: 250, y: 210 }, { x: 480, y: 210 }, { x: 660, y: 200 },
    { x: 300, y: 380 }, { x: 550, y: 380 }, { x: 80, y: 380 },
  ],
};

// Layout "Tenailles" : deux sources d'arrivée permanentes (gauche + bas-gauche).
const LAYOUT_PINCER: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 300 }, { x: 250, y: 300 }, { x: 250, y: 140 }, { x: 550, y: 140 }, { x: 550, y: 420 }, { x: 820, y: 420 }] },
    { waypoints: [{ x: -20, y: 520 }, { x: 550, y: 520 }, { x: 550, y: 420 }, { x: 820, y: 420 }] },
  ],
  slots: [
    { x: 150, y: 220 }, { x: 380, y: 230 }, { x: 450, y: 300 },
    { x: 660, y: 320 }, { x: 320, y: 420 }, { x: 130, y: 410 },
  ],
};

/**
 * Vagues générées (placeholder ch.2-10) : volume croissant avec la difficulté `d`,
 * patterns cycliques, 2e source utilisée par intermittence à partir de la vague 4.
 * Déterministe (pas de RNG) : même content à chaque chargement.
 */
function makeWaves(d: number, secondPath: boolean): WaveDef[] {
  const waveCount = d >= 9 ? 12 : 10;
  const waves: WaveDef[] = [];
  for (let w = 0; w < waveCount; w++) {
    const k = 1 + d * 0.25 + w * 0.15; // facteur de volume
    const spawns: WaveSpawn[] = [];
    switch (w % 5) {
      case 0: spawns.push({ enemyId: "goblin", count: Math.round(6 * k), intervalS: 1.0, delayS: 1 }); break;
      case 1: spawns.push({ enemyId: "orc", count: Math.round(4 * k), intervalS: 1.8, delayS: 1 }, { enemyId: "goblin", count: Math.round(4 * k), intervalS: 0.9, delayS: 5 }); break;
      case 2: spawns.push({ enemyId: "bat", count: Math.round(5 * k), intervalS: 0.9, delayS: 1 }, { enemyId: "orc", count: Math.round(3 * k), intervalS: 2, delayS: 4 }); break;
      case 3: spawns.push({ enemyId: "brute", count: Math.max(1, Math.round(k)), intervalS: 5, delayS: 1 }, { enemyId: "goblin", count: Math.round(7 * k), intervalS: 0.7, delayS: 3 }); break;
      default: spawns.push({ enemyId: "orc", count: Math.round(5 * k), intervalS: 1.4, delayS: 1 }, { enemyId: "bat", count: Math.round(4 * k), intervalS: 1, delayS: 5 });
    }
    if (secondPath && w >= 3 && w % 2 === 1) {
      spawns.push({ enemyId: w % 4 === 1 ? "goblin" : "orc", count: Math.round(3 * k), intervalS: 1.2, delayS: 2, pathIndex: 1 });
    }
    const wave: WaveDef = { spawns };
    if (w === 4) wave.miniBoss = { enemyId: "brute", hpMult: 2.5 + 0.4 * d };
    // Dernière vague : gros mini-boss. Ch.10 : placeholder du Roi-Charogne
    // en attendant le vrai boss multi-phases (GDD §Boss final).
    if (w === waveCount - 1) wave.miniBoss = { enemyId: "brute", hpMult: d >= 9 ? 12 : 4 + 0.6 * d };
    waves.push(wave);
  }
  return waves;
}

/** Chapitres 2-10 : contenu généré provisoire. Noms/lore = placeholders (docs/LORE.md). */
function makeChapter(num: number, name: string, lore: string): ChapterDef {
  const map = num % 2 === 0 ? LAYOUT_RIFT : LAYOUT_PINCER;
  return { id: `ch${num}`, name, lore, playable: true, map, waves: makeWaves(num - 1, true) };
}

export const CONTENT: ContentPack = {
  // hpExponent : PV vague n = base × 1.15^n. castleDamageExponent : un mini-boss ×4 PV
  // inflige ×2 dégâts au château (racine carrée) — GDD §Économie.
  scaling: { hpExponent: 1.12, castleDamageExponent: 0.5 },

  towers: {
    tower_archer: {
      id: "tower_archer", name: "Archerie",
      lore: "L'épine du Bastion. Une flèche, une cible — y compris ce qui vole.\nPolyvalente et bon marché : le socle de toute défense.",
      costs: [70, 90, 130],
      levels: [
        { range: 130, damage: 12, fireRate: 1.4 },
        { range: 145, damage: 20, fireRate: 1.6 },
        { range: 160, damage: 32, fireRate: 1.8 },
      ],
      groundOnly: false, splashRadius: 0, requiresUnlock: null,
      // Niveau 4 : multi-cibles OU portée extrême (GDD §Spécialisations)
      specs: [
        {
          id: "spec_volley", name: "Salve", desc: "Tire sur 3 cibles à la fois",
          cost: 200, stats: { range: 175, damage: 40, fireRate: 1.8 }, multishot: 3,
        },
        {
          id: "spec_longbow", name: "Arc long", desc: "Portée immense, flèches lourdes",
          cost: 200, stats: { range: 290, damage: 70, fireRate: 1.5 },
        },
      ],
    },
    tower_catapult: {
      id: "tower_catapult", name: "Catapulte",
      lore: "Des rochers rendus à l'envoyeur, par-dessus les rangs.\nDévastatrice contre les groupes au sol — mais aveugle au ciel.",
      costs: [110, 140, 190],
      levels: [
        { range: 150, damage: 26, fireRate: 0.45 },
        { range: 160, damage: 42, fireRate: 0.5 },
        { range: 175, damage: 65, fireRate: 0.55 },
      ],
      groundOnly: true, splashRadius: 55, requiresUnlock: null,
      // Niveau 4 : frappe lourde lointaine OU zone incendiaire
      specs: [
        {
          id: "spec_trebuchet", name: "Trébuchet", desc: "Plus loin, plus fort, plus large",
          cost: 240, stats: { range: 245, damage: 140, fireRate: 0.4 }, splashRadius: 70,
        },
        {
          id: "spec_greekfire", name: "Feu grégeois", desc: "La zone brûle 3% PV max/s (4s)",
          cost: 240, stats: { range: 185, damage: 85, fireRate: 0.5 }, splashRadius: 80,
          burn: { pctMaxHpPerS: 0.03, durationS: 4 },
        },
      ],
    },
    tower_frost: {
      id: "tower_frost", name: "Tour de givre",
      lore: "Un éclat de faille scellé dans la pierre.\nNe tue presque rien, mais le froid gagne toutes les batailles.",
      costs: [80, 100, 140],
      levels: [
        { range: 120, damage: 5, fireRate: 1.0 },
        { range: 130, damage: 8, fireRate: 1.1 },
        { range: 140, damage: 12, fireRate: 1.2 },
      ],
      groundOnly: false, splashRadius: 0,
      slow: { factor: 0.55, duration: 1.6 },
      requiresUnlock: "tower_frost", // GDD : débloquée à la méta après ~2 runs
      // Niveau 4 : aura de zone OU givre qui brûle
      specs: [
        {
          id: "spec_blizzard", name: "Blizzard", desc: "Aura de givre continue, ne tire plus",
          cost: 220, stats: { range: 0, damage: 0, fireRate: 0 },
          aura: { radius: 170, slowFactor: 0.35 }, slow: null,
        },
        {
          id: "spec_frostfire", name: "Givre ardent", desc: "Gèle ET brûle 2.5% PV max/s (4s)",
          cost: 220, stats: { range: 155, damage: 20, fireRate: 1.2 },
          burn: { pctMaxHpPerS: 0.025, durationS: 4 },
        },
      ],
    },
  },

  // Lore du Bestiaire : provisoire, à harmoniser avec le fichier de lore (docs/LORE.md).
  enemies: {
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
  },

  // Mode Histoire (ADR-004) : 10 chapitres déclarés, seul le 1er a du contenu.
  // Noms et lore = placeholders en attente du fichier de contexte (docs/LORE.md).
  chapters: [
    {
      id: "ch1", name: "La Route du Bastion", playable: true,
      lore: "Les éclaireurs gobelins sondent vos défenses.\nRepoussez les dix premières vagues du Roi-Charogne.",
      map: {
        castleHp: 20,
        // Chemin en S, entrée à gauche, château à droite. Tous les chemins finissent au château.
        paths: [
          {
            waypoints: [
              { x: -20, y: 150 }, { x: 250, y: 150 }, { x: 250, y: 320 },
              { x: 550, y: 320 }, { x: 550, y: 470 }, { x: 820, y: 470 },
            ],
          },
        ],
        slots: [
          { x: 150, y: 235 }, { x: 330, y: 230 }, { x: 170, y: 400 },
          { x: 400, y: 400 }, { x: 470, y: 240 }, { x: 630, y: 390 },
        ],
      },
      // 10 vagues. Mini-boss vagues 5 et 10 (GDD).
      waves: [
        { spawns: [{ enemyId: "goblin", count: 6, intervalS: 1.2, delayS: 1 }] },
        { spawns: [{ enemyId: "goblin", count: 8, intervalS: 1.0, delayS: 1 }, { enemyId: "orc", count: 2, intervalS: 3, delayS: 4 }] },
        { spawns: [{ enemyId: "orc", count: 5, intervalS: 2.0, delayS: 1 }, { enemyId: "bat", count: 4, intervalS: 1.0, delayS: 6 }] },
        { spawns: [{ enemyId: "goblin", count: 10, intervalS: 0.8, delayS: 1 }, { enemyId: "bat", count: 5, intervalS: 1.0, delayS: 5 }] },
        { spawns: [{ enemyId: "orc", count: 6, intervalS: 1.5, delayS: 1 }], miniBoss: { enemyId: "brute", hpMult: 2.5 } },
        { spawns: [{ enemyId: "goblin", count: 12, intervalS: 0.7, delayS: 1 }, { enemyId: "orc", count: 4, intervalS: 2, delayS: 6 }] },
        { spawns: [{ enemyId: "bat", count: 10, intervalS: 0.8, delayS: 1 }, { enemyId: "orc", count: 4, intervalS: 2, delayS: 4 }] },
        { spawns: [{ enemyId: "brute", count: 3, intervalS: 5, delayS: 1 }, { enemyId: "goblin", count: 10, intervalS: 0.8, delayS: 3 }] },
        { spawns: [{ enemyId: "orc", count: 8, intervalS: 1.2, delayS: 1 }, { enemyId: "bat", count: 8, intervalS: 0.9, delayS: 5 }] },
        { spawns: [{ enemyId: "goblin", count: 14, intervalS: 0.6, delayS: 1 }, { enemyId: "brute", count: 2, intervalS: 6, delayS: 4 }], miniBoss: { enemyId: "brute", hpMult: 4 } },
      ],
    },
    // Ch.2-10 : contenu généré provisoire, noms placeholders (à remplacer via docs/LORE.md).
    // Déblocage séquentiel : conquérir le chapitre précédent (géré côté UI/profil).
    makeChapter(2, "Les Faubourgs en cendres", "Les survivants affluent. Les hordes aussi."),
    makeChapter(3, "Le Gué des Orcs", "Deux routes mènent au Bastion. Les orcs le savent."),
    makeChapter(4, "La Forêt Murmurante", "Quelque chose déchire le voile entre les mondes."),
    makeChapter(5, "Les Carrières", "La pierre du Bastion vient d'ici. Elle est rouge, désormais."),
    makeChapter(6, "Le Col du Gel", "Le froid ne les arrête pas. Rien ne les arrête."),
    makeChapter(7, "Les Tertres", "Les morts d'hier grossissent les rangs d'aujourd'hui."),
    makeChapter(8, "La Herse Brisée", "La première muraille est tombée. Reste la vôtre."),
    makeChapter(9, "Les Portes du Nord", "Au-delà : son royaume. Il vous attend."),
    // Final : boss multi-phases prévu (à chaque mort, il revient plus fort — GDD §Boss final).
    // En attendant : mini-boss x12 en 12e vague.
    makeChapter(10, "Le Roi-Charogne", "Le maître des hordes en personne."),
  ],

  hero: {
    name: "Chevalier",
    hp: 220, speed: 110, meleeDps: 30, meleeRange: 42, respawnS: 8,
    // Sorts à 3 niveaux, upgrades payés en Sceaux (GDD §Méta).
    skills: {
      whirlwind: {
        levels: [
          { damage: 45, radius: 70, cooldownS: 9 },
          { damage: 70, radius: 80, cooldownS: 8 },
          { damage: 100, radius: 90, cooldownS: 7 },
        ],
        upgradeCosts: [4, 8],
      },
      rally: {
        levels: [
          { fireRateMult: 1.6, radius: 150, durationS: 5, cooldownS: 18 },
          { fireRateMult: 1.8, radius: 160, durationS: 6, cooldownS: 16 },
          { fireRateMult: 2.0, radius: 175, durationS: 7, cooldownS: 14 },
        ],
        upgradeCosts: [4, 8],
      },
    },
  },

  // Forge (méta, Éclats) : +10% de dégâts par niveau, 4 niveaux par tour
  // (puits d'Éclats long terme — coûts agressifs assumés).
  forge: { damageMultPerLevel: 0.10, upgradeCosts: [20, 45, 80, 130] },

  // Vente de tour : 65% de l'investissement remboursé (GDD : 60-70%, à affiner au playtest).
  economy: { sellRefundRate: 0.65, startingGold: 160 },

  // Étoiles : "château beaucoup touché" = plus de 50% des PV perdus (GDD §Étoiles).
  rating: { heavyDamagePct: 0.5 },

  accountSpell: { damage: 60, radius: 90, cooldownS: 25 },
};

// ---------- Unlocks méta (écran compte) ----------

export interface UnlockDef { id: string; name: string; desc: string; cost: number }

export const UNLOCKS: UnlockDef[] = [
  { id: "tower_frost", name: "Tour de givre", desc: "Ralentit les ennemis. Le 3e pilier de votre défense.", cost: 30 },
  { id: "spell_arrow_rain", name: "Pluie de flèches", desc: "Sort de compte utilisable en partie (gros recharge).", cost: 50 },
  { id: "castle_hp_1", name: "Remparts renforcés", desc: "+10 PV de château au départ de chaque partie.", cost: 40 },
];
