// Garantit que le registre SFX couvre tout le contenu (ADR-005/037) et que le
// routage par catégorie/master est correct (ADR-038) — sans scène Phaser,
// `sfxEnabled` est un cœur pur.
import { describe, expect, it } from "vitest";
import type { AudioSettings } from "../../core/types";
import { CONTENT } from "../../content/index";
import { SFX, musicEnabled, sfxEnabled, shotSfx, type SfxKey } from "./audio";

const ALL_ON: AudioSettings = { master: true, music: true, notifications: true, damage: true, volume: 0.8 };

describe("registre SFX (audio.ts)", () => {
  it("mappe chaque tour de CONTENT vers un tir SFX valide", () => {
    for (const defId of Object.keys(CONTENT.towers)) {
      const key: SfxKey = shotSfx(defId);
      expect(SFX).toHaveProperty(key);
    }
  });

  it("lève sur une tour inconnue (détecte un tir oublié)", () => {
    expect(() => shotSfx("inconnu")).toThrow();
  });

  it("associe une clé de son distincte à chaque rôle", () => {
    const keys: string[] = Object.values(SFX);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^sfx_[a-z]+(?:_[a-z]+)*$/);
  });
});

describe("routage par catégorie/master (ADR-038)", () => {
  it("tout actif ⇒ tout joue", () => {
    for (const key of Object.keys(SFX) as SfxKey[]) expect(sfxEnabled(ALL_ON, key)).toBe(true);
  });

  it("master coupe TOUT, même une catégorie individuellement active", () => {
    const s: AudioSettings = { ...ALL_ON, master: false };
    for (const key of Object.keys(SFX) as SfxKey[]) expect(sfxEnabled(s, key)).toBe(false);
  });

  it("couper « dégâts » n'affecte pas le clic UI (catégorie « notifications »)", () => {
    const s: AudioSettings = { ...ALL_ON, damage: false };
    expect(sfxEnabled(s, "shotArcher")).toBe(false);
    expect(sfxEnabled(s, "castleHit")).toBe(false);
    expect(sfxEnabled(s, "uiClick")).toBe(true);
  });

  it("couper « notifications » n'affecte pas les SFX de dégâts", () => {
    const s: AudioSettings = { ...ALL_ON, notifications: false };
    expect(sfxEnabled(s, "uiClick")).toBe(false);
    expect(sfxEnabled(s, "purchase")).toBe(false);
    expect(sfxEnabled(s, "bestiaryOpen")).toBe(false);
    expect(sfxEnabled(s, "chroniclesOpen")).toBe(false);
    expect(sfxEnabled(s, "enemyDied")).toBe(true);
  });

  it("chaque SFX de dégâts (tirs/impacts/morts) est catégorisé « dégâts »", () => {
    // Garde-fou : un nouveau SFX de gameplay ajouté sans entrée dans CATEGORY_BY_KEY
    // tomberait dans TypeScript en erreur de compilation (Record exhaustif) — ce test
    // documente l'attente pour les rôles de COMBAT. Les rôles d'UI/navigation
    // (uiClick, purchase, bestiaryOpen, chroniclesOpen) sont volontairement exclus :
    // « notifications », pas « dégâts » (ADR-042).
    const s: AudioSettings = { ...ALL_ON, damage: false, notifications: true };
    const notificationKeys: SfxKey[] = ["uiClick", "purchase", "bestiaryOpen", "chroniclesOpen", "victory", "defeat"];
    const damageKeys: SfxKey[] = (Object.keys(SFX) as SfxKey[]).filter(k => !notificationKeys.includes(k));
    for (const key of damageKeys) expect(sfxEnabled(s, key)).toBe(false);
  });
});

describe("musique de menu (ADR-039)", () => {
  it("active seulement si master ET musique sont actifs", () => {
    expect(musicEnabled(ALL_ON)).toBe(true);
    expect(musicEnabled({ ...ALL_ON, master: false })).toBe(false);
    expect(musicEnabled({ ...ALL_ON, music: false })).toBe(false);
    expect(musicEnabled({ ...ALL_ON, master: false, music: false })).toBe(false);
  });

  it("indépendante des catégories notifications/dégâts", () => {
    expect(musicEnabled({ ...ALL_ON, notifications: false, damage: false })).toBe(true);
  });
});
