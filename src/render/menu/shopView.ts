// ============================================================
// render/menu/shopView.ts — Armurerie (Arsenal / Forge / Héros).
// Voir ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CONTENT, UNLOCKS } from "../../content/index";
import type { Profile, RallyLevel, SkillTrack, WhirlwindLevel } from "../../core/types";
import type { SkillId } from "../../meta/profile";
import { playSfx } from "../platform/audio";
import { layoutCursor, type LayoutCursor, type UiScrollList } from "../components";
import { header, row, scrollArea, tabs } from "./helpers";
import { CX, DIM, GOLD, OK, SCEAU, TXT } from "./theme";
import type { MenuCtx, ShopTab } from "./types";

export function buildShop(ctx: MenuCtx, shopTab: ShopTab, onTabChange: (t: ShopTab) => void): void {
  const top: number = header(ctx, "Armurerie");
  const tabsY: number = tabs(ctx, top, [
    { id: "arsenal" as ShopTab, label: "Arsenal" },
    { id: "forge" as ShopTab, label: "Forge" },
    { id: "hero" as ShopTab, label: "Héros" },
  ], shopTab, onTabChange);

  const scroll: UiScrollList = scrollArea(ctx, tabsY);
  const cursor: LayoutCursor = layoutCursor(0);
  if (shopTab === "arsenal") buildArsenalRows(ctx, cursor, scroll.content);
  else if (shopTab === "forge") buildForgeRows(ctx, cursor, scroll.content);
  else buildHeroRows(ctx, cursor, scroll.content);
  scroll.setContentHeight(cursor.y);
}

function buildArsenalRows(ctx: MenuCtx, cursor: LayoutCursor, c: Phaser.GameObjects.Container): void {
  const p: Profile = ctx.profileSvc.get();
  UNLOCKS.forEach((u) => {
    const owned: boolean = p.unlocks.includes(u.id);
    // « Inabordable » : cadre atténué et coût en rouge tant que les Éclats manquent
    // (état prévu au GDD, jamais rendu jusqu'ici).
    const affordable: boolean = p.shards >= u.cost;
    row(ctx, cursor, c, u.name, u.desc,
      owned ? "Acquis" : `${u.cost} ◆`,
      owned ? OK : affordable ? GOLD : "#e74c3c",
      owned || !affordable ? null : () => { if (ctx.profileSvc.buy(u.id)) { playSfx(ctx.scene, "purchase"); ctx.refreshCurrencies(); ctx.navigate("shop"); } },
      owned ? "done" : affordable ? "normal" : "unaffordable");
  });
}

function buildForgeRows(ctx: MenuCtx, cursor: LayoutCursor, c: Phaser.GameObjects.Container): void {
  const prof: Profile = ctx.profileSvc.get();
  const unlocks: string[] = prof.unlocks;
  const pct: number = Math.round(CONTENT.forge.damageMultPerLevel * 100);
  const maxLvl: number = CONTENT.forge.upgradeCosts.length;
  Object.values(CONTENT.towers).forEach((t) => {
    const locked: boolean = t.requiresUnlock !== null && !unlocks.includes(t.requiresUnlock);
    const lvl: number = ctx.profileSvc.forgeLevel(t.id);
    const cost: number | null = ctx.profileSvc.forgeNextCost(t.id);
    const stars: string = "★".repeat(lvl) + "☆".repeat(maxLvl - lvl);
    if (locked) {
      row(ctx, cursor, c, `${t.name}  ${stars}`, "Débloquez d'abord cette tour (Arsenal).", "Verrouillé", DIM, null, "locked");
    } else if (cost === null) {
      row(ctx, cursor, c, `${t.name}  ${stars}`, `+${pct}% dégâts par niveau — niveau maximum atteint.`, "Max", OK, null, "done");
    } else {
      const affordable: boolean = prof.shards >= cost;
      row(ctx, cursor, c, `${t.name}  ${stars}`, `+${pct}% dégâts permanents par niveau (actuel : +${lvl * pct}%).`,
        `${cost} ◆`, affordable ? GOLD : "#e74c3c",
        affordable ? () => { if (ctx.profileSvc.buyForge(t.id)) { playSfx(ctx.scene, "purchase"); ctx.refreshCurrencies(); ctx.navigate("shop"); } } : null,
        affordable ? "normal" : "unaffordable");
    }
  });
}

function buildHeroRows(ctx: MenuCtx, cursor: LayoutCursor, c: Phaser.GameObjects.Container): void {
  // Dit ce qui est RÉELLEMENT récompensé (ADR-021) : le temps passé à retenir la
  // horde, et non les kills — sinon le joueur optimise la mauvaise chose.
  c.add(ctx.scene.add.text(CX, cursor.next(26), `${CONTENT.hero.name} — les Sceaux ⚜ se gagnent en retenant la horde au corps à corps`,
    { fontSize: "13px", color: DIM, ...TXT }).setOrigin(0.5));

  const skills: { id: SkillId; name: string; desc: (lvl: number) => string }[] = [
    {
      id: "whirlwind", name: "Tournoiement",
      desc: lvl => {
        const s: WhirlwindLevel = CONTENT.hero.skills.whirlwind.levels[lvl - 1]!;
        return `AoE au contact : ${s.damage} dégâts, rayon ${s.radius}, recharge ${s.cooldownS}s.`;
      },
    },
    {
      id: "rally", name: "Ralliement",
      desc: lvl => {
        const s: RallyLevel = CONTENT.hero.skills.rally.levels[lvl - 1]!;
        return `Cadence des tours proches ×${s.fireRateMult} pendant ${s.durationS}s, recharge ${s.cooldownS}s.`;
      },
    },
  ];

  skills.forEach((sk) => {
    const def: SkillTrack<WhirlwindLevel> | SkillTrack<RallyLevel> = CONTENT.hero.skills[sk.id];
    const lvl: number = ctx.profileSvc.skillLevel(sk.id);
    const cost: number | null = ctx.profileSvc.skillNextCost(sk.id);
    const title: string = `${sk.name} — niv. ${lvl}/${def.levels.length}`;
    if (cost === null) {
      row(ctx, cursor, c, title, sk.desc(lvl), "Max", OK, null, "done");
    } else {
      const affordable: boolean = ctx.profileSvc.get().sceaux >= cost;
      row(ctx, cursor, c, title, sk.desc(lvl), `${cost} ⚜`, affordable ? SCEAU : "#e74c3c",
        affordable ? () => { if (ctx.profileSvc.buySkill(sk.id)) { playSfx(ctx.scene, "purchase"); ctx.refreshCurrencies(); ctx.navigate("shop"); } } : null,
        affordable ? "normal" : "unaffordable");
    }
  });

  // Teaser : second héros (GDD : roster v1)
  row(ctx, cursor, c, "???", "Un nouveau héros rejoindra bientôt le campement…", "Bientôt", DIM, null, "locked");
}
