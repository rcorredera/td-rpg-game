// ============================================================
// render/menu/bestiaryView.ts — Bestiaire (créatures + défenses),
// découverte progressive. Voir ADR-016, ADR-022, ADR-034.
// ============================================================

import type Phaser from "phaser";
import type { EnemyDef, TowerDef, TowerLevelStats } from "../../core/types";
import { CONTENT } from "../../content/index";
import { enemyView, portraitFrame, towerView } from "../assets/sprites";
import { layoutCursor, type LayoutCursor, type UiScrollList } from "../components";
import { header, lorePage, scrollArea, tabs } from "./helpers";
import { CX, DIM, GOLD, LIGHT, TXT } from "./theme";
import type { BestiaryTab, MenuCtx } from "./types";

export function buildBestiary(ctx: MenuCtx, bestiaryTab: BestiaryTab, onTabChange: (t: BestiaryTab) => void): void {
  const top: number = header(ctx, "Bestiaire");
  const tabsY: number = tabs(ctx, top, [
    { id: "creatures" as BestiaryTab, label: "Créatures" },
    { id: "defenses" as BestiaryTab, label: "Défenses" },
  ], bestiaryTab, onTabChange);

  // Liste défilante : le Bestiaire grandit à chaque créature ajoutée, il ne peut
  // plus dépendre de ce qui « tient » dans 600 px (ADR-013).
  const scroll: UiScrollList = scrollArea(ctx, tabsY);
  const c: Phaser.GameObjects.Container = scroll.content;
  const cursor: LayoutCursor = layoutCursor(0);

  if (bestiaryTab === "defenses") { buildDefensePages(ctx, cursor, c, scroll); return; }

  const seen: string[] = ctx.profileSvc.get().bestiary;
  const enemies: EnemyDef[] = Object.values(CONTENT.enemies);
  enemies.forEach((e) => {
    const known: boolean = seen.includes(e.id);
    if (!known) {
      lorePage(ctx, cursor, c, [
        { text: "???", size: 17, color: DIM },
        { text: "Croisez cette créature au combat pour compléter sa page.", size: 12, color: DIM, wrap: 560 },
      ], 0x4a3f2e, 0x221b12, { key: enemyView(e.id).key, known: false, frame: portraitFrame(e.id) });
      return;
    }
    const stats: string = [
      `❤ ${e.hp} PV`, `Vitesse ${e.speed}`, `◆ ${e.goldReward}`,
      `Base -${e.damageToCastle} PV`, e.meleeDps > 0 ? `⚔ ${e.meleeDps}/s` : "⚔ inoffensif au contact",
    ].join("    ");
    // Traits accolés au nom, comme « volant ». Ce sont eux qui dictent la réponse :
    // un Bestiaire qui les tait laisse le joueur découvrir sur le tas qu'une tour
    // ne sert à rien contre cette créature — et « connaître l'ennemi » est sa
    // promesse (ADR-022).
    const traits: string[] = [
      e.flying ? "volant" : "",
      e.armor ? `cuirassé ${e.armor}` : "",
      e.slowImmune ? "insensible au froid" : "",
    ].filter(Boolean);
    lorePage(ctx, cursor, c, [
      { text: `${e.name}${traits.length ? `  ·  ${traits.join("  ·  ")}` : ""}`, size: 17, color: GOLD },
      { text: e.lore, size: 11, color: DIM, wrap: 560 },
      { text: stats, size: 12, color: LIGHT, wrap: 560 },
    ], 0xc9a227, 0x2b2118, { key: enemyView(e.id).key, known: true, frame: portraitFrame(e.id) });
  });
  c.add(ctx.scene.add.text(CX, cursor.next(28) - 6,
    "Les mini-boss sont des variantes renforcées des créatures connues.",
    { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5));
  scroll.setContentHeight(cursor.y);
}

/** Onglet Défenses : explique le rôle et les différences de chaque tour. */
function buildDefensePages(ctx: MenuCtx, cursor: LayoutCursor, c: Phaser.GameObjects.Container, scroll: UiScrollList): void {
  const towers: TowerDef[] = Object.values(CONTENT.towers);
  towers.forEach((t) => {
    const locked: boolean = t.requiresUnlock !== null && !ctx.profileSvc.get().unlocks.includes(t.requiresUnlock);
    // Rôle tactique : LA ligne qui différencie les tours
    const role: string = t.splashRadius > 0 ? `Dégâts de zone (rayon ${t.splashRadius})` : "Monocible";
    const target: string = t.groundOnly ? "⚠ ne touche PAS les volants" : "vise sol et volants";
    const slow: string = t.slow ? ` · ralentit (vitesse ×${t.slow.factor} pendant ${t.slow.duration}s)` : "";
    const l1: TowerLevelStats = t.levels[0]!, l3: TowerLevelStats = t.levels[t.levels.length - 1]!;
    lorePage(ctx, cursor, c, [
      { text: `${t.name}${locked ? "  (verrouillée — Arsenal)" : ""}`, size: 17, color: locked ? DIM : GOLD },
      { text: t.lore, size: 11, color: DIM, wrap: 560 },
      { text: `${role} · ${target}${slow}`, size: 12, color: t.groundOnly ? "#e8a87c" : LIGHT, wrap: 560 },
      { text: `⚔ ${l1.damage}→${l3.damage}   ⊙ ${l1.range}→${l3.range}   ${l1.fireRate}→${l3.fireRate} tir/s   coûts ${t.costs.join(" / ")} ◆`, size: 12, color: LIGHT, wrap: 560 },
    ], locked ? 0x6b5a3e : 0xc9a227, 0x2b2118, { key: towerView(t.id).base.key, known: !locked });
  });
  c.add(ctx.scene.add.text(CX, cursor.next(30) - 6,
    "Le héros bloque et frappe les ennemis terrestres ; les volants l'ignorent — prévoyez l'Archerie.",
    { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5));
  scroll.setContentHeight(cursor.y);
}
