// ============================================================
// content/index.ts — TOUTES les valeurs d'équilibrage (ADR-003).
// Aucune stat en dur dans core/ ou render/. Modifier ici = rééquilibrer.
// Coordonnées logiques : 800x600 (le rendu scale).
// ============================================================

import type { ChapterDef, ContentPack, MapDef, UnlockDef, WaveDef, WaveSpawn } from "../core/types";
export type { UnlockDef };

// ---------- Cartes des chapitres 2+ (placeholders en attente du lore) ----------

// Layout "Faille" : montée depuis le bas-gauche, traversée, descente vers le
// château + portail plongeant du haut sur la traversée.
// Le tracé précédent partait à droite jusqu'à x=560 puis REVENAIT à x=180 : un
// demi-tour complet, illisible sur une carte de 800 de large.
const LAYOUT_RIFT: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 470 }, { x: 220, y: 470 }, { x: 220, y: 180 }, { x: 520, y: 180 }, { x: 520, y: 400 }, { x: 820, y: 400 }] },
    // Raccourci assumé (~29 %) : c'est l'intérêt d'une Faille, elle saute la montée.
    { waypoints: [{ x: 280, y: -20 }, { x: 280, y: 180 }, { x: 520, y: 180 }, { x: 520, y: 400 }, { x: 820, y: 400 }], portal: true },
  ],
  // 8 emplacements, contre 6 au chapitre 1. La difficulté monte de chapitre en
  // chapitre mais la défense était plafonnée à 6 partout : passé la mi-partie l'or
  // s'accumulait sans emploi (1 800 à 3 800 pièces mesurées) et il n'y avait plus
  // aucune décision économique à prendre (ADR-020).
  slots: [
    { x: 120, y: 330 }, { x: 330, y: 290 }, { x: 390, y: 90 }, { x: 90, y: 400 },
    { x: 620, y: 270 }, { x: 400, y: 400 }, { x: 700, y: 290 }, { x: 560, y: 480 },
  ],
};

// Layout "Tenailles" : deux arrivées permanentes (haut-gauche et bas-gauche) qui
// CONVERGENT à mi-carte avant le château.
// Le tracé précédent avait une seconde voie 27 % plus courte que la première et
// couverte par 3 emplacements sur 6 : les ennemis y arrivaient plus vite sur la
// portion la moins défendable, d'où une fuite systématique dès la vague 4. Les
// deux voies font désormais la même longueur et partagent un tronc commun, ce qui
// rend les emplacements centraux utiles contre les deux.
const LAYOUT_PINCER: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 150 }, { x: 300, y: 150 }, { x: 300, y: 300 }, { x: 560, y: 300 }, { x: 560, y: 430 }, { x: 820, y: 430 }] },
    { waypoints: [{ x: -20, y: 470 }, { x: 300, y: 470 }, { x: 300, y: 300 }, { x: 560, y: 300 }, { x: 560, y: 430 }, { x: 820, y: 430 }] },
  ],
  // 8 emplacements, même raison que « Faille » : deux d'entre eux ne couvrent qu'une
  // seule branche, ce qui donne un vrai choix d'implantation selon la voie à tenir.
  slots: [
    { x: 200, y: 310 }, { x: 390, y: 210 }, { x: 390, y: 400 }, { x: 180, y: 220 },
    { x: 620, y: 300 }, { x: 480, y: 480 }, { x: 700, y: 320 }, { x: 180, y: 390 },
  ],
};

/**
 * Créature introduite à chaque chapitre — une de plus par niveau, puis des mélanges
 * (ADR-022). Chacune neutralise une tour et en valorise une autre : le joueur ne
 * subit pas un nouveau monstre, il doit revoir sa composition.
 */
const NEWCOMER: Record<number, string> = {
  2: "rat",       // saturation → dégâts de zone
  3: "wraith",    // insensible au froid → puissance brute
  4: "gargoyle",  // volant lourd → anti-aérien investi
  5: "golem",     // cuirassé → gros coups ou brûlure
};

/** Effectif de la vague de présentation, par créature : une nuée se découvre en
 *  nombre, un cuirassé à l'unité. Calibré au banc — la première version noyait le
 *  joueur sous neuf gargouilles et faisait tomber le chapitre 4 en une vague. */
const FRESH_COUNT: Record<string, number> = { rat: 8, wraith: 3, gargoyle: 1.6, golem: 1.2 };

/** Créatures disponibles à un chapitre donné : le socle plus tout ce qui précède. */
function rosterFor(num: number): string[] {
  const base = ["goblin", "orc", "bat", "brute"];
  const unlocked = Object.entries(NEWCOMER)
    .filter(([at]) => num >= Number(at))
    .map(([, id]) => id);
  return [...base, ...unlocked];
}

/**
 * Vagues générées (ch.2-10) : volume croissant avec la difficulté, patterns
 * cycliques, 2e source par intermittence à partir de la vague 4. La vague 2 de
 * chaque chapitre met en vedette la créature qui y apparaît, seule et en nombre :
 * découvrir une mécanique au milieu d'un mélange ne l'enseigne pas.
 * Déterministe (pas de RNG) : même content à chaque chargement.
 */
function makeWaves(num: number, secondPath: boolean): WaveDef[] {
  const d = num - 1;
  const waveCount = d >= 9 ? 12 : 10;
  const roster = rosterFor(num);
  const fresh = NEWCOMER[num];
  const has = (id: string) => roster.includes(id);
  const waves: WaveDef[] = [];
  for (let w = 0; w < waveCount; w++) {
    // Facteur de volume. Abaissé avec la densification (ADR-020) : des vagues plus
    // SERRÉES à effectif égal pèsent bien plus lourd — c'est le resserrement, pas le
    // nombre, qui donne son rôle aux tours à zone.
    const k = 1 + d * 0.2 + w * 0.12;
    const spawns: WaveSpawn[] = [];
    switch (w % 5) {
      case 0:
        // Ouverture : TOUJOURS la piétaille de base. C'est la vague où le joueur
        // pose ses premières tours avec 160 pièces — y mettre une nouveauté la lui
        // ferait subir sans moyen d'y répondre.
        spawns.push({ enemyId: "goblin", count: Math.round(6 * k), intervalS: 0.7, delayS: 1 });
        break;
      case 1:
        // Montée en puissance : le joueur pose sa deuxième vague de tours.
        spawns.push({ enemyId: "orc", count: Math.round(4 * k), intervalS: 1.25, delayS: 1 },
                    { enemyId: "goblin", count: Math.round(4 * k), intervalS: 0.65, delayS: 5 });
        break;
      case 2:
        // Vague de PRÉSENTATION : la nouveauté du chapitre, seule et lisible.
        // Placée en 3e position et non en 2e — mesuré, le joueur n'avait alors que
        // deux tours et perdait la moitié de son château sans avoir eu les moyens
        // de répondre. Une mécanique ne s'enseigne pas quand elle est imparable.
        if (fresh) spawns.push({ enemyId: fresh, count: Math.max(1, Math.round(FRESH_COUNT[fresh]! * k)), intervalS: fresh === "rat" ? 0.3 : 1.6, delayS: 1 });
        else {
          spawns.push({ enemyId: "bat", count: Math.round(5 * k), intervalS: 0.65, delayS: 1 },
                      { enemyId: "orc", count: Math.round(3 * k), intervalS: 1.4, delayS: 4 });
        }
        break;
      case 3:
        // Front lourd : ce qui encaisse devant, ce qui sature derrière.
        spawns.push(has("golem")
          ? { enemyId: "golem", count: Math.max(1, Math.round(0.45 * k)), intervalS: 6, delayS: 1 }
          : { enemyId: "brute", count: Math.max(1, Math.round(k)), intervalS: 3.5, delayS: 1 });
        spawns.push(has("rat")
          ? { enemyId: "rat", count: Math.round(6 * k), intervalS: 0.32, delayS: 3 }
          : { enemyId: "goblin", count: Math.round(7 * k), intervalS: 0.5, delayS: 3 });
        break;
      default:
        // Mélange complet : le ciel s'alourdit, et le contrôle ne suffit plus
        // quand des spectres l'ignorent. C'est ici que les créatures se combinent.
        spawns.push({ enemyId: "orc", count: Math.round(5 * k), intervalS: 1.0, delayS: 1 },
                    { enemyId: "bat", count: Math.round(4 * k), intervalS: 0.7, delayS: 5 });
        if (has("gargoyle")) spawns.push({ enemyId: "gargoyle", count: Math.max(1, Math.round(0.7 * k)), intervalS: 3.5, delayS: 6 });
        if (has("wraith")) spawns.push({ enemyId: "wraith", count: Math.max(1, Math.round(1.4 * k)), intervalS: 1.1, delayS: 3 });
    }
    if (secondPath && w >= 3 && w % 2 === 1) {
      spawns.push({ enemyId: w % 4 === 1 ? "goblin" : "orc", count: Math.round(3 * k), intervalS: 0.85, delayS: 2, pathIndex: 1 });
    }
    const wave: WaveDef = { spawns };
    // Boss de mi-parcours (vague 5) : le Chef de guerre dès qu'il entre en scène,
    // la Brute renforcée avant. Multiplicateurs volontairement bas (ADR-020) : un
    // boss est une cible ISOLÉE, les tours à zone n'y peuvent rien.
    if (w === 4) {
      wave.miniBoss = has("golem")
        ? { enemyId: "warlord", hpMult: 1 + 0.07 * d }
        : { enemyId: "brute", hpMult: 2 + 0.25 * d };
    }
    // Boss final. Le ch.10 dresse la Vouivre — un boss VOLANT, qui invalide d'un
    // coup toute défense bâtie sur les catapultes (GDD §Boss final).
    if (w === waveCount - 1) {
      wave.miniBoss = d >= 9
        ? { enemyId: "wyvern", hpMult: 2.4 }
        : has("golem")
          ? { enemyId: "warlord", hpMult: 1.5 + 0.12 * d }
          : { enemyId: "brute", hpMult: 3 + 0.35 * d };
    }
    waves.push(wave);
  }
  return waves;
}

/** Chapitres 2-10 : contenu généré provisoire. Noms/lore = placeholders (docs/LORE.md). */
function makeChapter(num: number, name: string, biome: string, lore: string): ChapterDef {
  const map = num % 2 === 0 ? LAYOUT_RIFT : LAYOUT_PINCER;
  return { id: `ch${num}`, name, lore, biome, playable: true, map, waves: makeWaves(num, true) };
}

export const CONTENT: ContentPack = {
  // hpExponent : PV vague n = base × 1.15^n. castleDamageExponent : un mini-boss ×4 PV
  // inflige ×2 dégâts au château (racine carrée) — GDD §Économie.
  scaling: { hpExponent: 1.12, castleDamageExponent: 0.5 },

  towers: {
    tower_archer: {
      id: "tower_archer", name: "Archerie",
      lore: "L'épine du Bastion. Une flèche, une cible — y compris ce qui vole.\nPolyvalente et bon marché : le socle de toute défense.",
      // Socle POLYVALENT : elle touche tout, donc elle paie sa polyvalence en
      // rendement. Quand elle était la meilleure en dégâts par pièce d'or ET la
      // seule anti-aérienne, il n'y avait aucune raison de construire autre chose
      // (mesuré : archerie seule 9 victoires sur 10, mélange 1 — ADR-020).
      costs: [70, 90, 130],
      levels: [
        { range: 130, damage: 11, fireRate: 1.4 },
        { range: 145, damage: 18, fireRate: 1.5 },
        { range: 160, damage: 28, fireRate: 1.7 },
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
      // Reine des GROUPES : lente et médiocre sur une cible isolée, dévastatrice
      // dès qu'il y a du monde. Son rayon décide de tout — à 55 il ne couvrait que
      // l'espacement d'un seul ennemi (~75 px entre deux spawns), donc elle payait
      // son coût de tour à zone en ne touchant qu'une cible (ADR-020).
      costs: [100, 120, 160],
      levels: [
        { range: 150, damage: 28, fireRate: 0.5 },
        { range: 165, damage: 45, fireRate: 0.55 },
        { range: 180, damage: 70, fireRate: 0.6 },
      ],
      groundOnly: true, splashRadius: 85, requiresUnlock: null,
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
      // MULTIPLICATEUR : elle ne tue presque rien, elle allonge le temps que les
      // autres ont pour tuer. Son ralentissement ne valait rien tant qu'il visait
      // UNE cible à la fois — sur une vague de 50 ennemis, en freiner un seul ne
      // change aucune issue. Il s'applique désormais en zone (ADR-020).
      costs: [70, 90, 120],
      levels: [
        { range: 125, damage: 5, fireRate: 1.0 },
        { range: 135, damage: 8, fireRate: 1.1 },
        { range: 145, damage: 12, fireRate: 1.2 },
      ],
      groundOnly: false, splashRadius: 70,
      slow: { factor: 0.45, duration: 2.2 },
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

    // ---- Créatures posant chacune une QUESTION à laquelle une tour répond (ADR-022).
    // Une créature qui ne neutralise aucune tour n'ajoute que de la difficulté.

    // Question : la saturation. Réponse : les dégâts de zone.
    rat: {
      id: "rat", name: "Rat de faille",
      lore: "Ils sortent du sol par vagues, gris et innombrables.\nUn seul ne vaut pas une flèche. C'est bien le problème.",
      hp: 14, speed: 100, flying: false, goldReward: 4, damageToCastle: 1, meleeDps: 4,
    },
    // Question : le ciel, mais lourd. Réponse : de l'anti-aérien VRAIMENT investi.
    gargoyle: {
      id: "gargoyle", name: "Gargouille",
      lore: "Descendue des corniches du Vieux Royaume, la pierre lui tient lieu de peau.\nElle vole : vos catapultes la regarderont passer.",
      hp: 115, speed: 42, flying: true, goldReward: 26, damageToCastle: 3, meleeDps: 0,
    },
    // Question : l'armure. Réponse : les gros coups, ou le feu qui ronge les PV max.
    golem: {
      id: "golem", name: "Golem de pierre",
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
  },

  // Mode Histoire (ADR-004) : 10 chapitres déclarés, seul le 1er a du contenu.
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
        { spawns: [{ enemyId: "goblin", count: 14, intervalS: 0.4, delayS: 1 }, { enemyId: "brute", count: 2, intervalS: 4.0, delayS: 4 }], miniBoss: { enemyId: "brute", hpMult: 4 } },
      ],
    },
    // Ch.2-10 : contenu généré provisoire, noms placeholders (à remplacer via docs/LORE.md).
    // Déblocage séquentiel : conquérir le chapitre précédent (géré côté UI/profil).
    makeChapter(2, "Les Faubourgs en cendres", "ash", "Les survivants affluent. Les hordes aussi."),
    makeChapter(3, "Le Gué des Orcs", "marsh", "Deux routes mènent au Bastion. Les orcs le savent."),
    makeChapter(4, "La Forêt Murmurante", "forest", "Quelque chose déchire le voile entre les mondes."),
    makeChapter(5, "Les Carrières", "quarry", "La pierre du Bastion vient d'ici. Elle est rouge, désormais."),
    makeChapter(6, "Le Col du Gel", "frost", "Le froid ne les arrête pas. Rien ne les arrête."),
    makeChapter(7, "Les Tertres", "barrow", "Les morts d'hier grossissent les rangs d'aujourd'hui."),
    makeChapter(8, "La Herse Brisée", "ruins", "La première muraille est tombée. Reste la vôtre."),
    makeChapter(9, "Les Portes du Nord", "tundra", "Au-delà : son royaume. Il vous attend."),
    // Final : boss multi-phases prévu (à chaque mort, il revient plus fort — GDD §Boss final).
    // En attendant : mini-boss x12 en 12e vague.
    makeChapter(10, "Le Roi-Charogne", "blight", "Le maître des hordes en personne."),
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
  forge: { damageMultPerLevel: 0.10, upgradeCosts: [20, 45, 80, 130] },

  // Vente de tour : 65% de l'investissement remboursé (GDD : 60-70%, à affiner au playtest).
  economy: { sellRefundRate: 0.65, startingGold: 160 },

  // Armurerie. Six paliers échelonnés plutôt que trois : à 120 Éclats au total, le
  // catalogue se vidait en 2 runs alors que le jeu compte 10 chapitres (ADR-021).
  // Chaque entrée porte son effet — la simulation les applique sans les connaître.
  unlocks: [
    { id: "tower_frost", name: "Tour de givre", desc: "Ralentit les ennemis en zone. Le 3e pilier de votre défense.", cost: 30 },
    { id: "castle_hp_1", name: "Remparts renforcés", desc: "+10 PV de château à chaque partie.", cost: 40, castleHp: 10 },
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
    // entre le ch.1 et le ch.10). Progression douce mais nette, ×1 → ×3.
    shardsChapterMult: [1, 1.22, 1.44, 1.66, 1.88, 2.1, 2.32, 2.54, 2.76, 3],
    heroBlockSecondsPerSceau: 9,
    sceauxVictoryBonus: 2,
    sceauxPerHeroDeath: 1,
  },

  // Étoiles : "château beaucoup touché" = plus de 50% des PV perdus (GDD §Étoiles).
  rating: { heavyDamagePct: 0.5 },

  accountSpell: { damage: 60, radius: 90, cooldownS: 25 },
};

// ---------- Unlocks méta (écran compte) ----------
// Vit désormais DANS le ContentPack (`CONTENT.unlocks`) : chaque déblocage porte ses
// effets, que `createRun` applique sans les connaître. Le catalogue passe de 3 à 6
// entrées et de 120 à 420 Éclats — à 120, il se vidait en 2 runs pour 10 chapitres
// (ADR-021). Réexporté ici : c'est le nom sous lequel l'UI et la méta le lisent.
export const UNLOCKS: UnlockDef[] = CONTENT.unlocks;
