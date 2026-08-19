// ============================================================
// content/index.ts — TOUTES les valeurs d'équilibrage (ADR-003).
// Aucune stat en dur dans core/ ou render/. Modifier ici = rééquilibrer.
// Coordonnées logiques : 960x540, 16:9 (ADR-027 — le rendu scale). Convention de
// bord : entrées à x/y≈-20, sorties côté château à x≈980 / y≈560.
// ============================================================

import type { ChapterDef, ContentPack, MapDef, UnlockDef, WaveDef, WaveSpawn } from "../core/types";
export type { UnlockDef };

// ---------- Cartes des chapitres 2-10 : une topologie propre à chaque chapitre
// (ADR-027), 1 à 3 voies selon la carte, en écho au biome. Placeholders en
// attente du lore (docs/LORE.md) — seule la géométrie change, pas les noms.

// Ch.2 « Faubourgs en cendres » : zigzag au sol + raccourci de Faille qui plonge
// verticalement et rejoint le tronc commun (~27 % plus court, exempté du ratio).
const CH2_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 410 }, { x: 260, y: 410 }, { x: 260, y: 200 }, { x: 620, y: 200 }, { x: 620, y: 395 }, { x: 980, y: 395 }] },
    { waypoints: [{ x: 340, y: -20 }, { x: 340, y: 200 }, { x: 620, y: 200 }, { x: 620, y: 395 }, { x: 980, y: 395 }], portal: true },
  ],
  slots: [
    { x: 150, y: 340 }, { x: 150, y: 255 }, { x: 430, y: 270 }, { x: 500, y: 130 },
    { x: 720, y: 280 }, { x: 785, y: 335 }, { x: 430, y: 80 }, { x: 860, y: 285 },
  ],
};

// Ch.3 « Gué des Orcs » : deux méandres (marais, courbes douces) qui convergent
// avant le château — « deux routes mènent au Bastion » (lore).
const CH3_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 120 }, { x: 200, y: 120 }, { x: 200, y: 260 }, { x: 400, y: 220 }, { x: 560, y: 300 }, { x: 980, y: 300 }] },
    { waypoints: [{ x: -20, y: 420 }, { x: 220, y: 420 }, { x: 220, y: 300 }, { x: 400, y: 220 }, { x: 560, y: 300 }, { x: 980, y: 300 }] },
  ],
  slots: [
    { x: 100, y: 180 }, { x: 300, y: 150 }, { x: 100, y: 350 }, { x: 300, y: 360 },
    { x: 480, y: 340 }, { x: 650, y: 240 }, { x: 800, y: 230 }, { x: 880, y: 200 },
  ],
};

// Ch.4 « Forêt Murmurante » : deux voies plus anguleuses (la faille déchire le
// voile) qui convergent plus tôt, tronc long qui absorbe l'écart de longueur.
const CH4_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 90 }, { x: 250, y: 90 }, { x: 250, y: 280 }, { x: 500, y: 280 }, { x: 750, y: 180 }, { x: 980, y: 180 }] },
    { waypoints: [{ x: -20, y: 400 }, { x: 300, y: 400 }, { x: 300, y: 280 }, { x: 500, y: 280 }, { x: 750, y: 180 }, { x: 980, y: 180 }] },
  ],
  slots: [
    { x: 120, y: 150 }, { x: 320, y: 180 }, { x: 150, y: 340 }, { x: 365, y: 350 },
    { x: 625, y: 300 }, { x: 651, y: 150 }, { x: 850, y: 80 }, { x: 800, y: 260 },
  ],
};

// Ch.5 « Carrières » : une seule voie, en lacets serrés — pas de choix de voie,
// toute la pression se concentre sur une ligne (pression concentrée, ADR-020).
const CH5_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [
      { x: -20, y: 410 }, { x: 250, y: 410 }, { x: 250, y: 150 }, { x: 550, y: 150 },
      { x: 550, y: 410 }, { x: 850, y: 410 }, { x: 980, y: 410 },
    ] },
  ],
  slots: [
    { x: 120, y: 340 }, { x: 170, y: 280 }, { x: 400, y: 220 }, { x: 460, y: 280 },
    { x: 620, y: 340 }, { x: 700, y: 340 }, { x: 790, y: 340 }, { x: 900, y: 300 },
  ],
};

// Ch.6 « Col du Gel » : trois cols (haut/milieu/bas) qui se resserrent en un
// seul tronc avant le château — le froid n'ouvre qu'un seul passage.
const CH6_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 40 }, { x: 300, y: 40 }, { x: 300, y: 220 }, { x: 480, y: 270 }, { x: 720, y: 270 }, { x: 980, y: 270 }] },
    { waypoints: [{ x: -20, y: 270 }, { x: 250, y: 270 }, { x: 480, y: 270 }, { x: 720, y: 270 }, { x: 980, y: 270 }] },
    { waypoints: [{ x: -20, y: 400 }, { x: 300, y: 400 }, { x: 300, y: 300 }, { x: 480, y: 270 }, { x: 720, y: 270 }, { x: 980, y: 270 }] },
  ],
  slots: [
    { x: 150, y: 110 }, { x: 90, y: 330 }, { x: 220, y: 340 },
    { x: 550, y: 210 }, { x: 650, y: 330 }, { x: 750, y: 210 }, { x: 820, y: 340 }, { x: 880, y: 170 },
  ],
};

// Ch.7 « Tertres » : chemin qui contourne les tumulus + raccourci court « les
// morts se lèvent » (portail), la majeure partie du trajet reste partagée.
const CH7_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 300 }, { x: 250, y: 300 }, { x: 250, y: 140 }, { x: 560, y: 140 }, { x: 560, y: 400 }, { x: 980, y: 400 }] },
    { waypoints: [{ x: 400, y: -20 }, { x: 400, y: 140 }, { x: 560, y: 140 }, { x: 560, y: 400 }, { x: 980, y: 400 }], portal: true },
  ],
  slots: [
    { x: 130, y: 220 }, { x: 320, y: 230 }, { x: 330, y: 60 }, { x: 650, y: 270 },
    { x: 800, y: 300 }, { x: 930, y: 300 }, { x: 480, y: 80 }, { x: 500, y: 220 },
  ],
};

// Ch.8 « Herse Brisée » : trois voies qui traversent la muraille effondrée et
// fusionnent en un seul tronc, qui reste fusionné jusqu'au château.
const CH8_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 60 }, { x: 260, y: 60 }, { x: 260, y: 200 }, { x: 400, y: 270 }, { x: 650, y: 270 }, { x: 850, y: 180 }, { x: 980, y: 180 }] },
    { waypoints: [{ x: -20, y: 270 }, { x: 230, y: 270 }, { x: 400, y: 270 }, { x: 650, y: 270 }, { x: 850, y: 180 }, { x: 980, y: 180 }] },
    { waypoints: [{ x: -20, y: 400 }, { x: 260, y: 400 }, { x: 260, y: 300 }, { x: 400, y: 270 }, { x: 650, y: 270 }, { x: 850, y: 180 }, { x: 980, y: 180 }] },
  ],
  slots: [
    { x: 150, y: 120 }, { x: 100, y: 210 }, { x: 150, y: 340 },
    { x: 550, y: 210 }, { x: 600, y: 330 }, { x: 777, y: 284 }, { x: 773, y: 143 }, { x: 880, y: 70 },
  ],
};

// Ch.9 « Portes du Nord » : trois voies larges (haut/milieu/bas), le cas le
// plus dur pour la couverture de slots — elles ne convergent que tard.
const CH9_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 90 }, { x: 350, y: 90 }, { x: 600, y: 190 }, { x: 750, y: 270 }, { x: 980, y: 270 }] },
    { waypoints: [{ x: -20, y: 270 }, { x: 400, y: 270 }, { x: 750, y: 270 }, { x: 980, y: 270 }] },
    { waypoints: [{ x: -20, y: 400 }, { x: 350, y: 400 }, { x: 600, y: 330 }, { x: 750, y: 270 }, { x: 980, y: 270 }] },
  ],
  // En quinconce de part et d'autre du tronc (y=270) : évite l'alignement de six
  // dalles collées à la route qui ne laissait aucun vrai choix de placement.
  slots: [
    { x: 200, y: 155 }, { x: 200, y: 335 },
    { x: 560, y: 110 }, { x: 300, y: 340 }, { x: 700, y: 150 }, { x: 770, y: 350 }, { x: 830, y: 180 }, { x: 855, y: 350 },
  ],
};

// Ch.10 « Roi-Charogne » : reste proche de la simplicité du ch.1 — un S au sol
// + un raccourci de Faille court, pour ne pas ajouter une lecture de carte
// difficile au premier vrai combat de boss.
const CH10_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 270 }, { x: 300, y: 270 }, { x: 300, y: 390 }, { x: 650, y: 390 }, { x: 650, y: 220 }, { x: 980, y: 220 }] },
    { waypoints: [{ x: 500, y: -20 }, { x: 500, y: 220 }, { x: 650, y: 220 }, { x: 980, y: 220 }], portal: true },
  ],
  // 7 emplacements, positionnés pour rester juste au-dessus du minimum requis
  // (pas de tronc sur-couvert) — un ch.10 trop généreusement défendable en
  // spread invaliderait la garantie ADR-024 (infranchissable sans la Forge,
  // quelle que soit la stratégie), trop chiche l'invaliderait dans l'autre sens
  // (ingagnable même avec la méta complète) — vérifié par `autoplay.test.ts`.
  slots: [
    { x: 150, y: 340 }, { x: 450, y: 330 }, { x: 560, y: 80 }, { x: 440, y: 150 },
    { x: 800, y: 280 }, { x: 750, y: 160 }, { x: 580, y: 320 },
  ],
};

/**
 * Créature introduite à chaque chapitre — une de plus par niveau, puis des mélanges
 * (ADR-022). Chacune neutralise une tour et en valorise une autre : le joueur ne
 * subit pas un nouveau monstre, il doit revoir sa composition.
 */
const NEWCOMER: Record<number, string> = {
  2: "rat",         // saturation → dégâts de zone
  3: "wraith",      // insensible au froid → puissance brute
  4: "gargoyle",    // volant lourd → anti-aérien investi
  5: "golem",       // cuirassé → gros coups ou brûlure
  6: "scorpion",    // saturation légèrement cuirassée → dégâts de zone soutenus
  7: "troll",       // encaissement lourd, mono-cible → tours à zone
  8: "ogre",        // cuirassé intermédiaire → gros coups
  9: "dark_knight", // élite rapide et cuirassée → mono-cible investi
};

/** Effectif de la vague de présentation, par créature : une nuée se découvre en
 *  nombre, un cuirassé à l'unité. Calibré au banc — la première version noyait le
 *  joueur sous neuf gargouilles et faisait tomber le chapitre 4 en une vague. */
const FRESH_COUNT: Record<string, number> = {
  rat: 8, wraith: 3, gargoyle: 1.6, golem: 1.2,
  scorpion: 6, troll: 2, ogre: 1.3, dark_knight: 1.5,
};

/** Créatures disponibles à un chapitre donné : le socle plus tout ce qui précède. */
function rosterFor(num: number): string[] {
  const base: string[] = ["goblin", "orc", "bat", "brute"];
  const unlocked: string[] = Object.entries(NEWCOMER)
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
function makeWaves(num: number, pathCount: number): WaveDef[] {
  const d: number = num - 1;
  const waveCount: number = d >= 9 ? 12 : 10;
  const roster: string[] = rosterFor(num);
  const fresh: string | undefined = NEWCOMER[num];
  const has = (id: string) => roster.includes(id);
  const waves: WaveDef[] = [];
  for (let w: number = 0; w < waveCount; w++) {
    // Facteur de volume. Abaissé avec la densification (ADR-020) : des vagues plus
    // SERRÉES à effectif égal pèsent bien plus lourd — c'est le resserrement, pas le
    // nombre, qui donne son rôle aux tours à zone.
    const k: number = 1 + d * 0.2 + w * 0.12;
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
        if (fresh) spawns.push({ enemyId: fresh, count: Math.max(1, Math.round(FRESH_COUNT[fresh]! * k)), intervalS: fresh === "rat" || fresh === "scorpion" ? 0.3 : 1.6, delayS: 1 });
        else {
          spawns.push({ enemyId: "bat", count: Math.round(5 * k), intervalS: 0.65, delayS: 1 },
                      { enemyId: "orc", count: Math.round(3 * k), intervalS: 1.4, delayS: 4 });
        }
        break;
      case 3:
        // Front lourd : ce qui encaisse devant, ce qui sature derrière.
        spawns.push(has("ogre")
          ? { enemyId: "ogre", count: Math.max(1, Math.round(0.5 * k)), intervalS: 5.2, delayS: 1 }
          : has("golem")
            ? { enemyId: "golem", count: Math.max(1, Math.round(0.45 * k)), intervalS: 6, delayS: 1 }
            : { enemyId: "brute", count: Math.max(1, Math.round(k)), intervalS: 3.5, delayS: 1 });
        spawns.push(has("scorpion")
          ? { enemyId: "scorpion", count: Math.round(6 * k), intervalS: 0.3, delayS: 3 }
          : has("rat")
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
        if (has("troll")) spawns.push({ enemyId: "troll", count: Math.max(1, Math.round(0.8 * k)), intervalS: 2.6, delayS: 4 });
        if (has("dark_knight")) spawns.push({ enemyId: "dark_knight", count: Math.max(1, Math.round(0.6 * k)), intervalS: 3.0, delayS: 7 });
    }
    // Distribue les renforts sur les voies secondaires en tourniquet (1..pathCount-1) :
    // un chapitre à 3 voies alterne entre elles au lieu de toujours viser la voie 1.
    if (pathCount > 1 && w >= 3 && w % 2 === 1) {
      const extraPathIndex: number = 1 + (Math.floor(w / 2) % (pathCount - 1));
      spawns.push({ enemyId: w % 4 === 1 ? "goblin" : "orc", count: Math.round(3 * k), intervalS: 0.85, delayS: 2, pathIndex: extraPathIndex });
    }
    const wave: WaveDef = { spawns };
    // Boss de mi-parcours (vague 5) : le Chef de guerre dès qu'il entre en scène,
    // la Brute renforcée avant. Multiplicateurs volontairement bas (ADR-020) : un
    // boss est une cible ISOLÉE, les tours à zone n'y peuvent rien.
    if (w === 4) {
      wave.miniBoss = has("dark_knight")
        ? { enemyId: "dark_knight", hpMult: 1.6 + 0.08 * d }
        : has("golem")
          ? { enemyId: "warlord", hpMult: 1 + 0.07 * d }
          : { enemyId: "brute", hpMult: 2 + 0.25 * d };
    }
    // Boss final. Le ch.10 dresse la Vouivre — un boss VOLANT, qui invalide d'un
    // coup toute défense bâtie sur les catapultes (GDD §Boss final).
    if (w === waveCount - 1) {
      wave.miniBoss = d >= 9
        ? { enemyId: "wyvern", hpMult: 2.8 }
        : has("golem")
          ? { enemyId: "warlord", hpMult: 1.3 + 0.09 * d }
          : { enemyId: "brute", hpMult: 2.4 + 0.25 * d };
    }
    waves.push(wave);
  }
  return waves;
}

/** Chapitres 2-10 : chaque chapitre a désormais sa propre topologie (ADR-027),
 *  1 à 3 voies selon la carte. Noms/lore = placeholders (docs/LORE.md). */
function makeChapter(num: number, name: string, biome: string, lore: string, map: MapDef): ChapterDef {
  return { id: `ch${num}`, name, lore, biome, playable: true, map, waves: makeWaves(num, map.paths.length) };
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
      // Disponible d'emblée (ADR-024). Elle était verrouillée derrière un achat, ce
      // qui rendait le chapitre 1 très rude sans elle — et un joueur qui n'y arrive
      // pas ne gagne pas de quoi la débloquer. Le triangle de rôles n'a de sens que
      // si ses trois côtés sont posables dès la première partie.
      requiresUnlock: null,
      // Niveau 4 : aura de zone OU givre qui brûle
      specs: [
        {
          id: "spec_blizzard", name: "Blizzard", desc: "Aura de givre continue (ralentit + dégâts), ne tire plus",
          cost: 220, stats: { range: 0, damage: 0, fireRate: 0 },
          // Rayon relevé (170→200) : à 170 l'aura ne couvrait guère plus que la
          // portée d'une Archerie de base (130-160) alors que la tour renonce à
          // TOUT dégât de tir pour ce rôle — le sacrifice n'était pas assez payé.
          // `dps` plat (armure normale) et non en % PV max : un chip damage
          // léger, pas une brûlure — ce rôle-là reste à Givre ardent (`burn`).
          // Les deux bornés par le garde-fou d'ADR-024 : le chapitre 10 doit
          // rester infranchissable sans la Forge, quelle que soit la stratégie
          // (vérifié par `autoplay.test.ts`).
          aura: { radius: 200, slowFactor: 0.35, dps: 3 }, slow: null,
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
    // Reskin CraftPix (ADR-044) : diablotin plutôt que rongeur — le nom suit
    // l'image, pas l'inverse.
    rat: {
      id: "rat", name: "Diablotin de faille",
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
    // Question : la saturation, en plus dur que le rat. Réponse : dégâts de zone soutenus.
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
    // Final : boss multi-phases prévu (à chaque mort, il revient plus fort — GDD §Boss final).
    // En attendant : mini-boss x12 en 12e vague.
    makeChapter(10, "Le Roi-Charogne", "blight", "Le maître des hordes en personne.", CH10_MAP),
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

  // Vente de tour : 65% de l'investissement remboursé (GDD : 60-70%, à affiner au playtest).
  economy: { sellRefundRate: 0.65, startingGold: 160 },

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
