// Tests de persistence : migration des vieux profils, corruption, indispo localStorage (ADR-002).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageSaveAdapter } from "./save";
import type { AudioSettings, Profile } from "../core/types";

const FRESH_AUDIO: AudioSettings = { master: true, music: true, notifications: true, damage: true, volume: 0.8 };

const KEY: string = "tdrpg_profile_v1";

function mockStorage(initial: Record<string, string> = {}) {
  const store: Map<string, string> = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
  return store;
}

describe("LocalStorageSaveAdapter", () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it("sans sauvegarde : profil neuf complet", () => {
    mockStorage();
    const p: Profile = new LocalStorageSaveAdapter().load();
    expect(p).toEqual({
      shards: 0, sceaux: 0, introSeen: false, chaptersWon: [], chapterStars: {}, bestiary: [],
      unlocks: [], forge: {}, skills: { whirlwind: 1, rally: 1 }, bestRuns: [], audio: FRESH_AUDIO,
    });
  });

  it("migre un vieux profil partiel champ par champ, sans jeter les données", () => {
    mockStorage({ [KEY]: JSON.stringify({ shards: 42, unlocks: ["tower_frost"] }) });
    const p: Profile = new LocalStorageSaveAdapter().load();
    expect(p.shards).toBe(42);
    expect(p.unlocks).toEqual(["tower_frost"]);
    expect(p.sceaux).toBe(0);
    expect(p.skills).toEqual({ whirlwind: 1, rally: 1 });
    expect(p.bestiary).toEqual([]);
  });

  it("migration chaptersWon : une victoire archivée vaut chapitre 1 conquis", () => {
    mockStorage({
      [KEY]: JSON.stringify({
        shards: 0,
        bestRuns: [{ waves: 10, kills: 50, victory: true, shards: 60, dateISO: "2026-01-01T00:00:00Z" }],
      }),
    });
    expect(new LocalStorageSaveAdapter().load().chaptersWon).toEqual([0]);
  });

  it("migration audio : absent d'un vieux profil ⇒ tout actif, volume 0.8", () => {
    mockStorage({ [KEY]: JSON.stringify({ shards: 5 }) });
    expect(new LocalStorageSaveAdapter().load().audio).toEqual(FRESH_AUDIO);
  });

  it("migration audio : profil partiel (une seule catégorie écrite) complété champ par champ", () => {
    mockStorage({ [KEY]: JSON.stringify({ shards: 5, audio: { damage: false } }) });
    expect(new LocalStorageSaveAdapter().load().audio).toEqual({ ...FRESH_AUDIO, damage: false });
  });

  it("migration audio : volume hors bornes dans une vieille sauvegarde, reclampé", () => {
    mockStorage({ [KEY]: JSON.stringify({ audio: { volume: 4.2 } }) });
    expect(new LocalStorageSaveAdapter().load().audio.volume).toBe(1);
    mockStorage({ [KEY]: JSON.stringify({ audio: { volume: -1 } }) });
    expect(new LocalStorageSaveAdapter().load().audio.volume).toBe(0);
  });

  it("JSON corrompu : repart sur un profil neuf sans crasher", () => {
    mockStorage({ [KEY]: "{pas du json###" });
    expect(new LocalStorageSaveAdapter().load().shards).toBe(0);
  });

  it("localStorage indisponible (navigation privée iOS) : fail-safe, jamais de crash", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("QuotaExceededError"); },
    });
    const adapter: LocalStorageSaveAdapter = new LocalStorageSaveAdapter();
    expect(adapter.load().shards).toBe(0);
    expect(() => adapter.save(adapter.load())).not.toThrow();
  });
});
