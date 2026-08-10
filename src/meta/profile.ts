// ============================================================
// meta/profile.ts — Logique méta : gains de fin de run (Éclats, Sceaux,
// meilleurs runs), achats d'unlocks, de forge et de niveaux de sorts.
// ============================================================

import type { Profile, RunResult } from "../core/types";
import { CONTENT, UNLOCKS } from "../content/index";
import type { SaveAdapter } from "./save";

const BEST_RUNS_KEPT = 5;

export type SkillId = "whirlwind" | "rally";

export class ProfileService {
  private profile: Profile;
  constructor(private adapter: SaveAdapter) {
    this.profile = adapter.load();
  }
  get(): Profile { return this.profile; }

  markIntroSeen(): void {
    if (this.profile.introSeen) return;
    this.profile.introSeen = true;
    this.adapter.save(this.profile);
  }

  chapterWon(chapterIndex: number): boolean {
    return this.profile.chaptersWon.includes(chapterIndex);
  }

  /** Meilleure note du chapitre (0 = jamais conquis). */
  chapterStarsOf(chapterIndex: number): number {
    return this.profile.chapterStars[chapterIndex] ?? 0;
  }

  /** L'Histoire est achevée quand le dernier chapitre est conquis (déblocage séquentiel ⇒ tous le sont). */
  storyCompleted(): boolean {
    return this.chapterWon(CONTENT.chapters.length - 1);
  }

  applyRunResult(r: RunResult, chapterIndex: number): void {
    this.profile.shards += r.shards;
    this.profile.sceaux += r.sceaux;
    if (r.victory && !this.profile.chaptersWon.includes(chapterIndex)) {
      this.profile.chaptersWon.push(chapterIndex);
    }
    if (r.stars > (this.profile.chapterStars[chapterIndex] ?? 0)) {
      this.profile.chapterStars[chapterIndex] = r.stars; // on garde la meilleure note
    }
    for (const id of r.seenEnemies) {
      if (!this.profile.bestiary.includes(id)) this.profile.bestiary.push(id);
    }
    this.profile.bestRuns.push({
      waves: r.wavesCleared, kills: r.kills, victory: r.victory,
      shards: r.shards, dateISO: new Date().toISOString(), chapter: chapterIndex,
    });
    this.profile.bestRuns.sort((a, b) => b.waves - a.waves || b.kills - a.kills);
    this.profile.bestRuns = this.profile.bestRuns.slice(0, BEST_RUNS_KEPT);
    this.adapter.save(this.profile);
  }

  // ---------- Unlocks (Éclats) ----------

  canBuy(unlockId: string): boolean {
    const def = UNLOCKS.find(u => u.id === unlockId);
    if (!def) return false;
    return !this.profile.unlocks.includes(unlockId) && this.profile.shards >= def.cost;
  }

  buy(unlockId: string): boolean {
    if (!this.canBuy(unlockId)) return false;
    const def = UNLOCKS.find(u => u.id === unlockId)!;
    this.profile.shards -= def.cost;
    this.profile.unlocks.push(unlockId);
    this.adapter.save(this.profile);
    return true;
  }

  // ---------- Forge (Éclats) : bonus de dégâts permanent par tour ----------

  forgeLevel(towerId: string): number { return this.profile.forge[towerId] ?? 0; }

  /** Coût du prochain niveau de forge, ou null si niveau max atteint. */
  forgeNextCost(towerId: string): number | null {
    return CONTENT.forge.upgradeCosts[this.forgeLevel(towerId)] ?? null;
  }

  buyForge(towerId: string): boolean {
    if (!CONTENT.towers[towerId]) return false;
    const cost = this.forgeNextCost(towerId);
    if (cost === null || this.profile.shards < cost) return false;
    this.profile.shards -= cost;
    this.profile.forge[towerId] = this.forgeLevel(towerId) + 1;
    this.adapter.save(this.profile);
    return true;
  }

  // ---------- Sorts du héros (Sceaux) ----------

  skillLevel(skill: SkillId): number { return this.profile.skills[skill]; }

  /** Coût du prochain niveau de sort, ou null si niveau max atteint. */
  skillNextCost(skill: SkillId): number | null {
    return CONTENT.hero.skills[skill].upgradeCosts[this.skillLevel(skill) - 1] ?? null;
  }

  buySkill(skill: SkillId): boolean {
    const def = CONTENT.hero.skills[skill];
    const lvl = this.skillLevel(skill);
    if (lvl >= def.levels.length) return false;
    const cost = this.skillNextCost(skill);
    if (cost === null || this.profile.sceaux < cost) return false;
    this.profile.sceaux -= cost;
    this.profile.skills[skill] = lvl + 1;
    this.adapter.save(this.profile);
    return true;
  }
}
