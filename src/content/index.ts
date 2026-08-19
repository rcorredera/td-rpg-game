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

// ---------- Cartes du deuxième acte (ch.11-20, ADR-049/050) : ch.10 devient un boss
// intermédiaire, ch.20 le vrai boss final. Même convention que ch.2-10 (ADR-027).

// Deuxième acte (ch.11-19) : géométries reprises 1-pour-1 des cartes du premier
// acte (ch.2-10 déjà validées par `datasheet.test.ts` — zone jouable, distance
// route/château/inter-dalles, portée des tours) plutôt que redessinées de zéro.
// Seuls le nom, le biome et la lore changent : l'habillage suit le nouveau
// monstre de chaque chapitre, la géométrie reste un terrain déjà éprouvé
// (ADR-049/050). Ch.20 garde un tracé dédié, proche du ch.10 (boss final).

// Ch.11 « Marais Fangeux » : reprend Ch.5 (une seule voie en lacets serrés) — la
// Gelée Enragée n'a pas besoin d'un choix de voie pour saturer un couloir seul.
const CH11_MAP: MapDef = {
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

// Ch.12 « Ombres du Cloître » : reprend Ch.2 (zigzag + raccourci de Faille).
const CH12_MAP: MapDef = {
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

// Ch.13 « Passe des Lances » : reprend Ch.3 (deux méandres qui convergent).
const CH13_MAP: MapDef = {
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

// Ch.14 « Sanctuaire Corrompu » : reprend Ch.4 (deux voies anguleuses).
const CH14_MAP: MapDef = {
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

// Ch.15 « Écarlate » : reprend Ch.6 (trois cols qui se resserrent) — le Piqueur
// Écarlate sature depuis plusieurs directions, comme les trois voies l'imposent.
const CH15_MAP: MapDef = {
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

// Ch.16 « Charnier Gelé » : reprend Ch.7 (contournement + raccourci de Faille).
const CH16_MAP: MapDef = {
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

// Ch.17 « Frontières Rompues » : reprend Ch.8 (trois voies qui fusionnent).
const CH17_MAP: MapDef = {
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

// Ch.18 « Cicatrice des Failles » : reprend Ch.9 (trois voies larges, quinconce).
const CH18_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 90 }, { x: 350, y: 90 }, { x: 600, y: 190 }, { x: 750, y: 270 }, { x: 980, y: 270 }] },
    { waypoints: [{ x: -20, y: 270 }, { x: 400, y: 270 }, { x: 750, y: 270 }, { x: 980, y: 270 }] },
    { waypoints: [{ x: -20, y: 400 }, { x: 350, y: 400 }, { x: 600, y: 330 }, { x: 750, y: 270 }, { x: 980, y: 270 }] },
  ],
  slots: [
    { x: 200, y: 155 }, { x: 200, y: 335 },
    { x: 560, y: 110 }, { x: 300, y: 340 }, { x: 700, y: 150 }, { x: 770, y: 350 }, { x: 830, y: 180 }, { x: 855, y: 350 },
  ],
};

// Ch.19 « Voile Nocturne » : trois voies étroites qui convergent très tard —
// l'Assassin Voilé « ne charge jamais deux fois la même route » (lore) : la carte
// lui donne vraiment trois routes distinctes jusqu'au bout.
const CH19_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 60 }, { x: 300, y: 60 }, { x: 550, y: 160 }, { x: 700, y: 240 }, { x: 980, y: 240 }] },
    { waypoints: [{ x: -20, y: 240 }, { x: 400, y: 240 }, { x: 700, y: 240 }, { x: 980, y: 240 }] },
    { waypoints: [{ x: -20, y: 400 }, { x: 300, y: 400 }, { x: 550, y: 320 }, { x: 700, y: 240 }, { x: 980, y: 240 }] },
  ],
  slots: [
    { x: 160, y: 140 }, { x: 160, y: 340 }, { x: 300, y: 150 }, { x: 300, y: 330 },
    { x: 720, y: 160 }, { x: 650, y: 335 }, { x: 820, y: 140 }, { x: 820, y: 340 },
  ],
};

// Ch.20 « Trône Fangeux » : reste proche de la simplicité du ch.1/ch.10 — un S au
// sol + un raccourci de Faille court, même logique que ch.10 (ne pas ajouter une
// lecture de carte difficile au vrai combat de boss final, ADR-049/050).
const CH20_MAP: MapDef = {
  castleHp: 20,
  paths: [
    { waypoints: [{ x: -20, y: 300 }, { x: 320, y: 300 }, { x: 320, y: 390 }, { x: 660, y: 390 }, { x: 660, y: 200 }, { x: 980, y: 200 }] },
    { waypoints: [{ x: 520, y: -20 }, { x: 520, y: 200 }, { x: 660, y: 200 }, { x: 980, y: 200 }], portal: true },
  ],
  slots: [
    { x: 160, y: 225 }, { x: 460, y: 330 }, { x: 580, y: 100 }, { x: 460, y: 150 },
    { x: 800, y: 280 }, { x: 760, y: 140 },
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
  // Deuxième acte (ch.11-20, ADR-049/050) : pas de newcomer pour le ch.10 (boss
  // intermédiaire, comme avant) ni le ch.20 (boss dédié final, jamais en trash).
  11: "bog_sprite",       // saturation, encore → dégâts de zone
  12: "shade_warder",     // encaissement passif (bouclier) → cadence soutenue
  13: "four_eyed_warden", // cuirassé et à portée de mêlée → gros coups, en avance
  14: "corrupted_hermit", // encaissement lourd → tours à zone
  15: "scarlet_prickler", // saturation, plus dense → dégâts de zone
  16: "howling_bones",    // insensible au froid, encaissement lourd → puissance brute
  17: "frontier_raider",  // volume mono-cible, plus rapide → rien de neuf
  18: "rift_marauder",    // mono-cible standard → rien de neuf
  19: "veiled_assassin",  // élite rapide, haut DPS/faible PV → focalisation
};

/** Effectif de la vague de présentation, par créature : une nuée se découvre en
 *  nombre, un cuirassé à l'unité. Calibré au banc — la première version noyait le
 *  joueur sous neuf gargouilles et faisait tomber le chapitre 4 en une vague. */
const FRESH_COUNT: Record<string, number> = {
  rat: 8, wraith: 3, gargoyle: 1.6, golem: 1.2,
  scorpion: 6, troll: 2, ogre: 1.3, dark_knight: 1.5,
  bog_sprite: 6, shade_warder: 1.3, four_eyed_warden: 1.4, corrupted_hermit: 1.1,
  scarlet_prickler: 7, howling_bones: 1, frontier_raider: 2, rift_marauder: 2,
  veiled_assassin: 1.3,
};

/** Newcomers "essaim" (cadence de spawn serrée en vague de présentation) plutôt
 *  qu'élite/tank isolé — même distinction que rat/scorpion pour le premier acte. */
const SWARM_NEWCOMERS: ReadonlySet<string> = new Set(["rat", "scorpion", "bog_sprite", "scarlet_prickler"]);

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
  // 12 vagues pour les chapitres à boss dédié (ch.10 intermédiaire, ch.20 final) —
  // pas pour tout chapitre ≥ 10, sinon 11-19 hériteraient du format "final" sans
  // le mériter (ADR-049/050 : ch.10 redevient un boss INTERMÉDIAIRE une fois ch.20
  // ajouté, ch.11-19 restent des chapitres standards à 10 vagues).
  const waveCount: number = num === 10 || num === 20 ? 12 : 10;
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
        if (fresh) spawns.push({ enemyId: fresh, count: Math.max(1, Math.round(FRESH_COUNT[fresh]! * k)), intervalS: SWARM_NEWCOMERS.has(fresh) ? 0.3 : 1.6, delayS: 1 });
        else {
          spawns.push({ enemyId: "bat", count: Math.round(5 * k), intervalS: 0.65, delayS: 1 },
                      { enemyId: "orc", count: Math.round(3 * k), intervalS: 1.4, delayS: 4 });
        }
        break;
      case 3:
        // Front lourd : ce qui encaisse devant, ce qui sature derrière. Cascade
        // vers le tank le plus RÉCEMMENT débloqué (ADR-049/050 : le deuxième acte
        // continue l'escalade plutôt que de rejouer indéfiniment ogre/golem/brute).
        spawns.push(has("howling_bones")
          ? { enemyId: "howling_bones", count: Math.max(1, Math.round(0.45 * k)), intervalS: 6, delayS: 1 }
          : has("corrupted_hermit")
            ? { enemyId: "corrupted_hermit", count: Math.max(1, Math.round(0.5 * k)), intervalS: 5.5, delayS: 1 }
            : has("four_eyed_warden")
              ? { enemyId: "four_eyed_warden", count: Math.max(1, Math.round(0.55 * k)), intervalS: 5.2, delayS: 1 }
              : has("ogre")
                ? { enemyId: "ogre", count: Math.max(1, Math.round(0.5 * k)), intervalS: 5.2, delayS: 1 }
                : has("golem")
                  ? { enemyId: "golem", count: Math.max(1, Math.round(0.45 * k)), intervalS: 6, delayS: 1 }
                  : { enemyId: "brute", count: Math.max(1, Math.round(k)), intervalS: 3.5, delayS: 1 });
        spawns.push(has("scarlet_prickler")
          ? { enemyId: "scarlet_prickler", count: Math.round(6 * k), intervalS: 0.3, delayS: 3 }
          : has("bog_sprite")
            ? { enemyId: "bog_sprite", count: Math.round(6 * k), intervalS: 0.32, delayS: 3 }
            : has("scorpion")
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
        // Deuxième acte : le mélange continue de s'enrichir plutôt que de plafonner
        // à dark_knight (ch.9) pour dix chapitres de plus.
        if (has("shade_warder")) spawns.push({ enemyId: "shade_warder", count: Math.max(1, Math.round(0.9 * k)), intervalS: 2.4, delayS: 5 });
        if (has("frontier_raider")) spawns.push({ enemyId: "frontier_raider", count: Math.max(1, Math.round(0.9 * k)), intervalS: 2.2, delayS: 4 });
        if (has("rift_marauder")) spawns.push({ enemyId: "rift_marauder", count: Math.max(1, Math.round(0.9 * k)), intervalS: 2.2, delayS: 6 });
        if (has("veiled_assassin")) spawns.push({ enemyId: "veiled_assassin", count: Math.max(1, Math.round(0.5 * k)), intervalS: 3.2, delayS: 8 });
    }
    // Distribue les renforts sur les voies secondaires en tourniquet (1..pathCount-1) :
    // un chapitre à 3 voies alterne entre elles au lieu de toujours viser la voie 1.
    if (pathCount > 1 && w >= 3 && w % 2 === 1) {
      const extraPathIndex: number = 1 + (Math.floor(w / 2) % (pathCount - 1));
      spawns.push({ enemyId: w % 4 === 1 ? "goblin" : "orc", count: Math.round(3 * k), intervalS: 0.85, delayS: 2, pathIndex: extraPathIndex });
    }
    const wave: WaveDef = { spawns };
    // Boss de mi-parcours (vague 5) : l'élite la plus récente dès qu'elle entre en
    // scène, le Chef de guerre avant, la Brute renforcée en dernier recours.
    // Multiplicateurs volontairement bas (ADR-020) : un boss est une cible ISOLÉE,
    // les tours à zone n'y peuvent rien. Deuxième acte (ADR-049/050) : l'Assassin
    // Voilé prend le relais du Chevalier noir une fois débloqué (ch.19+), pour ne
    // pas rejouer le même mini-boss du ch.9 au ch.19.
    if (w === 4) {
      wave.miniBoss = has("veiled_assassin")
        ? { enemyId: "veiled_assassin", hpMult: 1.5 + 0.05 * d }
        : has("dark_knight")
          ? { enemyId: "dark_knight", hpMult: 1.6 + 0.08 * d }
          : has("golem")
            ? { enemyId: "warlord", hpMult: 1 + 0.07 * d }
            : { enemyId: "brute", hpMult: 2 + 0.25 * d };
    }
    // Boss final. Le ch.10 dresse la Vouivre (boss intermédiaire, ADR-049/050) — un
    // boss VOLANT qui invalide d'un coup toute défense bâtie sur les catapultes
    // (GDD §Boss final). Le ch.20 dresse Le Roi Fangeux, boss dédié et unique du
    // deuxième acte, jamais réutilisé en trash. Les chapitres 11-19 continuent
    // l'escalade normale (pas de boss dédié, comme 2-9 avant le ch.10).
    if (w === waveCount - 1) {
      wave.miniBoss = num === 10
        ? { enemyId: "wyvern", hpMult: 2.8 }
        : num === 20
          ? { enemyId: "the_gravedigger", hpMult: 2.8 }
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
