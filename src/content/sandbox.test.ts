import { describe, expect, it } from "vitest";
import type { MapDef, PlayableChapter, Vec2 } from "../core/types";
import { ENEMIES } from "./enemies";
import { CONTENT } from "./index";
import { SANDBOX_CHAPTER, SANDBOX_ID } from "./sandbox";

const sandbox: PlayableChapter = SANDBOX_CHAPTER as PlayableChapter;
const map: MapDef = sandbox.map;

describe("bac à sable — isolement", () => {
  it("N'EST PAS dans les chapitres du jeu", () => {
    // C'est la garantie qui compte. L'écran Histoire, le banc d'équilibrage et
    // tous leurs tests parcourent `CONTENT.chapters` : un chapitre d'atelier à
    // 9999 PV de château et 24 vagues y fausserait chaque mesure, sans que rien
    // ne le signale — les tests d'équilibrage passeraient, sur de mauvais chiffres.
    expect(CONTENT.chapters.some(c => c.id === SANDBOX_ID)).toBe(false);
  });

  it("reste un chapitre JOUABLE, sinon la scène le refuserait", () => {
    expect(sandbox.playable).toBe(true);
  });
});

describe("bac à sable — carte", () => {
  it("aborde le Bastion par QUATRE axes différents", () => {
    // Sa raison d'être : un sprite de profil paraît juste tant qu'il longe l'axe
    // pour lequel il a été dessiné, et se trahit en descendant. Un niveau
    // ordinaire est surtout horizontal et masque le défaut.
    expect(map.paths.length).toBe(4);
    const axes: string[] = map.paths.map(p => {
      const w: readonly Vec2[] = p.waypoints;
      const a: Vec2 = w[0]!, b: Vec2 = w[1]!;
      if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) return b.x > a.x ? "→" : "←";
      return b.y > a.y ? "↓" : "↑";
    });
    expect([...new Set(axes)].sort()).toEqual(["←", "↑", "→", "↓"].sort());
  });

  it("fait converger toutes les voies vers le même Bastion", () => {
    // La simulation le suppose : le château est en bout du PREMIER chemin, et
    // une voie qui finirait ailleurs y enverrait des créatures dans le vide.
    const ends: string[] = map.paths.map(p => {
      const last: Vec2 = p.waypoints[p.waypoints.length - 1]!;
      return `${last.x},${last.y}`;
    });
    expect(new Set(ends).size).toBe(1);
  });

  it("donne au Bastion des PV hors de portée : on vient observer, pas survivre", () => {
    expect(map.castleHp).toBeGreaterThan(1000);
  });

  it("offre des emplacements de tour, pour regarder aussi les tirs", () => {
    expect(map.slots.length).toBeGreaterThanOrEqual(4);
  });
});

describe("bac à sable — défilé des créatures", () => {
  it("consacre UNE vague à chaque créature du bestiaire", () => {
    // On atteint celle qu'on cherche en enchaînant les vagues, sans jouer.
    const ids: string[] = Object.keys(ENEMIES);
    expect(sandbox.waves.length).toBe(ids.length);
    const perWave: string[] = sandbox.waves.map(w => {
      const set: Set<string> = new Set(w.spawns.map(s => s.enemyId));
      expect(set.size, "une vague ne montre qu'une créature").toBe(1);
      return [...set][0]!;
    });
    expect(perWave.sort()).toEqual([...ids].sort());
  });

  it("ne cite aucune créature inconnue", () => {
    for (const w of sandbox.waves) {
      for (const s of w.spawns) {
        expect(ENEMIES[s.enemyId], `créature « ${s.enemyId} » inconnue`).toBeDefined();
      }
    }
  });

  it("n'envoie personne sur une voie qui n'existe pas", () => {
    // Un `pathIndex` hors bornes fait apparaître la créature nulle part.
    for (const w of sandbox.waves) {
      for (const s of w.spawns) {
        const idx: number = s.pathIndex ?? 0;
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(map.paths.length);
      }
    }
  });

  it("occupe les QUATRE voies à chaque vague", () => {
    // Sans quoi il faudrait rejouer la vague pour voir la créature descendre.
    for (const w of sandbox.waves) {
      const used: Set<number> = new Set(w.spawns.map(s => s.pathIndex ?? 0));
      expect(used.size).toBe(map.paths.length);
    }
  });

  it("espace les apparitions, pour qu'on puisse regarder UNE créature", () => {
    // Un flot serré empile les silhouettes et empêche justement d'en observer une.
    for (const w of sandbox.waves) {
      for (const s of w.spawns) {
        expect(s.intervalS).toBeGreaterThanOrEqual(2);
        expect(s.count).toBeLessThanOrEqual(3);
      }
    }
  });
});
