// ============================================================
// meta/save.ts — Persistence du profil derrière SaveAdapter (ADR-002).
// v0 : localStorage. Le swap futur (cloud) ne touche que ce fichier.
// Migration champ par champ : un vieux profil (sans sceaux/forge/skills)
// est complété avec les défauts, jamais jeté.
// ============================================================

import { DEFAULT_AUDIO_SETTINGS } from "../core/types";
import type { AudioSettings, Profile } from "../core/types";

const KEY: string = "tdrpg_profile_v1";

export interface SaveAdapter {
  load(): Profile;
  save(p: Profile): void;
}

function freshProfile(): Profile {
  return {
    shards: 0,
    sceaux: 0,
    introSeen: false,
    chaptersWon: [],
    chapterStars: {},
    bestiary: [],
    unlocks: [],
    forge: {},
    skills: { whirlwind: 1, rally: 1 },
    bestRuns: [],
    // Copie : DEFAULT_AUDIO_SETTINGS est un objet partagé, un profil doit avoir le sien
    // (sinon toggleAudioFlag muterait la constante pour tous les profils neufs suivants).
    audio: { ...DEFAULT_AUDIO_SETTINGS },
  };
}

/** Complète un profil partiel/ancien avec les défauts, champ par champ. */
function normalize(parsed: Partial<Profile>): Profile {
  const fresh: Profile = freshProfile();
  return {
    shards: typeof parsed.shards === "number" ? parsed.shards : fresh.shards,
    sceaux: typeof parsed.sceaux === "number" ? parsed.sceaux : fresh.sceaux,
    introSeen: typeof parsed.introSeen === "boolean" ? parsed.introSeen : fresh.introSeen,
    // Migration : les vieux profils n'ont pas chaptersWon — une victoire archivée = chapitre 1 conquis
    chaptersWon: Array.isArray(parsed.chaptersWon)
      ? parsed.chaptersWon
      : (Array.isArray(parsed.bestRuns) && parsed.bestRuns.some(r => r.victory) ? [0] : []),
    bestiary: Array.isArray(parsed.bestiary) ? parsed.bestiary : fresh.bestiary,
    chapterStars: parsed.chapterStars && typeof parsed.chapterStars === "object" ? parsed.chapterStars : fresh.chapterStars,
    unlocks: Array.isArray(parsed.unlocks) ? parsed.unlocks : fresh.unlocks,
    forge: parsed.forge && typeof parsed.forge === "object" ? parsed.forge : fresh.forge,
    skills: {
      whirlwind: typeof parsed.skills?.whirlwind === "number" ? parsed.skills.whirlwind : 1,
      rally: typeof parsed.skills?.rally === "number" ? parsed.skills.rally : 1,
    },
    bestRuns: Array.isArray(parsed.bestRuns) ? parsed.bestRuns : fresh.bestRuns,
    audio: normalizeAudio(parsed.audio),
  };
}

/** Champ par champ, comme le reste du profil : un vieux client qui n'a écrit
 *  qu'une partie de `AudioSettings` (ou aucune) ne perd que ce qu'il n'avait pas. */
function normalizeAudio(parsed: Partial<AudioSettings> | undefined): AudioSettings {
  const fresh: AudioSettings = DEFAULT_AUDIO_SETTINGS;
  return {
    master: typeof parsed?.master === "boolean" ? parsed.master : fresh.master,
    music: typeof parsed?.music === "boolean" ? parsed.music : fresh.music,
    notifications: typeof parsed?.notifications === "boolean" ? parsed.notifications : fresh.notifications,
    damage: typeof parsed?.damage === "boolean" ? parsed.damage : fresh.damage,
    volume: typeof parsed?.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : fresh.volume,
  };
}

export class LocalStorageSaveAdapter implements SaveAdapter {
  load(): Profile {
    try {
      const raw: string | null = localStorage.getItem(KEY);
      if (!raw) return freshProfile();
      return normalize(JSON.parse(raw) as Partial<Profile>);
    } catch {
      return freshProfile();
    }
  }
  save(p: Profile): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      // Stockage indisponible (navigation privée iOS, quota) : on joue en session seulement.
    }
  }
}
