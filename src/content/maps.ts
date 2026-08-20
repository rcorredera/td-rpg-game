// ============================================================
// content/maps.ts — Topologie des chapitres 2 à 20 : chemins, emplacements de
// tours, PV de château. Extrait de `index.ts` (ADR-057) : c'est de la GÉOMÉTRIE,
// pas de l'équilibrage — on n'y touche ni pour les mêmes raisons ni au même
// rythme que les stats de tours et de créatures.
//
// Coordonnées logiques : 960x540, 16:9 (ADR-027 — le rendu scale). Convention de
// bord : entrées à x/y≈-20, sorties côté château à x≈980 / y≈560.
// La carte du chapitre 1, écrite à la main, vit avec son chapitre dans `index.ts`.
// ============================================================

import type { MapDef } from "../core/types";

// ---------- Cartes des chapitres 2-10 : une topologie propre à chaque chapitre
// (ADR-027), 1 à 3 voies selon la carte, en écho au biome. Placeholders en
// attente du lore (docs/LORE.md) — seule la géométrie change, pas les noms.

// Ch.2 « Faubourgs en cendres » : zigzag au sol + raccourci de Faille qui plonge
// verticalement et rejoint le tronc commun (~27 % plus court, exempté du ratio).
export const CH2_MAP: MapDef = {
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
export const CH3_MAP: MapDef = {
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
export const CH4_MAP: MapDef = {
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
export const CH5_MAP: MapDef = {
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
export const CH6_MAP: MapDef = {
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
export const CH7_MAP: MapDef = {
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
export const CH8_MAP: MapDef = {
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
export const CH9_MAP: MapDef = {
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
export const CH10_MAP: MapDef = {
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
export const CH11_MAP: MapDef = {
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
export const CH12_MAP: MapDef = {
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
export const CH13_MAP: MapDef = {
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
export const CH14_MAP: MapDef = {
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
export const CH15_MAP: MapDef = {
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
export const CH16_MAP: MapDef = {
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
export const CH17_MAP: MapDef = {
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
export const CH18_MAP: MapDef = {
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
export const CH19_MAP: MapDef = {
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
export const CH20_MAP: MapDef = {
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
