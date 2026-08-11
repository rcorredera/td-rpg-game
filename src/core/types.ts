// ============================================================
// core/types.ts — Types de la simulation. Zéro dépendance UI.
// ============================================================

export type Vec2 = { x: number; y: number };

// ---------- Content (données pures, voir src/content/) ----------

export interface TowerDef {
  id: string;
  name: string;
  /** 1-2 lignes de lore, affichées dans le Bestiaire (onglet Défenses). */
  lore: string;
  /** Coût de construction puis coût de chaque upgrade (index = niveau visé - 1). */
  costs: number[];
  /** Stats par niveau (index = niveau - 1). */
  levels: TowerLevelStats[];
  /** Si true, ne peut pas cibler les volants (ex: catapulte). */
  groundOnly: boolean;
  /** AoE en pixels (0 = monocible). */
  splashRadius: number;
  /** Ralentissement appliqué (0..1) et durée en s. */
  slow?: { factor: number; duration: number };
  /** Unlock méta requis (null = dispo de base). */
  requiresUnlock: string | null;
  /** Spécialisations au-delà du niveau max : choix exclusif et définitif (GDD §Spécialisations). */
  specs?: TowerSpecDef[];
}

export interface TowerSpecDef {
  id: string;
  name: string;
  /** Pitch court, affiché dans le menu de choix. */
  desc: string;
  /** Coût en or (in-run). */
  cost: number;
  /** Stats de la tour spécialisée (remplacent celles du niveau max). */
  stats: TowerLevelStats;
  /** Cibles simultanées (défaut 1). */
  multishot?: number;
  /** Brûlure infligée aux cibles touchées : % des PV max par seconde, pendant durationS. */
  burn?: { pctMaxHpPerS: number; durationS: number };
  /** Aura de givre continue dans le rayon — la tour ne tire plus. */
  aura?: { radius: number; slowFactor: number };
  /** Override de l'AoE de base (undefined = hérite). */
  splashRadius?: number;
  /** Override du slow de base (undefined = hérite, null = retiré). */
  slow?: { factor: number; duration: number } | null;
}

export interface TowerLevelStats {
  range: number;
  damage: number;
  /** Tirs par seconde. */
  fireRate: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** 1-3 lignes de lore, affichées dans le Bestiaire une fois la créature croisée. */
  lore: string;
  hp: number;          // PV de base, scalé par vague
  speed: number;       // px/s
  flying: boolean;
  goldReward: number;  // or fixe (GDD : pas de dégressif en v0)
  damageToCastle: number;
  /** Dégâts au héros par seconde quand bloqué. */
  meleeDps: number;
}

export interface WaveSpawn {
  enemyId: string;
  count: number;
  intervalS: number;
  delayS: number;
  /** Chemin d'arrivée (index dans MapDef.paths). Défaut : 0. */
  pathIndex?: number;
}
export interface WaveDef { spawns: WaveSpawn[]; miniBoss?: { enemyId: string; hpMult: number } }

export interface WhirlwindLevel { damage: number; radius: number; cooldownS: number }
export interface RallyLevel { fireRateMult: number; radius: number; durationS: number; cooldownS: number }

export interface HeroDef {
  name: string;
  hp: number;
  speed: number;
  meleeDps: number;
  meleeRange: number;
  respawnS: number;
  /** Sorts à niveaux : upgradeCosts[i] = coût (Sceaux) du passage au niveau i+2. */
  skills: {
    whirlwind: { levels: WhirlwindLevel[]; upgradeCosts: number[] };
    rally: { levels: RallyLevel[]; upgradeCosts: number[] };
  };
}

/** Champ de bataille en coordonnées logiques : l'espace où vivent cartes, tours,
 *  ennemis et héros. Source unique — `render/viewport.ts` et `GameScene` s'y réfèrent
 *  au lieu de redéclarer 800×600 chacun de leur côté. Ce n'est pas de l'équilibrage
 *  (ADR-003) mais la définition du repère : les waypoints et slots du content y sont
 *  exprimés. Toute entité pilotée par le joueur y est confinée. */
export const BATTLEFIELD = { w: 800, h: 600 } as const;

export interface PathDef {
  /** Waypoints (coordonnées logiques, cf. `BATTLEFIELD`). Convention : tous les chemins finissent au château. */
  waypoints: Vec2[];
  /** Portail de Faille : visible/actif uniquement pendant les vagues qui l'utilisent,
   *  annoncé au joueur pendant la phase building précédente (GDD §Portails). */
  portal?: boolean;
}

export interface MapDef {
  /** Chemins des ennemis. Une carte peut avoir plusieurs sources d'arrivée. */
  paths: PathDef[];
  /** Emplacements de tours. */
  slots: Vec2[];
  castleHp: number;
}

// ---------- Chapitres (mode Histoire) ----------

export interface ChapterBase {
  id: string;
  name: string;
  /** 1-3 lignes de lore — alimentées par docs/LORE.md (fichier de contexte fourni à part). */
  lore: string;
}

export type ChapterDef =
  | (ChapterBase & { playable: true; map: MapDef; waves: WaveDef[] })
  | (ChapterBase & { playable: false });

export type PlayableChapter = Extract<ChapterDef, { playable: true }>;

/** Barème des gains de fin de run, en Éclats (méta défense) et Sceaux (méta héros). */
export interface RewardRules {
  /** Éclats par vague nettoyée. */
  shardsPerWave: number;
  /** Éclats de victoire, au prorata des PV de château restants (0 si défaite). */
  shardsCastleBonus: number;
  /** Éclats forfaitaires de victoire. */
  shardsVictoryBonus: number;
  /** Plancher : une défaite après au moins une vague entamée paie toujours ça. */
  shardsFloor: number;
  /** Multiplicateur d'Éclats par chapitre (index = chapitre). Absent = 1 :
   *  sans lui, finir le chapitre 9 rapporte autant que rejouer le chapitre 1. */
  shardsChapterMult?: number[];
  /** Kills du héros nécessaires pour 1 Sceau. */
  heroKillsPerSceau: number;
  /** Sceaux forfaitaires de victoire. */
  sceauxVictoryBonus: number;
}

export interface ContentPack {
  towers: Record<string, TowerDef>;
  enemies: Record<string, EnemyDef>;
  /** Mode Histoire : chapitres dans l'ordre. Carte + vagues par chapitre (ADR-004). */
  chapters: ChapterDef[];
  hero: HeroDef;
  /** hpExponent : PV vague n = base × exp^n. castleDamageExponent : dégâts au château
   *  = damageToCastle × (PV_max/PV_base)^exp — un monstre renforcé tape plus fort (GDD §Économie). */
  scaling: { hpExponent: number; castleDamageExponent: number };
  accountSpell: { damage: number; radius: number; cooldownS: number };
  /** Forge (méta, Éclats) : bonus de dégâts permanent par tour. upgradeCosts[i] = coût du niveau i+1. */
  forge: { damageMultPerLevel: number; upgradeCosts: number[] };
  /** Économie in-run : taux de remboursement à la vente, or de départ (GDD §Économie). */
  economy: { sellRefundRate: number; startingGold: number };
  /** Récompenses de fin de run (GDD §Économie). Vivaient en dur dans `computeResult`,
   *  hors de portée d'ADR-003 : c'est ce qui les a laissées dériver pendant que le
   *  reste de l'équilibrage bougeait. Toute la méta-progression se règle ici. */
  rewards: RewardRules;
  /** Notation en étoiles (GDD §Étoiles) : seuil de "château beaucoup touché" (part des PV perdus). */
  rating: { heavyDamagePct: number };
}

// ---------- Méta (profil de compte) ----------

/** Run archivé pour les Chroniques (futur leaderboard). */
export interface BestRun {
  waves: number;
  kills: number;
  victory: boolean;
  shards: number;
  dateISO: string;
  /** Chapitre joué (absent sur les vieux profils). */
  chapter?: number;
}

export interface Profile {
  shards: number;
  /** Sceaux : monnaie du héros (sorts). Gagnée via les kills du héros — voir GDD §Économie. */
  sceaux: number;
  /** L'intro lore a été vue (premier lancement). */
  introSeen: boolean;
  /** Chapitres conquis (indices dans ContentPack.chapters). */
  chaptersWon: number[];
  /** Meilleure note (1-3 étoiles) par chapitre conquis. Clé = index de chapitre. */
  chapterStars: Record<number, number>;
  /** Bestiaire : ids des ennemis déjà croisés au combat. */
  bestiary: string[];
  unlocks: string[]; // ids: "tower_frost", "spell_arrow_rain", "castle_hp_1"
  /** Niveaux de forge par tour (0 = aucun bonus). */
  forge: Record<string, number>;
  /** Niveaux des sorts du héros (1 = base). */
  skills: { whirlwind: number; rally: number };
  /** Top 5 des runs, triés par vagues puis kills. */
  bestRuns: BestRun[];
}

// ---------- État de run ----------

export interface EnemyState {
  uid: number;
  defId: string;
  hp: number; maxHp: number;
  /** Chemin suivi (index dans MapDef.paths). */
  pathIndex: number;
  /** Distance parcourue le long du chemin. */
  dist: number;
  pos: Vec2;
  slowUntil: number; slowFactor: number;
  /** Brûlure (spécialisations feu) : % des PV max perdus par seconde jusqu'à burnUntil. */
  burnUntil: number; burnPctPerS: number;
  blocked: boolean;
  alive: boolean;
}

export interface TowerState {
  slotIndex: number;
  defId: string;
  level: number; // 1..levels.length
  /** Spécialisation choisie au-delà du niveau max (null = aucune). */
  specId: string | null;
  cooldown: number;
  rallyUntil: number;
}

export interface HeroState {
  pos: Vec2; target: Vec2;
  hp: number; maxHp: number;
  alive: boolean; respawnAt: number;
  whirlwindReady: number; rallyReady: number;
}

export type RunPhase = "building" | "wave" | "victory" | "defeat";

export interface RunState {
  time: number;          // temps simulé (s)
  /** Réservoir de temps réel pas encore consommé en pas fixes (< 1/60s). Indispensable
   *  aux écrans 120Hz+ : sans lui, des frames < 16.6ms n'avanceraient jamais la sim. */
  timeAcc: number;
  speed: 1 | 2;
  phase: RunPhase;
  /** Chapitre joué (index dans ContentPack.chapters, forcément playable). */
  chapterIndex: number;
  gold: number;
  castleHp: number;
  /** PV max du château (base + bonus méta) — pour la barre de PV du rendu. */
  castleHpMax: number;
  waveIndex: number;     // vague courante (0-based), -1 avant la première
  pendingSpawns: { at: number; enemyId: string; hpMult: number; pathIndex: number }[];
  enemies: EnemyState[];
  towers: TowerState[];
  hero: HeroState;
  accountSpellReady: number;
  hasAccountSpell: boolean;
  nextUid: number;
  kills: number;
  /** Kills réalisés par le héros (mêlée + Tournoiement) → Sceaux en fin de run. */
  heroKills: number;
  /** Niveaux des sorts, copiés du profil au createRun. */
  skillLevels: { whirlwind: number; rally: number };
  /** Niveaux de forge par tour, copiés du profil au createRun. */
  forgeLevels: Record<string, number>;
  /** Types d'ennemis croisés pendant ce run (→ Bestiaire en fin de run). */
  seenEnemies: string[];
  /** Nombre de morts du héros pendant le run (→ étoiles). */
  heroDeaths: number;
}

export interface RunResult {
  victory: boolean;
  wavesCleared: number;
  castleHpLeft: number;
  shards: number;
  kills: number;
  heroKills: number;
  sceaux: number;
  /** Types d'ennemis croisés (fusionnés dans le Bestiaire du profil). */
  seenEnemies: string[];
  /** Étoiles (0 si défaite ; 1-3 si victoire — GDD §Étoiles). */
  stars: number;
}

/** Événements émis par la sim pour le rendu (fx/sons). La sim ne connaît pas Phaser. */
export type SimEvent =
  | { type: "shot"; from: Vec2; to: Vec2; towerDefId: string }
  | { type: "enemyDied"; pos: Vec2; gold: number }
  | { type: "castleHit"; damage: number }
  | { type: "heroDied" }
  | { type: "explosion"; pos: Vec2; radius: number };
