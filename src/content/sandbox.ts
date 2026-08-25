// ============================================================
// content/sandbox.ts — Bac à sable de RENDU (ADR-066).
//
// Un chapitre qui n'appartient pas à l'Histoire et ne rapporte rien : il sert à
// REGARDER. Le champ de bataille est le seul endroit où une animation, une
// taille ou une orientation se jugent vraiment, et jusqu'ici il fallait entrer
// dans un vrai niveau, poser des tours et survivre pour y arriver — puis
// attendre la bonne vague pour croiser la créature qu'on voulait voir.
//
// Deux propriétés le rendent utile là où un niveau ne l'est pas :
//
// 1. QUATRE DIRECTIONS. Ses voies vont vers la droite, la gauche, le bas et le
//    haut. Un sprite de profil paraît juste tant qu'il longe l'axe pour lequel
//    il a été dessiné ; c'est en descendant qu'il se trahit. Un niveau ordinaire
//    est surtout horizontal et masque le défaut.
// 2. TOUT LE BESTIAIRE, une créature par vague, dans l'ordre du registre. On
//    atteint celle qu'on cherche en enchaînant les vagues, sans jouer.
//
// Le château y a énormément de PV : le bac à sable ne doit pas se terminer
// pendant qu'on observe.
// ============================================================

import type { ChapterDef, ContentPack, EnemyDef, WaveDef } from "../core/types";
import { ENEMIES } from "./enemies";

/** Identifiant du chapitre bac à sable, cité par le Campement. */
export const SANDBOX_ID: string = "sandbox";

/**
 * Une vague par créature, six exemplaires bien espacés.
 *
 * Espacés à dessein : un flot serré empile les silhouettes et empêche justement
 * de regarder l'une d'elles. Six suffisent à peupler les quatre voies.
 */
function paradeWaves(): WaveDef[] {
  return Object.keys(ENEMIES).map(id => ({
    spawns: [
      { enemyId: id, count: 2, intervalS: 2.5, delayS: 0.5 },
      { enemyId: id, count: 2, intervalS: 2.5, delayS: 1.2, pathIndex: 1 },
      { enemyId: id, count: 1, intervalS: 2.5, delayS: 0.9, pathIndex: 2 },
      { enemyId: id, count: 1, intervalS: 2.5, delayS: 1.6, pathIndex: 3 },
    ],
  }));
}

/**
 * Les quatre voies convergent vers le Bastion, comme dans tout chapitre — la sim
 * l'exige. Ce qui change, c'est leur DERNIÈRE ligne droite : chacune aborde le
 * château par un axe différent, et c'est là qu'on observe.
 */
export const SANDBOX_CHAPTER: ChapterDef = {
  id: SANDBOX_ID,
  name: "Bac à sable",
  biome: "meadow",
  playable: true,
  lore: "Aucun enjeu, aucune récompense : un terrain pour regarder les créatures.\nQuatre voies, une vague par bestiole, et le bouton Pause.",
  map: {
    // Volontairement énorme : on vient observer, pas survivre.
    castleHp: 9999,
    paths: [
      // → vers la droite, l'axe pour lequel les sprites de profil sont dessinés
      { waypoints: [{ x: -20, y: 470 }, { x: 480, y: 470 }] },
      // ← vers la gauche : vérifie le retournement horizontal
      { waypoints: [{ x: 980, y: 90 }, { x: 700, y: 90 }, { x: 700, y: 470 }, { x: 480, y: 470 }] },
      // ↓ vers le bas : c'est ici qu'un sprite de profil se trahit
      { waypoints: [{ x: 180, y: -20 }, { x: 180, y: 300 }, { x: 300, y: 300 }, { x: 300, y: 470 }, { x: 480, y: 470 }] },
      // ↑ vers le haut, puis redescente
      { waypoints: [{ x: 840, y: 560 }, { x: 840, y: 250 }, { x: 620, y: 250 }, { x: 620, y: 470 }, { x: 480, y: 470 }] },
    ],
    // Quelques emplacements pour pouvoir aussi regarder les tours tirer.
    slots: [
      { x: 120, y: 380 }, { x: 380, y: 380 }, { x: 240, y: 200 },
      { x: 560, y: 150 }, { x: 760, y: 360 }, { x: 900, y: 200 },
    ],
  },
  waves: paradeWaves(),
};

/**
 * Le GABARIT DE POSES, invocable comme une créature (ADR-073).
 *
 * Une planche dont la justesse ne dépend d'aucun jugement : le cycle y est
 * correct par construction, l'alternance des appuis garantie, l'orientation
 * exacte. Ce qu'on regarde en l'invoquant n'est donc plus l'asset mais le RENDU
 * — orientation selon la direction, cycle calé sur la distance, ancrage par les
 * pieds. Si le gabarit se déplace mal, la faute est au moteur.
 *
 * Il n'appartient PAS à `CONTENT.enemies` : le bac à sable le greffe sur un pack
 * dérivé. Un mannequin gris n'a rien à faire dans le Bestiaire, ni dans le
 * compte des créatures à découvrir.
 *
 * Valeurs volontairement inoffensives — il ne s'agit pas d'équilibrer quoi que
 * ce soit, seulement de le faire marcher assez longtemps pour l'observer.
 */
export const MANNEQUIN: EnemyDef = {
  id: "mannequin",
  name: "Gabarit",
  lore: "Le patron des cycles de marche. Ne figure dans aucune vague.",
  hp: 400,
  speed: 42,
  flying: false,
  goldReward: 0,
  damageToCastle: 0,
  meleeDps: 0,
};

/** Pack du bac à sable : le contenu du jeu, plus le gabarit, moins l'Histoire. */
export function sandboxPack(base: ContentPack): ContentPack {
  return {
    ...base,
    chapters: [SANDBOX_CHAPTER],
    enemies: { ...base.enemies, [MANNEQUIN.id]: MANNEQUIN },
  };
}
