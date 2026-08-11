import { describe, expect, it } from "vitest";
import { CONTENT } from "../content/index";
import { PATH_WIDTH, maxDeviation, roundedPath } from "./path";
import type { Vec2 } from "../core/types";

/** Tous les chemins déclarés par le content, tous chapitres confondus. */
function allPaths(): { label: string; waypoints: Vec2[] }[] {
  return CONTENT.chapters.flatMap((ch, i) =>
    ch.playable
      ? ch.map.paths.map((p, j) => ({ label: `ch${i + 1} voie ${j + 1}`, waypoints: [...p.waypoints] }))
      : [],
  );
}

describe("tracé des chemins — le rendu ne doit pas mentir sur la position des unités", () => {
  // LE test de cette famille. La sim fait avancer les ennemis sur les segments
  // DROITS entre waypoints ; les tours visent cette position réelle. Si la route
  // dessinée s'en écarte de plus d'une demi-largeur, l'unité apparaît à côté de sa
  // route et le joueur ne peut plus anticiper ce que ses tours atteignent.
  // Bug réel : une spline de Catmull-Rom déviait de 64,7 px pour une route de 46.
  it("reste sur le chemin logique, sur CHAQUE voie de CHAQUE chapitre", () => {
    const limit = PATH_WIDTH / 2;
    for (const { label, waypoints } of allPaths()) {
      const dev = maxDeviation(roundedPath(waypoints, limit), waypoints);
      expect(dev, `${label} : ${dev.toFixed(1)} px d'écart pour une demi-largeur de ${limit}`)
        .toBeLessThanOrEqual(limit);
    }
  });

  it("resterait en défaut avec un rayon abusif — la borne mesure vraiment quelque chose", () => {
    // Sans cette contre-épreuve, le test précédent pourrait passer parce que
    // `maxDeviation` renvoie toujours de petites valeurs, pas parce que le tracé est bon.
    const square: Vec2[] = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 400 }];
    expect(maxDeviation(roundedPath(square, 200), square)).toBeGreaterThan(PATH_WIDTH / 2);
  });

  it("passe par le départ et l'arrivée exacts", () => {
    // Les extrémités portent le sens : entrée des ennemis et château. Les arrondir
    // décalerait l'endroit où les unités apparaissent et où elles frappent.
    for (const { waypoints } of allPaths()) {
      const out = roundedPath(waypoints, PATH_WIDTH / 2);
      expect(out[0]).toEqual(waypoints[0]);
      expect(out[out.length - 1]).toEqual(waypoints[waypoints.length - 1]);
    }
  });

  it("ne replie jamais la route sur elle-même, même sur un segment très court", () => {
    // Deux coins voisins dont les arrondis se chevauchent produiraient une boucle :
    // le rayon doit être borné par la moitié du plus court segment adjacent.
    const tight: Vec2[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 110, y: 0 }, { x: 110, y: 100 }];
    const out = roundedPath(tight, 50);
    expect(maxDeviation(out, tight)).toBeLessThanOrEqual(PATH_WIDTH / 2);
    // Aucune inversion : l'abscisse curviligne ne recule pas sur la partie horizontale.
    const xs = out.filter(p => p.y < 1).map(p => p.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! - 0.001);
  });

  it("laisse intacte une polyligne trop courte pour avoir un coin", () => {
    const line: Vec2[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    expect(roundedPath(line, 20)).toEqual(line);
    expect(roundedPath([], 20)).toEqual([]);
  });

  it("adoucit réellement les angles", () => {
    // Un tracé identique à l'entrée ne corrigerait rien visuellement : l'arrondi
    // doit produire des points intermédiaires dans les virages.
    const corner: Vec2[] = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }];
    expect(roundedPath(corner, PATH_WIDTH / 2).length).toBeGreaterThan(corner.length);
  });
});
