// ============================================================
// content/waves.ts — Génération des vagues et des chapitres 2 à 20 (ADR-057).
// Déterministe (aucun RNG) : même content à chaque chargement.
//
// Séparé des catalogues parce que c'est de la LOGIQUE, pas de la donnée : ces
// fonctions décident quelle créature apparaît quand, à partir des rosters. Les
// stats qu'elles convoquent vivent dans `enemies.ts`, jamais ici (ADR-003).
// ============================================================

import type { ChapterDef, MapDef, WaveDef, WaveSpawn } from "../core/types";

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
export function makeWaves(num: number, pathCount: number): WaveDef[] {
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
export function makeChapter(num: number, name: string, biome: string, lore: string, map: MapDef): ChapterDef {
  return { id: `ch${num}`, name, lore, biome, playable: true, map, waves: makeWaves(num, map.paths.length) };
}
