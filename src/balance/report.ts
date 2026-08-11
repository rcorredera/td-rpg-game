// ============================================================
// balance/report.ts — Mise en forme texte du banc d'essai (ADR-018).
// Pur : prend des mesures, rend des chaînes. Aucune E/S — le CLI s'en charge.
// ============================================================

import type { ContentPack } from "../core/types";
import type { UnlockDef } from "../core/types";
import { autoplayAll, type AutoplayReport } from "./autoplay";
import {
  allChapterStats, dpsPerGold, enemyHpAtWave, towerBurstDps,
  towerDps, towerInvestment, traversalSeconds,
} from "./datasheet";
import { economyHealth } from "./economy";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/** Table alignée : les colonnes se dimensionnent sur leur contenu réel. */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? "").length)));
  const line = (cells: string[]) =>
    "  " + cells.map((cell, i) => (i === 0 ? cell.padEnd(widths[i]!) : cell.padStart(widths[i]!))).join("  ");
  return [line(headers), "  " + widths.map(w => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

export function section(title: string): string {
  return `\n${"=".repeat(64)}\n${title}\n${"=".repeat(64)}`;
}

// ---------- Fiches statiques ----------

export function enemiesReport(c: ContentPack, atWave = 9): string {
  const rows = Object.values(c.enemies).map(e => [
    e.name,
    e.flying ? "vol" : "sol",
    String(e.hp),
    String(enemyHpAtWave(c, e.id, atWave)),
    String(e.speed),
    String(e.goldReward),
    String(e.damageToCastle),
    String(e.meleeDps),
  ]);
  return [
    section(`ENNEMIS (PV « v${atWave + 1} » = PV à la vague ${atWave + 1}, scaling ×${c.scaling.hpExponent})`),
    table(["Créature", "Type", "PV", `PV v${atWave + 1}`, "Vitesse", "Or", "Dégâts", "Mêlée"], rows),
  ].join("\n");
}

export function towersReport(c: ContentPack): string {
  const rows: string[][] = [];
  const row = (label: string, t: { id: string; groundOnly: boolean },
               stats: { range: number; damage: number; fireRate: number },
               level: number, specId?: string) => [
    label,
    t.groundOnly ? "sol" : "tout",
    String(stats.range),
    String(stats.damage),
    num(stats.fireRate),
    num(towerDps(c, t.id, level, specId)),
    num(towerBurstDps(c, t.id, level, specId)),
    String(towerInvestment(c, t.id, level, specId)),
    num(dpsPerGold(c, t.id, level, specId)),
  ];
  for (const t of Object.values(c.towers)) {
    t.levels.forEach((lvl, i) => rows.push(row(`${t.name} n${i + 1}`, t, lvl, i + 1)));
    for (const spec of t.specs ?? []) {
      rows.push(row(`${t.name} · ${spec.name}`, t, spec.stats, t.levels.length, spec.id));
    }
  }
  return [
    section("DÉFENSES"),
    "  DPS = sur une cible isolée (un boss). Pointe = multishot compté plein.",
    "  Ni l'un ni l'autre ne compte le splash : la catapulte vaut mieux que son chiffre.",
    "",
    table(["Tour", "Cible", "Portée", "Dégâts", "Cadence", "DPS", "Pointe", "Or investi", "Pointe/or"], rows),
  ].join("\n");
}

export function chaptersReport(c: ContentPack): string {
  const rows = allChapterStats(c).map(ch => {
    const flying = ch.waves.filter(w => w.flyingHpShare > 0).length;
    return [
      `${ch.index + 1}. ${ch.name}`,
      String(ch.waveCount),
      String(ch.slotCount),
      String(ch.pathCount),
      String(ch.castleHp),
      String(Math.round(ch.shortestPath)),
      String(Math.round(ch.totalHp)),
      String(ch.totalGold),
      pct(ch.flyingHpShare),
      `${flying}/${ch.waveCount}`,
    ];
  });
  return [
    section("CHAPITRES (masse = PV cumulés de toutes les vagues)"),
    table(["Chapitre", "Vagues", "Slots", "Voies", "PV châ.", "Chemin", "Masse PV", "Or dispo", "% vol", "V. volantes"], rows),
  ].join("\n");
}

/**
 * Le diagnostic le plus dur d'un TD : la FENÊTRE DE TIR. Le DPS installé
 * multiplié par le temps de traversée borne les dégâts infligeables. Si les PV
 * d'une vague dépassent ce produit, elle passe quelle que soit la façon de jouer.
 */
export function pressureReport(c: ContentPack, chapterIndex: number): string {
  const ch = allChapterStats(c)[chapterIndex];
  if (!ch) return "";
  const slots = ch.slotCount;
  // Référence : tous les emplacements occupés par des archeries de niveau max.
  const refDps = slots * towerDps(c, "tower_archer", c.towers.tower_archer!.levels.length);
  const rows = ch.waves.map(w => {
    const slowest = w.enemyIds.reduce((a, id) => {
      const s = traversalSeconds(c, chapterIndex, 0, id);
      return Math.max(a, s);
    }, 0);
    const budget = refDps * slowest;
    return [
      `v${w.index + 1}`,
      String(w.count),
      String(Math.round(w.totalHp)),
      pct(w.flyingHpShare),
      String(Math.round(slowest)),
      String(Math.round(budget)),
      budget === 0 ? "—" : `${(w.totalHp / budget).toFixed(2)}`,
      String(w.gold),
      String(w.castleDamage),
    ];
  });
  return [
    section(`PRESSION — chapitre ${chapterIndex + 1} : ${ch.name}`),
    `  Référence : ${slots} emplacements × archerie niveau max = ${Math.round(refDps)} DPS.`,
    `  « Charge » = PV de la vague / dégâts infligeables pendant la traversée.`,
    `  > 1.00 = la vague passe même en jouant parfaitement.`,
    "",
    table(["Vague", "Nb", "PV", "% vol", "Traversée", "Budget dég.", "Charge", "Or", "Risque châ."], rows),
  ].join("\n");
}

// ---------- Méta ----------

export function economyReport(c: ContentPack, unlocks: UnlockDef[], blockSecondsPerRun = 35): string {
  const h = economyHealth(c, unlocks, blockSecondsPerRun);
  const rows = h.shardsPerChapter.map((s, i) => [
    `${i + 1}. ${c.chapters[i]?.name ?? "?"}`,
    String(s),
    `×${(s / (h.firstChapterShards || 1)).toFixed(2)}`,
  ]);
  const verdict: string[] = [];
  if (h.runsToBuyUnlocks <= 3) {
    verdict.push(`  ⚠ Armurerie vidée en ${h.runsToBuyUnlocks} run(s) pour ${h.chapterCount} chapitres.`);
  }
  if (h.lastVsFirstRatio < 1.5) {
    verdict.push(`  ⚠ Le dernier chapitre ne rapporte que ×${h.lastVsFirstRatio.toFixed(2)} le premier : rejouer le plus facile est optimal.`);
  }
  if (h.runsToMaxSkills <= 3) {
    verdict.push(`  ⚠ Sorts du héros maxés en ${h.runsToMaxSkills} run(s).`);
  }
  return [
    section("MÉTA-PROGRESSION"),
    table(["Chapitre", "Éclats (parfait)", "vs ch.1"], rows),
    "",
    `  Puits — armurerie : ${h.sinks.unlocks} Éclats · forge : ${h.sinks.forge} · total : ${h.sinks.totalShards}`,
    `  Puits — sorts : ${h.sinks.totalSceaux} Sceaux`,
    "",
    `  Runs (ch.1 parfait) pour vider l'armurerie : ${h.runsToBuyUnlocks}`,
    `  Runs pour épuiser TOUT le puits d'Éclats : ${h.runsToDrainShards}`,
    `  Runs pour maxer les sorts (${blockSecondsPerRun}s de blocage/run) : ${h.runsToMaxSkills}`,
    ...(verdict.length ? ["", ...verdict] : ["", "  ✓ Aucune saturation détectée."]),
  ].join("\n");
}

// ---------- Autoplay ----------

export function autoplayReport(reports: AutoplayReport[]): string {
  const rows = reports.map(r => [
    `${r.chapterIndex + 1}`,
    r.policy,
    r.result.victory ? "VICTOIRE" : "défaite",
    `${r.result.wavesCleared}/${r.waveCount}`,
    String(r.result.castleHpLeft),
    r.firstLeakWave === null ? "—" : `v${r.firstLeakWave + 1}`,
    String(r.result.stars),
    String(r.result.kills),
    String(r.result.shards),
    `${r.result.sceaux} (${Math.round(r.result.heroBlockSeconds)}s)`,
    String(r.goldLeftover),
    r.waves.some(w => w.stalled) ? "BLOQUÉ" : "",
  ]);
  return [
    section("AUTOPLAY (joueur artificiel — étalon reproductible, pas un joueur optimal)"),
    table(["Ch.", "Politique", "Issue", "Vagues", "PV châ.", "1re fuite", "★", "Kills", "Éclats", "Sceaux", "Or restant", ""], rows),
  ].join("\n");
}

/**
 * Y a-t-il une DÉCISION à prendre en choisissant ses tours ? Chaque composition
 * rejoue tous les chapitres ; si une défense mono-tour égale ou dépasse un mélange,
 * il n'y a pas de triangle de rôles — seulement une tour dominante et deux pièges.
 *
 * C'est le préalable à tout ajout d'ennemi « anti-X » : un ennemi ne crée de la
 * stratégie que si la tour censée le contrer vaut la peine d'être construite.
 */
export function compositionReport(c: ContentPack, useHero = true): string {
  const unlocked = { unlocks: Object.values(c.towers).flatMap(t => (t.requiresUnlock ? [t.requiresUnlock] : [])) };
  const ids = Object.keys(c.towers);
  const compos: { name: string; towers: string[] }[] = [
    ...ids.map(id => ({ name: `${c.towers[id]!.name} seule`, towers: [id] })),
    { name: "toutes (mélange)", towers: ids },
  ];
  const rows = compos.map(({ name, towers }) => {
    const rs = autoplayAll(c, { policy: "spread", towers, useHero, profile: unlocked });
    return [
      name,
      `${rs.filter(r => r.result.victory).length}/${rs.length}`,
      String(rs.reduce((a, r) => a + r.result.castleHpLeft, 0)),
      String(rs.reduce((a, r) => a + r.result.stars, 0)),
      String(rs.reduce((a, r) => a + r.result.shards, 0)),
    ];
  });
  return [
    section("COMPOSITIONS — le choix de tour change-t-il quelque chose ?"),
    "  Une tour seule qui égale le mélange = pas de triangle de rôles, juste une tour dominante.",
    "",
    table(["Composition", "Victoires", "PV château cumulés", "Étoiles", "Éclats"], rows),
  ].join("\n");
}

/** Détail vague par vague d'un run — pour comprendre POURQUOI un chapitre casse. */
export function waveTraceReport(r: AutoplayReport): string {
  const rows = r.waves.map(w => [
    `v${w.wave + 1}`,
    String(w.towers),
    String(w.towerLevels),
    String(w.goldBefore),
    String(w.castleHpBefore),
    String(w.castleHpAfter),
    w.castleHpAfter < w.castleHpBefore ? `-${w.castleHpBefore - w.castleHpAfter}` : "—",
    num(w.seconds),
    w.stalled ? "BLOQUÉ" : "",
  ]);
  return [
    section(`TRACE — chapitre ${r.chapterIndex + 1} (politique « ${r.policy} », héros ${r.useHero ? "actif" : "inactif"})`),
    table(["Vague", "Tours", "Σ niv.", "Or", "PV avant", "PV après", "Fuite", "Durée", ""], rows),
  ].join("\n");
}
