import { CONTENT } from "./src/content/index";
import { PATH_WIDTH, maxDeviation, roundedPath } from "./src/render/path";
import { pathLength } from "./src/balance/datasheet";

let worst = 0;
for (const [i, ch] of CONTENT.chapters.entries()) {
  if (!ch.playable) continue;
  for (const p of ch.map.paths) {
    worst = Math.max(worst, maxDeviation(roundedPath(p.waypoints, PATH_WIDTH / 2), p.waypoints));
  }
  const lens = ch.map.paths.map(p => Math.round(pathLength(p.waypoints)));
  // Couverture : un emplacement couvre une voie s'il peut l'atteindre à portée de base.
  const RANGE = CONTENT.towers.tower_archer!.levels[0]!.range;
  const cover = ch.map.paths.map(p => {
    let n = 0;
    for (const s of ch.map.slots) {
      let best = Infinity;
      for (let k = 1; k < p.waypoints.length; k++) {
        const a = p.waypoints[k - 1]!, b = p.waypoints[k]!;
        const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
        const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.y - a.y) * dy) / L));
        best = Math.min(best, Math.hypot(s.x - (a.x + t * dx), s.y - (a.y + t * dy)));
      }
      if (best <= RANGE) n++;
    }
    return n;
  });
  console.log(`ch${String(i + 1).padStart(2)}  longueurs=${JSON.stringify(lens).padEnd(14)} slots couvrant chaque voie=${JSON.stringify(cover)} / ${ch.map.slots.length}`);
}
console.log(`\nécart max tracé/sim sur tous les chemins : ${worst.toFixed(1)} px (limite ${PATH_WIDTH / 2})`);
