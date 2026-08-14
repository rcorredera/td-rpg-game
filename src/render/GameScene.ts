// ============================================================
// render/GameScene.ts — Rendu Phaser du run. Lit RunState, ne le
// mute jamais directement : toute action passe par les commandes
// de core/sim.ts (ADR-001).
// Style : vectoriel médiéval dessiné en Graphics (pas d'assets bitmap).
// ============================================================

import Phaser from "phaser";
import { CONTENT } from "../content/index";
import {
  buildTower, castAccountSpell, castRally, castWhirlwind, computeResult,
  createRun, moveHero, sellRefundFor, sellTower, specializeTower, specOf, startNextWave, tick, upgradeTower,
} from "../core/sim";
import { BATTLEFIELD } from "../core/types";
import type { ChapterDef, EnemyDef, EnemyState, HeroState, PlayableChapter, RallyLevel, RunResult, RunState, SimEvent, TowerDef, TowerLevelStats, TowerSpecDef, TowerState, Vec2, WaveDef, WhirlwindLevel } from "../core/types";
import type { ProfileService } from "../meta/profile";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY, onSceneResize, preloadUi, setupCamera, UI_TINT } from "./ui";
import { scaleFont, touchSize, viewport } from "./viewport";
import { ICON, preloadIcons } from "./icons";
import { ensureBackdropTextures, TEX_VIGNETTE } from "./backdrop";
import { decorativeEdgeVisible, uiButton, uiPanel } from "./components";
import {
  ensureUiSkinTextures, uiSkinActive, uiSkinInset, uiSkinInsets, uiSkinSetTexture,
  UI_SKIN_BAR, UI_SKIN_BTN, UI_SKIN_BTN_PRESS, UI_SKIN_BTN_PRIMARY, UI_SKIN_BTN_PRIMARY_PRESS, UI_SKIN_PANEL,
} from "./uiSkin";
import type { Insets } from "./nineSlicePlan";
import { castleAnchor, castleBarBox, CASTLE_HALF } from "./castle";
import { preloadSprites, TEX } from "./assets";
import { ENEMY_SIZE_FALLBACK, enemyView, heroView, keepView, tileFor, towerView } from "./sprites";
import { drawDirtPath, ensureTerrainTextures, grassTextureKey } from "./terrain";
import { PATH_WIDTH, roundedPath } from "./path";
import { GROUND, HERO_C, SIGNAL } from "./palette";
import { projectileFor, projectilePoint, type ProjectileStyle } from "./projectiles";
import { flyPose, idlePose, walkPose } from "./animation";
import { SpriteLayer } from "./EntityLayer";
import { STATUS } from "./theme";
import type { Viewport } from "./viewport";
import type { CastleBarBox, Point } from "./castle";
import type { UnitPose } from "./animation";

// Palette médiévale (parchemin/forêt/pierre)
// eslint-disable-next-line @typescript-eslint/typedef -- `as const` garde un type littéral précis ; l'annoter le réélargirait.
const C = {
  grass: 0x4a6741, path: 0xb59a6a, pathEdge: 0x8a7350,
  stone: 0x8d8d93, wood: 0x7a5436, slot: 0x6b5a3e,
  archer: 0x3e6b8c, catapult: 0x8c5a3e, frost: 0x7ec8e3, portal: 0x9b59b6,
  goblin: 0x77a83a, orc: 0x5a7a3a, brute: 0x6b4a3a, bat: 0x5a4a6b,
  hero: 0xc9a227, heroBlade: 0xd9d9e0, castle: 0x9a9aa5,
  hpBack: 0x222222, hpFront: 0xc0392b, gold: 0xe8c252, ui: 0x2b2118, uiText: "#f0e6d2",
} as const;

// Champ de bataille : défini par le core (source unique), pas redéclaré ici.
const GAME_W: number = BATTLEFIELD.w, GAME_H: number = BATTLEFIELD.h;

/** Descente du libellé quand un bouton du HUD est enfoncé, en unités logiques.
 *  Cale sur le décalage que la planche « pressed » du pack applique à la plaque. */
const PRESS_DY: number = 3;

/** Libellé posé sur une plaque du pack. Crème plutôt que doré : mesuré, l'or ne
 *  garde que 0,26 d'écart de luminance sur le teal contre 0,43 pour le crème. */
const HUD_LABEL: string = "#f7efe0";
/** Voile des modales : volontairement plus grand que tout écran plausible, pour
 *  couvrir la vue quelle que soit sa taille sans avoir à le redimensionner. */
const VEIL: number = 4000;

// Délai UI avant l'enchaînement auto des vagues (confort, pas de l'équilibrage).
const AUTO_WAVE_DELAY_MS: number = 2000;

/** Clés des éléments du HUD. Un type fermé plutôt que des chaînes libres : une
 *  clé mal orthographiée à un point d'accès (`this.hudTexts["glod"]`) ne
 *  désynchronise plus silencieusement l'affichage, elle ne compile pas. */
type HudKey =
  | "gold" | "castle" | "wave" | "portalWarn"
  | "spell" | "rally" | "ww" | "speed" | "auto" | "nextWave";

/** Effet transitoire (sort, impact). `kind` choisit le rendu : chaque sort doit
 *  être reconnaissable à sa forme, pas seulement à sa couleur (ADR-016). */
interface FxEffect {
  pos: Vec2; radius: number; until: number;
  life?: number; color?: number; kind?: "whirl" | "rally" | "arrows";
}

/** Projectile en vol : porte son style (ADR-016) et l'instant de départ, pour
 *  être interpolé le long de sa trajectoire au lieu d'être un trait fixe.
 *  `hit` retient si l'impact a déjà été émis, pour ne le déclencher qu'une fois. */
interface ShotFx {
  from: Vec2; to: Vec2; start: number; until: number; style: ProjectileStyle; hit?: boolean;
}

/** Entrée du menu de slot (construire / améliorer / spécialiser / vendre).
 *  `cb: null` = entrée désactivée (or insuffisant) : grisée, coût en rouge. */
interface SlotMenuEntry {
  label: string; sub?: string; sub2?: string; cb: (() => void) | null; color?: string;
}

/** Direction du regard d'une entité : dernière abscisse connue + face (-1/1). */
interface FacingState { x: number; face: number }

/** Contexte de construction du HUD, calculé une fois par `buildHud` : habillage
 *  actif et dimensions dont dépendent tous ses boutons. */
interface HudBuildCtx {
  skin: boolean;
  cy: number;
  btnH: number;
  iconS: number;
}

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private profileSvc!: ProfileService;
  private chapterIdx = 0;
  private ch!: PlayableChapter;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Container;
  private hudTexts: Partial<Record<HudKey, Phaser.GameObjects.Text>> = {};
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private selectedSlot = -1;
  /** Or au moment où le menu de slot a été construit — pour le rafraîchir si l'or change (kills async). */
  private menuGold = -1;
  private spellMode = false;
  private fx: FxEffect[] = [];
  private shots: ShotFx[] = [];
  /** Recul des tours au tir : slotIndex → instant du tir. */
  private towerRecoil = new Map<number, number>();
  private ended = false;
  private autoWave = false;
  private autoWaveAt: number | null = null;
  private confirmQuit: Phaser.GameObjects.Container | null = null;
  /** Direction du regard par entité (uid → dernière x). uid -1 = héros. */
  private facing = new Map<number, FacingState>();
  /** Dernier impact sur le château (flash rouge). */
  private castleHitAt = -9999;
  private hudPlates: Partial<Record<HudKey, Phaser.GameObjects.NineSlice>> = {};
  private hudIcons: Partial<Record<HudKey, Phaser.GameObjects.Image>> = {};
  /** Couches de sprites retained-mode (ennemis par uid, tours par slotIndex). */
  private enemyLayer!: SpriteLayer<EnemyState>;
  private towerBaseLayer!: SpriteLayer<TowerState>;
  private towerEmblemLayer!: SpriteLayer<TowerState>;
  private heroSprite!: Phaser.GameObjects.Sprite;
  /** Marqueurs de slot vide (sprites statiques, masqués quand une tour occupe le slot). */
  private slotMarkers: Phaser.GameObjects.Image[] = [];
  /** Décor statique (herbe, routes, château) — reconstruit tel quel au resize. */
  private terrain: Phaser.GameObjects.Container | null = null;
  /** Bouton « quitter » : hors du container HUD (ancré au coin haut), détruit à part. */
  private quitBtn: Phaser.GameObjects.Container | null = null;
  /** Haut de la barre de HUD en unités logiques — les taps au-dessous sont ignorés. */
  private hudTop = GAME_H - 70;
  /** Châsse de la jauge du Bastion (habillage du pack) ; `null` sans habillage. */
  private castleBar: Phaser.GameObjects.NineSlice | null = null;
  /** Bord gauche sûr du HUD : origine de la cascade or / base / vague. */
  private hudLeftX = 0;

  constructor() { super("game"); }

  init(data: { profileSvc: ProfileService; chapterIndex?: number }) {
    this.profileSvc = data.profileSvc;
    this.chapterIdx = data.chapterIndex ?? 0;
    const ch: ChapterDef | undefined = CONTENT.chapters[this.chapterIdx];
    if (!ch?.playable) throw new Error(`chapitre ${this.chapterIdx} injouable`);
    this.ch = ch;
    this.run = createRun(CONTENT, this.profileSvc.get(), this.chapterIdx);
    this.ended = false; this.selectedSlot = -1; this.spellMode = false;
    this.fx = []; this.shots = [];
    this.autoWave = false; this.autoWaveAt = null; this.confirmQuit = null;
    this.facing = new Map(); this.hudPlates = {}; this.hudTexts = {}; this.hudIcons = {};
    this.castleHitAt = -9999;
  }

  preload() { preloadUi(this); preloadSprites(this); preloadIcons(this); }

  create() {
    setupCamera(this);
    this.buildTerrain();
    this.buildCastle();
    // Un run ne se rejoue pas : au resize/rotation on ne redémarre PAS la scène,
    // on se contente de réancrer ce qui dépend des bords (décor étendu, HUD).
    onSceneResize(this, () => this.relayout());
    this.enemyLayer = new SpriteLayer<EnemyState>(this, 100);
    this.towerBaseLayer = new SpriteLayer<TowerState>(this, 100);
    this.towerEmblemLayer = new SpriteLayer<TowerState>(this, 100);
    this.heroSprite = this.add.sprite(0, 0, heroView().key).setOrigin(0.5, 0.62);
    // Overlay monde (barres de PV, portées, FX, sélection) : au-dessus des entités, sous le HUD.
    this.gfx = this.add.graphics().setDepth(900);
    this.buildHud();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));
  }

  // ---------- Terrain (tuiles Kenney TD, statique) ----------

  /** Prairie dessinée + chemins de terre. Reconstruit par chapitre (create). */
  private buildTerrain() {
    const cont: Phaser.GameObjects.Container = this.add.container(0, 0).setDepth(-10);
    this.terrain = cont;
    const v: Viewport = viewport();

    // Sol généré (ADR-016) : nuances, touffes et grain, dans une gamme désaturée
    // qui laisse les unités ressortir. Remplace la tuile d'herbe fluo du pack.
    // Sol et route suivent le biome du chapitre (ADR-023) : « Le Col du Gel »
    // s'affichait sur la même prairie verte que tous les autres.
    const biome: string | undefined = this.ch.biome;
    ensureTerrainTextures(this, biome);
    const grassKey: string = grassTextureKey(biome);
    if (this.textures.exists(grassKey)) {
      cont.add(this.add.tileSprite(v.left, v.top, v.width, v.height, grassKey).setOrigin(0, 0));
    } else {
      cont.add(this.add.rectangle(v.left, v.top, v.width, v.height, GROUND.grass).setOrigin(0, 0));
    }

    // Chemins : un seul tracé continu, bordé. L'ancien estampage d'une tuile tous
    // les 16 px laissait des bosses régulières bien visibles.
    const roads: Phaser.GameObjects.Graphics = this.add.graphics();
    for (const p of this.ch.map.paths) {
      if (p.portal) continue; // les Failles n'apparaissent que lorsqu'elles sont actives (draw())
      drawDirtPath(roads, this.drawPath(p.waypoints), biome);
    }
    cont.add(roads);

    this.buildBattlefieldFrame(cont);

    // Emplacements de tour : dalle de pierre, bien plus grande qu'avant — les
    // unités et les tours ont grandi, les repères de construction devaient suivre.
    this.slotMarkers = this.ch.map.slots.map(s =>
      this.add.image(s.x, s.y, tileFor("pad").key).setDisplaySize(64, 64).setDepth(50),
    );
  }

  /** Tracé VISUEL d'un chemin. La sim suit les segments droits (ADR-001) : l'arrondi
   *  reste donc borné à une demi-largeur de route, pour qu'une unité pile sur son
   *  chemin logique n'apparaisse jamais à côté de sa route (`render/path.ts`). */
  private drawPath(wps: readonly Vec2[]): Vec2[] {
    return roundedPath(wps, PATH_WIDTH / 2);
  }

  /** Délimite le champ de bataille. L'écran déborde de la zone de jeu (ADR-010) :
   *  sans repère, la carte a l'air de flotter au milieu d'un terrain jouable qui ne
   *  l'est pas. Le débord est donc assombri et la zone cernée d'un liseré — cohérent
   *  avec le fait que le héros ne peut pas en sortir (`moveHero`).
   *  Ajouté au container de terrain : détruit et reconstruit avec lui au resize. */
  private buildBattlefieldFrame(cont: Phaser.GameObjects.Container) {
    const v: Viewport = viewport();

    // Vignette sur la zone de jeu : concentre le regard au centre et évite l'aplat
    // uniforme d'herbe d'un bord à l'autre (ADR-014).
    ensureBackdropTextures(this);
    if (this.textures.exists(TEX_VIGNETTE)) {
      cont.add(this.add.image(GAME_W / 2, GAME_H / 2, TEX_VIGNETTE)
        .setDisplaySize(GAME_W, GAME_H).setAlpha(0.55));
    }

    const g: Phaser.GameObjects.Graphics = this.add.graphics();
    g.fillStyle(0x0d0906, 0.55);
    if (v.top < 0) g.fillRect(v.left, v.top, v.width, -v.top);
    if (v.bottom > GAME_H) g.fillRect(v.left, GAME_H, v.width, v.bottom - GAME_H);
    if (v.left < 0) g.fillRect(v.left, 0, -v.left, GAME_H);
    if (v.right > GAME_W) g.fillRect(GAME_W, 0, v.right - GAME_W, GAME_H);
    g.lineStyle(3, 0xc9a227, 0.45);
    g.strokeRect(0, 0, GAME_W, GAME_H);
    cont.add(g);
  }

  /** Le Bastion en bout de chemin : l'objectif à défendre, volontairement le plus
   *  gros élément de la carte (ADR-016). */
  private buildCastle() {
    const main: Vec2[] = this.ch.map.paths[0]!.waypoints;
    const end: Vec2 = main[main.length - 1]!;
    const cont: Phaser.GameObjects.Container = this.add.container(0, 0).setDepth(100 + end.y);
    // Ancrage RAMENÉ dans le champ (les chemins finissent au bord droit) et
    // calculé une seule fois, dans `render/castle.ts` : la jauge de PV et le test
    // d'emplacements en dépendent aussi, et deux des trois copies avaient divergé.
    const a: Point = castleAnchor(end);
    cont.add(this.add.ellipse(a.x, a.y + 36, 110, 30, 0x1e2a17, 0.3));
    cont.add(this.add.image(a.x, a.y, keepView().key).setDisplaySize(CASTLE_HALF * 2, CASTLE_HALF * 2));

    // Jauge de PV : châsse du pack (embouts dorés, gorge sombre), posée une fois.
    // Seul le remplissage est retracé à chaque image, dans `update()`.
    ensureUiSkinTextures(this);
    if (this.textures.exists(UI_SKIN_BAR)) {
      const b: CastleBarBox = castleBarBox(end);
      const bi: Insets = uiSkinInsets(UI_SKIN_BAR);
      this.castleBar = this.add.nineslice(
        b.x + b.w / 2, b.y + b.h / 2, UI_SKIN_BAR, undefined, b.w, b.h,
        bi.left, bi.right, 0, 0,
      );
      cont.add(this.castleBar);
    }
  }

  /** Réancre ce qui dépend des bords de l'écran (décor étendu, HUD) après un
   *  resize ou une rotation. Le run lui-même n'est jamais touché : les entités
   *  et la sim vivent en coordonnées logiques, indépendantes de l'écran. */
  private relayout() {
    this.closeMenu();
    this.terrain?.destroy(true);
    this.terrain = null;
    this.slotMarkers.forEach(m => m.destroy());
    this.slotMarkers = [];
    this.buildTerrain();
    this.hud?.destroy(true);
    this.quitBtn?.destroy();
    this.quitBtn = null;
    this.hudTexts = {}; this.hudPlates = {}; this.hudIcons = {};
    this.buildHud();
  }

  // `stampPath` a disparu avec le skin médiéval : les chemins sont désormais un
  // tracé continu (`drawDirtPath`, terrain.ts) au lieu d'une tuile estampée tous
  // les 16 px, qui laissait des bosses régulières visibles (ADR-016).

  // ---------- Input ----------

  private onTap(x: number, y: number) {
    if (this.ended || this.confirmQuit) return;
    if (y > this.hudTop) return; // zone HUD bas (suit les bords réels de l'écran)

    if (this.spellMode) {
      const evs: SimEvent[] = [];
      castAccountSpell(this.run, CONTENT, { x, y }, evs);
      this.consumeEvents(evs);
      this.spellMode = false;
      return;
    }

    // Tap sur un slot ?
    const slotIdx: number = this.ch.map.slots.findIndex(s => Phaser.Math.Distance.Between(x, y, s.x, s.y) < 32);
    if (slotIdx >= 0) { this.openSlotMenu(slotIdx); return; }
    this.closeMenu();

    // Sinon : déplacement du héros
    moveHero(this.run, { x, y });
  }

  private openSlotMenu(slotIdx: number) {
    this.closeMenu();
    this.selectedSlot = slotIdx;
    const slot: Vec2 = this.ch.map.slots[slotIdx]!;
    const existing: TowerState | undefined = this.run.towers.find(t => t.slotIndex === slotIdx);
    // Le menu reste dans les bords sûrs de l'écran courant, pas du cadre 800×600.
    const v: Viewport = viewport();
    const menu: Phaser.GameObjects.Container = this.add.container(
      Phaser.Math.Clamp(slot.x, v.safeLeft + 125, v.safeRight - 125),
      Math.max(v.safeTop + 70, slot.y - 70),
    );
    const unlocks: string[] = this.profileSvc.get().unlocks;

    // cb null = entrée désactivée (or insuffisant) : grisée, coût en rouge.
    // sub/sub2 = lignes secondaires (pitch, stats).
    let entries: SlotMenuEntry[] = [];
    if (!existing) {
      entries = Object.values(CONTENT.towers)
        .filter(t => !t.requiresUnlock || unlocks.includes(t.requiresUnlock))
        .map(t => {
          const cost: number = t.costs[0]!;
          const lv1: TowerLevelStats = t.levels[0]!;
          const afford: boolean = this.run.gold >= cost;
          const role: string = t.splashRadius > 0 ? "zone" : "monocible";
          const extra: string = t.groundOnly ? " · ignore les volants" : t.slow ? " · ralentit" : " · vise tout";
          return {
            label: `${t.name} (${cost} ◆)`,
            sub: `⚔ ${lv1.damage}  ⊙ ${lv1.range}  ${lv1.fireRate}/s · ${role}${extra}`,
            color: afford ? C.uiText : "#e74c3c",
            cb: afford ? () => { buildTower(this.run, CONTENT, slotIdx, t.id, unlocks); this.closeMenu(); } : null,
          };
        });
    } else {
      const def: TowerDef = CONTENT.towers[existing.defId]!;
      if (existing.level < def.levels.length) {
        const cost: number = def.costs[existing.level]!;
        const cur: TowerLevelStats = def.levels[existing.level - 1]!, next: TowerLevelStats = def.levels[existing.level]!;
        const afford: boolean = this.run.gold >= cost;
        entries.push({
          label: `Améliorer niv.${existing.level + 1} (${cost} ◆)`,
          sub: `⚔ ${cur.damage}→${next.damage}  ⊙ ${cur.range}→${next.range}  ${cur.fireRate}→${next.fireRate}/s`,
          color: afford ? C.uiText : "#e74c3c",
          cb: afford ? () => { upgradeTower(this.run, CONTENT, slotIdx); this.closeMenu(); } : null,
        });
      } else if (!existing.specId && def.specs?.length && !this.run.canSpecialize) {
        // Rang 4 verrouillé à la méta : le dire, plutôt que d'afficher des options
        // que le clic ignorerait en silence (ADR-024).
        entries.push({
          label: "★ Spécialisations verrouillées",
          sub: "À débloquer à l'Armurerie : « Doctrines de siège ».",
          color: "#8a8577",
          cb: null,
        });
      } else if (!existing.specId && def.specs?.length) {
        // Niveau 4 : choix de spécialisation (exclusif et définitif), avec deltas de stats
        const cur: TowerLevelStats = def.levels[def.levels.length - 1]!;
        for (const sp of def.specs) {
          const afford: boolean = this.run.gold >= sp.cost;
          const stats: string = sp.aura
            ? `aura ⊙ ${sp.aura.radius} · vitesse ennemie ×${sp.aura.slowFactor}`
            : `⚔ ${cur.damage}→${sp.stats.damage}${sp.multishot ? `×${sp.multishot}` : ""}  ⊙ ${cur.range}→${sp.stats.range}  ${cur.fireRate}→${sp.stats.fireRate}/s`;
          entries.push({
            label: `★ ${sp.name} (${sp.cost} ◆)`,
            sub: sp.desc,
            sub2: stats,
            color: afford ? "#e8c252" : "#e74c3c",
            cb: afford ? () => { specializeTower(this.run, CONTENT, slotIdx, sp.id); this.closeMenu(); } : null,
          });
        }
      } else {
        const spec: TowerSpecDef | undefined = specOf(CONTENT, existing);
        entries.push({ label: spec ? `★ ${spec.name}` : "Niveau max", color: "#27ae60", cb: () => this.closeMenu() });
      }
      // Vente : rembourse un % de l'investissement (GDD §Tours)
      const refund: number = sellRefundFor(CONTENT, existing.defId, existing.level, existing.specId);
      entries.push({
        label: `Vendre (+${refund} ◆)`,
        color: "#e8a87c",
        cb: () => { sellTower(this.run, CONTENT, slotIdx); this.closeMenu(); },
      });
    }

    // Largeur DÉRIVÉE du contenu : à 230 en dur, la ligne descriptive la plus
    // longue mesurait 275 unités et débordait des deux côtés du panneau. Le défaut
    // préexistait, mais un panneau au cadre ouvragé ne pardonne plus le débord.
    const menuW: number = Math.ceil(Math.max(230, ...entries.flatMap(e => [
      this.measureTextWidth(e.label, 14),
      ...(e.sub ? [this.measureTextWidth(e.sub, 11)] : []),
      ...(e.sub2 ? [this.measureTextWidth(e.sub2, 11)] : []),
    ])) + 2 * uiSkinInset(UI_SKIN_PANEL) + 10);
    const half: number = menuW / 2;

    let yOff: number = 0;
    for (const e of entries) {
      const enabled: boolean = e.cb !== null;
      // Hauteurs relevées pour l'habillage ouvragé : ses marges valent 22, donc
      // une rangée de 44 n'est QUE du cadre et le texte se pose sur l'ornement.
      // Au passage, 30 était sous le plancher tactile (ADR-011) pour une cible
      // qu'on vise au doigt en pleine partie.
      const hgt: number = e.sub2 ? 78 : e.sub ? 64 : 48;
      const cy: number = yOff + hgt / 2;
      const bg: Phaser.GameObjects.NineSlice = uiPanel(this, 0, cy, menuW, hgt, enabled ? UI_TINT.panel : UI_TINT.panelDim, enabled ? 1 : 0.8);
      menu.add(bg);
      // Liseré tracé à la main : il doublait le cadre du panneau ouvragé du pack,
      // exactement comme celui de `uiFramedPanel` (ADR-029). L'état « indisponible »
      // reste porté par la teinte éteinte et l'opacité du panneau.
      if (decorativeEdgeVisible(this)) {
        const edge: Phaser.GameObjects.Graphics = this.add.graphics();
        edge.lineStyle(1, enabled ? 0xc9a227 : 0x6b5a3e, 0.9);
        edge.strokeRoundedRect(-half, yOff, menuW, hgt, 8);
        menu.add(edge);
      }
      const labelY: number = e.sub2 ? cy - 22 : e.sub ? cy - 11 : cy;
      const txt: Phaser.GameObjects.Text = this.add.text(0, labelY, e.label, {
        fontSize: "14px", color: e.color ?? C.uiText, fontFamily: FONT_BODY,
      }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75);
      menu.add(txt);
      if (e.sub) {
        menu.add(this.add.text(0, e.sub2 ? cy - 2 : cy + 11, e.sub, {
          fontSize: "11px", color: "#a89878", fontFamily: FONT_BODY,
        }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75));
      }
      if (e.sub2) {
        menu.add(this.add.text(0, cy + 20, e.sub2, {
          fontSize: "11px", color: "#f0e6d2", fontFamily: FONT_BODY,
        }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75));
      }
      if (enabled) {
        const zone: Phaser.GameObjects.Zone = this.add.zone(0, cy, menuW, hgt).setInteractive({ cursor: CURSOR_POINT });
        zone.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation(); e.cb!();
        });
        menu.add(zone);
      }
      yOff += hgt + 4;
    }
    // Au-dessus des entités/overlay (900) mais sous les modales (confirmQuit 3000).
    menu.setDepth(2000);
    this.buildMenu = menu;
    this.menuGold = this.run.gold;
  }

  private closeMenu() {
    this.buildMenu?.destroy(); this.buildMenu = null; this.selectedSlot = -1;
  }

  /** Largeur rendue d'un texte, via un `Text` jetable — sert à dimensionner un
   *  conteneur sur son contenu réel plutôt que sur une valeur en dur. */
  private measureTextWidth(txt: string, px: number): number {
    const t: Phaser.GameObjects.Text = this.add.text(0, 0, txt, { fontSize: `${px}px`, fontFamily: FONT_BODY });
    const w: number = t.width;
    t.destroy();
    return w;
  }

  // ---------- HUD ----------

  private hudPlateKey(ctx: HudBuildCtx, gold: boolean): string {
    return ctx.skin ? (gold ? UI_SKIN_BTN_PRIMARY : UI_SKIN_BTN) : (gold ? "ui_btn_gold" : "ui_btn");
  }

  private hudPlateInsets(ctx: HudBuildCtx, k: string): Insets {
    return ctx.skin ? uiSkinInsets(k) : { left: 14, right: 14, top: 14, bottom: 16 };
  }

  private hudPressedKey(ctx: HudBuildCtx, gold: boolean): string {
    return ctx.skin ? (gold ? UI_SKIN_BTN_PRIMARY_PRESS : UI_SKIN_BTN_PRESS) : this.hudPlateKey(ctx, gold);
  }

  /**
   * Retour d'appui. La barre du jeu ne réagissait pas au doigt alors que tous
   * les autres boutons le font (`uiButton`) : elle ne passe pas par ce
   * composant, donc elle n'héritait ni de l'état enfoncé ni du mouvement.
   *
   * Le pack fournit une planche ENFONCÉE où la plaque est dessinée plus bas ;
   * le libellé doit descendre avec elle, sinon il flotte au-dessus du creux.
   * L'état est posé en ABSOLU depuis la position d'origine, jamais par
   * incréments : un `pointerout` sans `pointerdown` ferait sinon dériver le
   * texte à chaque passage.
   */
  private wireHudPress(
    ctx: HudBuildCtx, plate: Phaser.GameObjects.NineSlice, keyUp: string, keyDown: string,
    movers: readonly Phaser.GameObjects.Components.Transform[],
  ): void {
    if (!ctx.skin) return;
    const baseY: number[] = movers.map(m => m.y);
    let pressed: boolean = false;
    const set = (on: boolean): void => {
      if (on === pressed) return;
      pressed = on;
      uiSkinSetTexture(this, plate, on ? keyDown : keyUp, plate.width, plate.height);
      movers.forEach((m, i) => { m.y = baseY[i]! + (on ? PRESS_DY : 0); });
    };
    plate.on("pointerdown", () => set(true));
    plate.on("pointerup", () => set(false));
    plate.on("pointerout", () => set(false));
  }

  /** Libellé passif (sans plaque), aligné à gauche : le groupe est ensuite mis en
   *  cascade d'après les largeurs réelles (`layoutHudLeft`), car les valeurs
   *  changent en jeu et les polices sont remontées sur petit écran (ADR-015). */
  private mkHudLabel(ctx: HudBuildCtx, key: HudKey, label: string, size = 16): void {
    const t: Phaser.GameObjects.Text = this.add.text(0, ctx.cy, label, { fontSize: `${size}px`, color: C.uiText, fontFamily: FONT_DISPLAY }).setOrigin(0, 0.5);
    this.hudTexts[key] = t; this.hud.add(t);
  }

  /** Plaque nine-slice (gold = action principale), habillée par le pack quand il
   *  est chargé. Cette barre NE passe PAS par `uiButton` : ses boutons agissent à
   *  l'APPUI et non au relâchement (choix assumé, elle n'est pas défilante — cf.
   *  `.ai/pitfalls.md`). D'où la duplication de l'habillage ici, sans laquelle la
   *  barre restait grise au milieu d'une interface repeinte. Renvoie la largeur
   *  RÉELLE de la plaque (elle s'élargit pour loger son libellé). */
  private mkHudButton(
    ctx: HudBuildCtx, key: HudKey, x: number, w: number, label: string, cb: () => void, size = 14, gold = false,
  ): number {
    const k: string = this.hudPlateKey(ctx, gold), pi: Insets = this.hudPlateInsets(ctx, k);
    const ins: number = Math.max(pi.left, pi.right, pi.top, pi.bottom);
    const plate: Phaser.GameObjects.NineSlice = this.add.nineslice(x, ctx.cy, k, undefined, w, ctx.btnH, pi.left, pi.right, pi.top, pi.bottom);
    if (!ctx.skin && !gold) plate.setTint(UI_TINT.btn);
    plate.setInteractive({ cursor: CURSOR_POINT })
      .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); cb(); });
    this.hudPlates[key] = plate; this.hud.add(plate);
    const t: Phaser.GameObjects.Text = this.add.text(x, ctx.cy - 2, label, {
      fontSize: `${size}px`, color: ctx.skin ? "#f7efe0" : gold ? "#3a2c12" : C.uiText, fontFamily: FONT_DISPLAY,
    }).setOrigin(0.5);
    // Le contour dessiné du pack mange ~8 unités de chaque côté : sans marge
    // élargie, le libellé touche le cadre.
    // Même plancher de largeur que `uiButton` : deux coins de 37 doivent tenir
    // côte à côte, sinon la plaque se replie sur elle-même.
    const pad: number = ctx.skin ? 44 : 20;
    const minW: number = ctx.skin ? 2 * ins + 4 : 0;
    const wantW: number = Math.max(t.width + pad, minW);
    if (wantW > plate.width) plate.setSize(wantW, ctx.btnH);
    this.hudTexts[key] = t; this.hud.add(t);
    this.wireHudPress(ctx, plate, k, this.hudPressedKey(ctx, gold), [t]);
    return plate.width;
  }

  /** Sorts : boutons-icônes carrés (cooldown affiché sous l'icône). */
  private mkHudIconButton(ctx: HudBuildCtx, key: HudKey, x: number, icon: string, cb: () => void): void {
    const k: string = this.hudPlateKey(ctx, false), pi: Insets = this.hudPlateInsets(ctx, k);
    // Plancher : deux marges doivent tenir dans le côté, sinon les coins se recouvrent.
    const side: number = Math.max(ctx.iconS, pi.left + pi.right + 2, pi.top + pi.bottom + 2);
    const plate: Phaser.GameObjects.NineSlice = this.add.nineslice(x, ctx.cy, k, undefined, side, side, pi.left, pi.right, pi.top, pi.bottom);
    if (!ctx.skin) plate.setTint(UI_TINT.btn);
    plate.setInteractive({ cursor: CURSOR_POINT })
      .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); cb(); });
    this.hudPlates[key] = plate; this.hud.add(plate);
    // Icône et compteur SUPERPOSÉS, pas empilés. La zone plate d'une plaque du
    // pack ne fait que ~32 unités (le reste est pris par les marges et par le
    // relief dessiné sous le bouton) : y tasser une icône ET un chiffre les
    // faisait déborder sur ce relief, où le chiffre devenait illisible. Le
    // compteur remplace donc l'icône pendant la recharge, ce qui lève aussi
    // l'ambiguïté — un bouton qui affiche un chiffre est un bouton indisponible.
    const glyph: number = ctx.iconS * (ctx.skin ? 0.44 : 0.54);
    const img: Phaser.GameObjects.Image = this.add.image(x, ctx.cy - (ctx.skin ? 0 : ctx.iconS * 0.08), icon)
      .setDisplaySize(glyph, glyph).setTint(0xf0e6d2);
    this.hudIcons[key] = img; this.hud.add(img);
    const cd: Phaser.GameObjects.Text = this.add.text(x, ctx.cy + (ctx.skin ? 0 : ctx.iconS * 0.33), "",
      { fontSize: ctx.skin ? "15px" : "10px", color: ctx.skin ? HUD_LABEL : "#e8c252", fontFamily: FONT_DISPLAY }).setOrigin(0.5);
    this.hudTexts[key] = cd; this.hud.add(cd);
    this.wireHudPress(ctx, plate, k, this.hudPressedKey(ctx, false), [img, cd]);
  }

  /**
   * Pose un bouton dont la largeur RÉELLE n'est connue qu'une fois dessiné (la
   * plaque s'élargit pour loger son libellé). Renvoie la nouvelle abscisse du
   * curseur (les boutons se posent de droite à gauche).
   *
   * L'élargissement se fait autour du CENTRE, donc la plaque grandit aussi vers
   * la DROITE et mord sur le bouton déjà posé — « Auto ✗ » recouvrait « x1 » à
   * l'écran. La version précédente ne compensait que du côté gauche, en
   * décalant le curseur ; il faut recaler la plaque elle-même.
   */
  private placeHudButton(cursorX: number, key: HudKey, w: number, draw: (cx: number) => number | void): number {
    const real: number = draw(cursorX - w / 2) ?? w;
    const dx: number = (w - real) / 2;
    if (dx !== 0) {
      for (const o of [this.hudPlates[key], this.hudTexts[key], this.hudIcons[key]]) o?.setX(o.x + dx);
    }
    return cursorX - (real + 8);
  }

  private buildHud() {
    this.hud = this.add.container(0, 0);
    const v: Viewport = viewport();
    // Le HUD s'ancre aux bords RÉELS de l'écran, pas au cadre 800×600 : ressources
    // à gauche, actions et sorts à droite (sous le pouce). Sur un écran large, la
    // barre s'étale au lieu de laisser du vide sur les côtés (ADR-010).
    // La barre se dimensionne d'après ses boutons, pas l'inverse : sur mobile leur
    // plancher tactile dépasse la hauteur historique de 70 (ADR-011).
    //
    // L'habillage du pack impose un plancher supplémentaire (son contour dessiné
    // mange ~8 unités) : la barre grandit donc de 8 sur GRAND écran, et pas du tout
    // sur mobile, où le plancher tactile est déjà au-dessus. `PLAY_SAFE_BOTTOM`
    // (ADR-028) est calibré sur le pire cas mobile, il reste donc valable.
    ensureUiSkinTextures(this);
    const skin: boolean = uiSkinActive(this);
    const btnH: number = touchSize(Math.max(40, skin ? 48 : 0));
    const iconS: number = touchSize(48);
    const barH: number = Math.max(70, Math.max(btnH, iconS) + 22);
    const cy: number = v.safeBottom - barH / 2;   // axe des contrôles
    this.hudTop = v.safeBottom - barH;
    const xL: number = v.safeLeft, xR: number = v.safeRight;
    const ctx: HudBuildCtx = { skin, cy, btnH, iconS };

    const bar: Phaser.GameObjects.Graphics = this.add.graphics();
    bar.fillStyle(C.ui, 0.97); bar.fillRect(v.left, this.hudTop, v.width, v.bottom - this.hudTop);
    bar.lineStyle(2, 0xc9a227, 0.35); bar.lineBetween(v.left, this.hudTop, v.right, this.hudTop);
    this.hud.add(bar);

    // --- Groupe gauche : état du run (lecture seule) ---
    this.mkHudLabel(ctx, "gold", "");
    // Icône du registre plutôt qu'un emoji 🏰 : rendu identique sur tout OS et
    // teintable (elle vire au rouge quand la base souffre — cf. update()).
    const cs: number = Math.max(17, scaleFont(15));
    this.hudIcons["castle"] = this.add.image(0, cy, ICON.castle).setDisplaySize(cs, cs);
    this.hud.add(this.hudIcons["castle"]!);
    this.mkHudLabel(ctx, "castle", "");
    this.mkHudLabel(ctx, "wave", "", 15);
    this.hudLeftX = xL + 14;

    // --- Groupe droit : actions, posées de droite à gauche ---
    // Les sorts occupent l'extrémité (les plus utilisés en combat), puis les
    // contrôles de vague. `▶ Vague` reste en or : c'est l'action principale.
    // Posés de droite à gauche à partir du bord sûr, chacun d'après sa largeur
    // effective : les boutons grossissent sur mobile sans jamais se chevaucher.
    let x: number = xR - 16;
    if (this.run.hasAccountSpell) {
      x = this.placeHudButton(x, "spell", iconS, cx => this.mkHudIconButton(ctx, "spell", cx, "icon_spell", () => { this.spellMode = true; }));
    }
    x = this.placeHudButton(x, "rally", iconS, cx => this.mkHudIconButton(ctx, "rally", cx, "icon_rally", () => {
      if (castRally(this.run, CONTENT)) {
        // Onde de portée au lancement : montre la zone d'effet du cri de ralliement
        const sk: RallyLevel = CONTENT.hero.skills.rally.levels[this.run.skillLevels.rally - 1]!;
        this.fx.push({ pos: { ...this.run.hero.pos }, radius: sk.radius, until: this.time.now + 650, life: 650, kind: "rally" });
      }
    }));
    x = this.placeHudButton(x, "ww", iconS, cx => this.mkHudIconButton(ctx, "ww", cx, "icon_ww", () => {
      const evs: SimEvent[] = [];
      if (castWhirlwind(this.run, CONTENT, evs)) {
        const sk: WhirlwindLevel = CONTENT.hero.skills.whirlwind.levels[this.run.skillLevels.whirlwind - 1]!;
        this.fx.push({ pos: { ...this.run.hero.pos }, radius: sk.radius, until: this.time.now + 520, life: 520, kind: "whirl" });
      }
      this.consumeEvents(evs);
    }));
    const wSpeed: number = touchSize(48), wAuto: number = touchSize(76), wWave: number = touchSize(100);
    x = this.placeHudButton(x, "speed", wSpeed, cx => this.mkHudButton(ctx, "speed", cx, wSpeed, "x1", () => { this.run.speed = this.run.speed === 1 ? 2 : 1; }));
    x = this.placeHudButton(x, "auto", wAuto, cx => this.mkHudButton(ctx, "auto", cx, wAuto, "Auto ✗", () => { this.autoWave = !this.autoWave; this.autoWaveAt = null; }));
    x = this.placeHudButton(x, "nextWave", wWave, cx => this.mkHudButton(ctx, "nextWave", cx, wWave, "▶ Vague", () => { startNextWave(this.run, CONTENT); }, 15, true));

    // Séparateur entre le bloc d'état et le bloc d'actions
    bar.lineStyle(1, 0xc9a227, 0.15);
    bar.lineBetween(x - 8, this.hudTop + 12, x - 8, v.safeBottom - 12);
    this.hud.setDepth(1000);

    // Bouton quitter : coin haut-gauche sûr (sous l'encoche éventuelle). Sa hauteur
    // effective décide de son centre, sinon il déborderait au-dessus sur mobile.
    // Il suit le bord sûr, mais JAMAIS au-delà du champ de bataille : sur un écran
    // plus large que le monde (2,2:1 mesuré chez un joueur), `safeLeft` vaut −114
    // et le bouton partait dans la bande noire, détaché du jeu et collé au bord du
    // canvas. Le bord du monde reste largement à portée du pouce (ADR-011), c'est
    // lui la vraie limite de l'écran utile.
    const quitH: number = touchSize(32), quitW: number = touchSize(86);
    const quitX: number = Math.max(v.safeLeft, 0) + 10 + quitW / 2;
    this.quitBtn = uiButton(this, quitX, Math.max(v.safeTop, 0) + 8 + quitH / 2, "⟵ Camp",
      { w: quitW, h: quitH, fontSize: 13 }, () => this.openQuitConfirm()).container.setDepth(1000);

    // Annonce de Faille (portails) — haut de l'écran, visible uniquement quand pertinent
    this.hudTexts["portalWarn"] = this.add.text(GAME_W / 2, v.safeTop + 10, "", {
      fontSize: "16px", color: "#c9a2e8", fontFamily: FONT_BODY,
      backgroundColor: "#2b2118", padding: { x: 12, y: 5 },
    }).setOrigin(0.5, 0).setDepth(1000).setVisible(false);
  }

  private openQuitConfirm() {
    if (this.confirmQuit || this.ended) return;
    this.closeMenu();
    const c: Phaser.GameObjects.Container = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(3000);
    c.add(this.add.rectangle(0, 0, VEIL, VEIL, 0x000000, 0.5));
    c.add(uiPanel(this, 0, 0, 420, 190));
    if (decorativeEdgeVisible(this)) {
      const edge: Phaser.GameObjects.Graphics = this.add.graphics();
      edge.lineStyle(2, 0xc9a227, 1); edge.strokeRoundedRect(-210, -95, 420, 190, 14);
      c.add(edge);
    }
    c.add(this.add.text(0, -55, "Abandonner la partie ?", { fontSize: "22px", color: C.uiText, fontFamily: FONT_DISPLAY }).setOrigin(0.5));
    c.add(this.add.text(0, -22, "La run sera perdue, aucun Éclat gagné.", { fontSize: "14px", color: "#a89878", fontFamily: FONT_BODY }).setOrigin(0.5));
    c.add(uiButton(this, -95, 45, "Quitter", { w: 130, h: 40, fontSize: 16, color: "#e8a87c" },
      () => this.scene.start("menu", { profileSvc: this.profileSvc })).container);
    c.add(uiButton(this, 95, 45, "Continuer", { w: 130, h: 40, gold: true, fontSize: 16 },
      () => { c.destroy(); this.confirmQuit = null; }).container);
    this.confirmQuit = c;
  }

  // ---------- Update ----------

  update(_t: number, dtMs: number) {
    if (!this.ended && !this.confirmQuit) {
      const evs: SimEvent[] = tick(this.run, CONTENT, dtMs / 1000);
      this.consumeEvents(evs);
      if (this.run.phase === "victory" || this.run.phase === "defeat") this.endRun();
      this.updateAutoWave();
      // L'or a changé pendant que le menu de slot est ouvert (kills de la vague) :
      // on le reconstruit pour mettre à jour l'affordabilité sans avoir à re-cliquer.
      if (this.buildMenu && this.selectedSlot >= 0 && this.run.gold !== this.menuGold) {
        this.openSlotMenu(this.selectedSlot);
      }
    }
    this.draw();
    const r: RunState = this.run;
    this.hudTexts["gold"]?.setText(`◆ ${r.gold}`).setColor("#e8c252");
    const castlePct: number = r.castleHp / r.castleHpMax;
    const castleTint: number = castlePct > 0.55 ? 0xf0e6d2 : castlePct > 0.25 ? 0xe8c252 : 0xc0392b;
    this.hudTexts["castle"]?.setText(`${r.castleHp}/${r.castleHpMax}`)
      .setColor(castlePct > 0.55 ? C.uiText : castlePct > 0.25 ? "#e8c252" : "#c0392b");
    this.hudIcons["castle"]?.setTint(castleTint);
    this.hudTexts["wave"]?.setText(`Vague ${Math.max(0, r.waveIndex + 1)}/${this.ch.waves.length}`);
    this.layoutHudLeft();
    const waveReady: boolean = r.phase === "building";
    this.hudTexts["nextWave"]?.setAlpha(waveReady ? 1 : 0.35);
    this.hudPlates["nextWave"]?.setAlpha(waveReady ? 1 : 0.35);
    // Couleur d'état SEULEMENT sur la plaque grise d'origine. Ces teintes avaient
    // été choisies contre elle ; sur le teal du pack, l'écart de luminance tombe à
    // 0,04 pour le vert (illisible) et 0,26 pour l'or, contre 0,43 pour le crème.
    // L'état reste lisible sans elles : il est déjà porté par le glyphe.
    this.hudTexts["auto"]?.setText(this.autoWave ? "Auto ✓" : "Auto ✗")
      .setColor(this.hudStateColor(this.autoWave, "#27ae60"));
    this.hudTexts["speed"]?.setText(`x${r.speed}`)
      .setColor(this.hudStateColor(r.speed === 2, "#e8c252"));
    this.updateSkillButton("ww", r.hero.whirlwindReady);
    this.updateSkillButton("rally", r.hero.rallyReady);
    this.updateSkillButton("spell", r.accountSpellReady);
  }

  /** Couleur d'un libellé d'état (Auto, x2) SEULEMENT sur la plaque grise d'origine —
   *  cf. commentaire d'appel dans `update()`. */
  private hudStateColor(on: boolean, css: string): string {
    return uiSkinActive(this) ? HUD_LABEL : on ? css : C.uiText;
  }

  /** Rafraîchit un bouton-icône de sort : compteur de recharge, alpha de la
   *  plaque et de l'icône. Sur l'habillage du pack, compteur et icône occupent
   *  le MÊME emplacement : l'icône s'efface donc complètement pendant la
   *  recharge au lieu de rester en filigrane sous le chiffre. */
  private updateSkillButton(key: HudKey, readyAt: number): void {
    const left: number = readyAt - this.run.time;
    const onCd: boolean = left > 0;
    this.hudTexts[key]?.setText(onCd ? `${Math.ceil(left)}s` : "");
    this.hudPlates[key]?.setAlpha(onCd ? 0.45 : 1);
    this.hudIcons[key]?.setAlpha(onCd ? (uiSkinActive(this) ? 0 : 0.4) : 1);
  }

  /** Met en cascade or → base → vague d'après leurs largeurs courantes. Recalculé
   *  à chaque frame car les valeurs changent en jeu (« 160 » puis « 1160 ») et une
   *  position fixe finissait par faire se chevaucher les libellés. */
  private layoutHudLeft() {
    const gap: number = 16;
    let x: number = this.hudLeftX;
    const put = (t?: Phaser.GameObjects.Text) => {
      if (!t) return;
      t.setX(x);
      x += t.width + gap;
    };
    put(this.hudTexts["gold"]);
    const icon: Phaser.GameObjects.Image | undefined = this.hudIcons["castle"];
    if (icon) {
      icon.setX(x + icon.displayWidth / 2);
      x += icon.displayWidth + 6;
    }
    put(this.hudTexts["castle"]);
    put(this.hudTexts["wave"]);
  }

  /** Auto-vague : enchaîne les vagues suivantes après un court délai. La 1re vague reste manuelle (GDD §Boucle in-run). */
  private updateAutoWave() {
    if (!this.autoWave || this.run.phase !== "building" || this.run.waveIndex < 0) {
      this.autoWaveAt = null;
      return;
    }
    if (this.autoWaveAt === null) this.autoWaveAt = this.time.now + AUTO_WAVE_DELAY_MS;
    else if (this.time.now >= this.autoWaveAt) { startNextWave(this.run, CONTENT); this.autoWaveAt = null; }
  }

  private consumeEvents(evs: SimEvent[]) {
    for (const e of evs) {
      if (e.type === "explosion") {
        this.spawnFlame(e.pos.x, e.pos.y, 0.4 + e.radius / 90);
        // Grosse zone = sort de compte : on ajoute la volée de flèches qui tombe,
        // au lieu d'une simple déflagration indifférenciée.
        if (e.radius >= CONTENT.accountSpell.radius * 0.9) {
          this.fx.push({ pos: { ...e.pos }, radius: e.radius, until: this.time.now + 620, life: 620, kind: "arrows" });
        }
      }
      if (e.type === "shot") {
        // Le projectile VOYAGE : son style dit ce qui frappe (flèche tendue,
        // rocher en cloche, éclat de givre) — cf. registre projectiles.ts.
        const style: ProjectileStyle = projectileFor(e.towerDefId);
        const now: number = this.time.now;
        this.shots.push({ from: e.from, to: e.to, start: now, until: now + style.flightMs, style });
        // Recul de la tour au départ du coup : l'animation de tir part de l'arme,
        // pas seulement du projectile.
        const shooter: TowerState | undefined = this.run.towers.find(t => {
          const s: Vec2 = this.ch.map.slots[t.slotIndex]!;
          return Math.hypot(s.x - e.from.x, s.y - e.from.y) < 24;
        });
        if (shooter) this.towerRecoil.set(shooter.slotIndex, now);
      }
      if (e.type === "castleHit") {
        const main: Vec2[] = this.ch.map.paths[0]!.waypoints;
        const end: Vec2 = main[main.length - 1]!;
        this.spawnFlame(end.x - 18, end.y - 6, 0.8 + e.damage * 0.12);
        this.castleHitAt = this.time.now;
      }
    }
  }

  /** Dessine un projectile en vol selon son style (ADR-016). L'impact est produit
   *  à l'ARRIVÉE, pas au départ : avant, la déflagration apparaissait sur la cible
   *  au moment du tir, ce qui rendait la trajectoire inutile. */
  private drawProjectile(g: Phaser.GameObjects.Graphics, s: ShotFx, now: number) {
    const st: ProjectileStyle = s.style;
    const t: number = (now - s.start) / Math.max(1, s.until - s.start);
    const from: Vec2 = { x: s.from.x, y: s.from.y - 10 };
    const p: Vec2 = projectilePoint(from, s.to, t, st.arc);

    if (st.trail > 0) {
      const back: Vec2 = projectilePoint(from, s.to, Math.max(0, t - st.trail / 200), st.arc);
      g.lineStyle(2, st.color, 0.45);
      g.lineBetween(back.x, back.y, p.x, p.y);
    }

    if (st.kind === "arrow") {
      const tip: Vec2 = projectilePoint(from, s.to, Math.min(1, t + 0.06), st.arc);
      g.lineStyle(2.5, st.color, 1);
      g.lineBetween(p.x, p.y, tip.x, tip.y);
    } else if (st.kind === "boulder") {
      g.fillStyle(0x000000, 0.18);
      g.fillEllipse(p.x, s.from.y + (s.to.y - s.from.y) * t, st.size * 2, st.size * 0.9);
      g.fillStyle(st.color, 1);
      g.fillCircle(p.x, p.y, st.size);
      g.lineStyle(1.5, 0x241a12, 0.8);
      g.strokeCircle(p.x, p.y, st.size);
    } else {
      const a: number = st.spin ? now / 60 : 0;
      g.fillStyle(st.color, 1);
      g.fillTriangle(
        p.x + Math.cos(a) * st.size, p.y + Math.sin(a) * st.size,
        p.x + Math.cos(a + 2.1) * st.size, p.y + Math.sin(a + 2.1) * st.size,
        p.x + Math.cos(a + 4.2) * st.size, p.y + Math.sin(a + 4.2) * st.size,
      );
    }

    // Impact : déclenché une seule fois, quand le projectile arrive vraiment.
    if (t >= 1 && !s.hit) {
      s.hit = true;
      this.spawnFlame(s.to.x, s.to.y - 6, st.kind === "boulder" ? 0.55 : 0.3);
    }
  }

  /** Flamme/explosion transitoire (sprite flamme Kenney TD #296) : grandit puis s'efface. */
  private spawnFlame(x: number, y: number, scale = 0.6) {
    const f: Phaser.GameObjects.Image = this.add.image(x, y, TEX.td, 296).setScale(scale * 0.4).setDepth(850).setAlpha(0.95);
    this.tweens.add({ targets: f, scale, alpha: 0, duration: 280, ease: "Quad.out", onComplete: () => f.destroy() });
  }

  private endRun() {
    this.ended = true;
    const result: RunResult = computeResult(this.run, CONTENT);
    this.profileSvc.applyRunResult(result, this.chapterIdx);
    const overlay: Phaser.GameObjects.Container = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(4000);
    overlay.add(this.add.rectangle(0, 0, VEIL, VEIL, 0x000000, 0.45));
    overlay.add(uiPanel(this, 0, 0, 420, 240));
    if (decorativeEdgeVisible(this)) {
      const edge: Phaser.GameObjects.Graphics = this.add.graphics();
      edge.lineStyle(2, 0xc9a227, 1); edge.strokeRoundedRect(-210, -120, 420, 240, 14);
      overlay.add(edge);
    }
    overlay.add(this.add.text(0, -88, result.victory ? "Victoire !" : "Défaite", { fontSize: "30px", color: "#e8c252", fontFamily: FONT_DISPLAY }).setOrigin(0.5));
    if (result.victory) {
      const stars: string = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
      overlay.add(this.add.text(0, -56, stars, { fontSize: "26px", color: "#e8c252", fontFamily: FONT_BODY }).setOrigin(0.5));
    }
    overlay.add(this.add.text(0, -30, `Vagues : ${result.wavesCleared}/${this.ch.waves.length}`, { fontSize: "18px", color: C.uiText, fontFamily: FONT_BODY }).setOrigin(0.5));
    overlay.add(this.add.text(0, 5, `Éclats gagnés : +${result.shards}`, { fontSize: "20px", color: "#7ec8e3", fontFamily: FONT_BODY }).setOrigin(0.5));
    // Les Sceaux paient le TEMPS passé à retenir la horde, pas les kills (ADR-021) :
    // l'écran doit dire ce qui est récompensé, sinon le joueur optimise autre chose.
    if (result.sceaux > 0) overlay.add(this.add.text(0, 32, `Sceaux gagnés : +${result.sceaux} ⚜ (${Math.round(result.heroBlockSeconds)}s à retenir la horde)`, { fontSize: "15px", color: "#c97ba2", fontFamily: FONT_BODY }).setOrigin(0.5));
    overlay.add(uiButton(this, 0, 75, "Retour au campement", { w: 240, h: 44, gold: true, fontSize: 17 },
      () => this.scene.start("menu", { profileSvc: this.profileSvc })).container);
  }

  // ---------- Draw (vectoriel, redessiné chaque frame) ----------

  private draw() {
    const g: Phaser.GameObjects.Graphics = this.gfx;
    g.clear();

    // Le sol + les chemins non-portail sont en tuiles statiques (buildTerrain).
    // Ici, seuls les chemins de Faille (portails) — dynamiques : n'apparaissent que
    // lorsqu'ils sont actifs ou annoncés pour la vague suivante (GDD §Portails).
    this.ch.map.paths.forEach((p, i) => {
      if (!p.portal) return;
      const active: boolean = this.pathInUse(i);
      const announced: boolean = this.run.phase === "building" && this.nextWaveUsesPath(i);
      if (!active && !announced) return;
      const alpha: number = active ? 1 : 0.35;
      // Même tracé que les routes permanentes : une Faille dessinée à angles vifs
      // au milieu de chemins adoucis se lit comme un élément d'un autre jeu.
      const lane: Vec2[] = this.drawPath(p.waypoints);
      g.lineStyle(36, C.portal, 0.25 * alpha); this.strokePath(g, lane);
      g.lineStyle(30, C.path, 0.7 * alpha); this.strokePath(g, lane);
      // Vortex à l'entrée du portail
      const o: Vec2 = p.waypoints[0]!;
      const pulse: number = 3 * Math.sin(this.time.now / 150);
      g.lineStyle(4, C.portal, alpha); g.strokeCircle(o.x, o.y, 22 + pulse);
      g.lineStyle(2, C.portal, 0.6 * alpha); g.strokeCircle(o.x, o.y, 13 - pulse / 2);
    });
    // Annonce de Faille pendant la phase building
    if (this.run.phase === "building" && this.ch.map.paths.some((p, i) => p.portal && this.nextWaveUsesPath(i))) {
      this.hudTexts["portalWarn"]?.setText("⚠ Une Faille s'ouvrira à la prochaine vague !").setVisible(true);
    } else {
      this.hudTexts["portalWarn"]?.setVisible(false);
    }

    // Château : muraille en tuiles (buildCastle). Ici, seul le flash rouge d'impact + la barre PV.
    const main: Vec2[] = this.ch.map.paths[0]!.waypoints;
    const end: Vec2 = main[main.length - 1]!;
    const hitFlash: boolean = this.time.now - this.castleHitAt < 280;
    if (hitFlash) { g.fillStyle(0xc0392b, 0.35); g.fillRect(end.x - 34, end.y - 24, 100, 64); }

    // Remplissage de la jauge de PV. La châsse, elle, est posée une fois par
    // `buildCastle` : ici on ne dessine que ce qui change. Le rectangle vient de
    // `castleBarBox`, donc du MÊME ancrage que le sprite — auparavant calé sur
    // `end.x - 62` quand le sprite l'est sur `min(end.x, W - 62)`, soit 26 unités
    // de décalage dès qu'un chapitre ne finit pas contre le bord droit.
    {
      const pct: number = Math.max(0, this.run.castleHp / this.run.castleHpMax);
      const skin: Phaser.GameObjects.NineSlice | null = this.castleBar;
      // Le rectangle vient de la CHÂSSE RÉELLE quand elle existe : sa hauteur est
      // celle de l'art, que `castleBarBox` — pur, sans accès aux textures — ne peut
      // pas connaître. La déduire de nouveau ici aurait recréé la divergence qu'on
      // vient de supprimer.
      const b: CastleBarBox = skin
        ? { x: skin.x - skin.width / 2, y: skin.y - skin.height / 2, w: skin.width, h: skin.height }
        : castleBarBox(end);
      // Le remplissage se pose DANS la gorge : en retrait des embouts et du liseré.
      const padX: number = skin ? uiSkinInsets(UI_SKIN_BAR).left : 1;
      const padY: number = skin ? Math.round(b.h * 0.28) : 1;
      const ix: number = b.x + padX, iy: number = b.y + padY;
      const iw: number = b.w - padX * 2, ih: number = b.h - padY * 2;
      const skinned: boolean = skin !== null;
      const color: number = pct > 0.55 ? 0x27ae60 : pct > 0.25 ? 0xe8c252 : 0xc0392b;
      if (!skinned) { g.fillStyle(C.hpBack, 0.9); g.fillRoundedRect(b.x, b.y, b.w, b.h, 4); }
      if (pct > 0.03) { g.fillStyle(color); g.fillRect(ix, iy, iw * pct, ih); }
      if (!skinned || hitFlash) {
        g.lineStyle(1, hitFlash ? 0xc0392b : 0xc9a227, hitFlash ? 1 : 0.6);
        g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4);
      }
    }

    // Slots vides : marqueur masqué dès qu'une tour occupe le slot, sinon
    // anneau doré pulsé + croix « + » pour signaler « construire ici ».
    for (let i: number = 0; i < this.ch.map.slots.length; i++) {
      const occupied: boolean = this.run.towers.some(t => t.slotIndex === i);
      this.slotMarkers[i]?.setVisible(!occupied);
      if (occupied) continue;
      const s: Vec2 = this.ch.map.slots[i]!;
      const sel: boolean = i === this.selectedSlot;
      const pulse: number = Math.sin(this.time.now / 350 + i) * 1.5;
      const rad: number = 24 + pulse;
      g.lineStyle(2, 0xe8c252, sel ? 0.95 : 0.55);
      const segs: number = 28;
      for (let k: number = 0; k < segs; k += 2) {
        g.beginPath();
        g.arc(s.x, s.y, rad, (k / segs) * Math.PI * 2, ((k + 1) / segs) * Math.PI * 2);
        g.strokePath();
      }
      g.lineStyle(2, 0xe8c252, sel ? 0.9 : 0.45);
      g.lineBetween(s.x - 6, s.y, s.x + 6, s.y);
      g.lineBetween(s.x, s.y - 6, s.x, s.y + 6);
    }
    // Tours : le skin médiéval dessine la tour ENTIÈRE (plus de composition
    // socle + emblème, qui n'existait que pour recycler des tourelles sci-fi).
    this.towerBaseLayer.sync(
      this.run.towers, t => t.slotIndex, t => towerView(t.defId, t.level, t.specId).base, (s, t) => this.placeTowerPart(s, t, -12, 84),
    );
    this.towerEmblemLayer.sync(
      this.run.towers.filter(t => towerView(t.defId).emblem),
      t => t.slotIndex, t => towerView(t.defId).emblem!, (s, t) => this.placeTowerPart(s, t, -8, 52),
    );
    for (const t of this.run.towers) this.drawTowerOverlay(g, t);

    // Ennemis : corps en sprites (retained-mode), barres/statuts en overlay gfx.
    const aliveEnemies: EnemyState[] = this.run.enemies.filter(e => e.alive);
    this.enemyLayer.sync(
      aliveEnemies,
      e => e.uid,
      e => enemyView(e.defId),
      (s, e) => this.placeEnemy(s, e),
      s => this.spawnFlame(s.x, s.y, 0.55),
    );
    for (const e of aliveEnemies) this.drawEnemyOverlay(g, e);

    // Héros
    this.drawHero(g);

    // Tirs & FX
    const now: number = this.time.now;
    this.shots = this.shots.filter(s => s.until > now);
    for (const s of this.shots) this.drawProjectile(g, s, now);
    this.fx = this.fx.filter(f => f.until > now);
    for (const f of this.fx) {
      const life: number = f.life ?? 220;
      const t: number = 1 - (f.until - now) / life; // 0 → 1
      const fade: number = 1 - t;
      if (f.kind === "whirl") {
        // Tournoiement : trois bras en spirale qui s'ouvrent en tournant, plus
        // une onde de bord. Un cercle seul ne disait pas « ça tourne ».
        const spin: number = t * 7;
        for (let arm: number = 0; arm < 3; arm++) {
          g.lineStyle(4 - arm, HERO_C.gold, 0.85 * fade);
          g.beginPath();
          const base: number = spin + (arm * Math.PI * 2) / 3;
          for (let s: number = 0; s <= 12; s++) {
            const u: number = s / 12;
            const rr: number = f.radius * t * u;
            const aa: number = base + u * 2.6;
            const px: number = f.pos.x + Math.cos(aa) * rr, py: number = f.pos.y + Math.sin(aa) * rr * 0.72;
            if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.strokePath();
        }
        g.lineStyle(2.5, 0xffffff, 0.5 * fade);
        g.strokeEllipse(f.pos.x, f.pos.y, f.radius * t * 2, f.radius * t * 1.44);
      } else if (f.kind === "rally") {
        // Ralliement : double onde dorée + éclat central, pour se distinguer
        // nettement du Tournoiement.
        g.lineStyle(4, HERO_C.gold, 0.8 * fade);
        g.strokeEllipse(f.pos.x, f.pos.y, f.radius * t * 2, f.radius * t * 1.3);
        g.lineStyle(2, 0xfff0c0, 0.6 * fade);
        g.strokeEllipse(f.pos.x, f.pos.y, f.radius * t * 1.5, f.radius * t * 0.98);
        for (let i: number = 0; i < 6; i++) {
          const a: number = (i / 6) * Math.PI * 2;
          const rr: number = f.radius * t;
          g.fillStyle(HERO_C.gold, 0.7 * fade);
          g.fillCircle(f.pos.x + Math.cos(a) * rr, f.pos.y + Math.sin(a) * rr * 0.65, 3 * fade + 1);
        }
      } else if (f.kind === "arrows") {
        // Pluie de flèches : une volée qui TOMBE vraiment dans la zone, puis se
        // plante. Auparavant, le sort le plus coûteux du jeu ne produisait qu'un
        // cercle, indiscernable d'un tir de catapulte.
        g.lineStyle(2, 0xf0e6d2, 0.35 * fade);
        g.strokeEllipse(f.pos.x, f.pos.y, f.radius * 2, f.radius * 1.15);
        for (let i: number = 0; i < 14; i++) {
          const a: number = (i / 14) * Math.PI * 2 + i;
          const rr: number = f.radius * (0.25 + ((i * 37) % 100) / 130);
          const tx: number = f.pos.x + Math.cos(a) * rr, ty: number = f.pos.y + Math.sin(a) * rr * 0.62;
          const delay: number = ((i * 13) % 40) / 100;          // volée échelonnée
          const p: number = Math.min(1, Math.max(0, (t - delay) / 0.45));
          if (p <= 0) continue;
          const fall: number = (1 - p) * 90;                    // hauteur de chute restante
          if (p < 1) {
            g.lineStyle(2.5, 0xf0e6d2, 0.95);
            g.lineBetween(tx + 4, ty - fall - 12, tx, ty - fall);
          } else {
            // Flèche plantée, qui s'efface avec l'effet.
            g.lineStyle(2, 0xd8cbb0, 0.8 * fade);
            g.lineBetween(tx + 4, ty - 11, tx, ty);
          }
        }
      } else {
        g.lineStyle(3, f.color ?? 0xe8c252, 0.7 * (1 - t * 0.6));
        g.strokeCircle(f.pos.x, f.pos.y, f.radius * t);
      }
    }

    if (this.spellMode) {
      g.lineStyle(2, 0xe8c252, 0.8);
      g.strokeCircle(this.input.activePointer.worldX, this.input.activePointer.worldY, CONTENT.accountSpell.radius);
    }
  }

  // ---------- Tours (sprites composés + overlays) ----------

  /** Positionne une pièce de tour sur son slot. `size` en unités logiques (ADR-016).
   *  Applique le recul de tir : brève compression verticale qui donne du poids au
   *  coup, sans jamais toucher la sim. */
  private placeTowerPart(s: Phaser.GameObjects.Sprite, t: TowerState, dy: number, size: number) {
    const slot: Vec2 = this.ch.map.slots[t.slotIndex]!;
    const firedAt: number | undefined = this.towerRecoil.get(t.slotIndex);
    const age: number = firedAt === undefined ? Infinity : this.time.now - firedAt;
    const RECOIL_MS: number = 160;
    // 1 → 0 sur la durée du recul ; squash vertical + léger enfoncement.
    const k: number = age < RECOIL_MS ? 1 - age / RECOIL_MS : 0;
    const squash: number = 1 - 0.12 * k;
    s.setOrigin(0.5, 0.86)
      .setDisplaySize(size * (1 + 0.06 * k), size * squash)
      .setPosition(slot.x, slot.y + dy + 4 * k)
      .setDepth(100 + slot.y + (dy < 0 ? 1 : 0));
  }

  /** Overlay de tour (gfx) : ralliement, pips de niveau, étoile/aura de spec, portée à la sélection. */
  private drawTowerOverlay(g: Phaser.GameObjects.Graphics, t: TowerState) {
    const s: Vec2 = this.ch.map.slots[t.slotIndex]!;
    const def: TowerDef = CONTENT.towers[t.defId]!;
    const x: number = s.x, y: number = s.y;

    // Tour ralliée : socle de lumière au sol, étincelles montantes et bannière
    // qui claque. L'ancien anneau + deux chevrons se lisait à peine (ADR-016).
    if (this.run.time < t.rallyUntil) {
      const pulse: number = Math.sin(this.time.now / 150);
      // Halo au sol : ancre l'effet sur la tour plutôt que de flotter autour.
      g.fillStyle(HERO_C.gold, 0.14 + 0.05 * pulse);
      g.fillEllipse(x, y + 6, 62 + pulse * 5, 24 + pulse * 2);
      g.lineStyle(2, HERO_C.gold, 0.75);
      g.strokeEllipse(x, y + 6, 62 + pulse * 5, 24 + pulse * 2);
      // Étincelles ascendantes, échelonnées pour un flux continu.
      for (let i: number = 0; i < 5; i++) {
        const ph: number = ((this.time.now / 620) + i * 0.2 + t.slotIndex * 0.13) % 1;
        const sx: number = x + Math.sin(i * 2.3 + ph * 3) * 17;
        const sy: number = y + 4 - ph * 52;
        g.fillStyle(i % 2 ? 0xfff0c0 : HERO_C.gold, 0.9 * (1 - ph));
        g.fillCircle(sx, sy, 2.6 * (1 - ph) + 0.8);
      }
      // Chevron unique, plus lisible que deux qui se chevauchaient.
      const rise: number = ((this.time.now / 70) % 22);
      const cy: number = y - 40 - rise;
      g.lineStyle(3, HERO_C.gold, Math.max(0, 1 - rise / 22));
      g.lineBetween(x - 7, cy + 6, x, cy - 3);
      g.lineBetween(x + 7, cy + 6, x, cy - 3);
    }

    // Pips de niveau sur la face avant — étoile dorée si spécialisée
    for (let lv: number = 0; lv < t.level; lv++) { g.fillStyle(0xe8c252); g.fillCircle(x - 8 + lv * 8, y + 1, 2.5); }
    const spec: TowerSpecDef | undefined = specOf(CONTENT, t);
    if (spec) {
      const sy: number = y - 32 + Math.sin(this.time.now / 300) * 1.5;
      g.fillStyle(0xe8c252);
      g.fillTriangle(x - 5, sy + 2, x + 5, sy + 2, x, sy - 6);
      g.fillTriangle(x - 5, sy - 2, x + 5, sy - 2, x, sy + 6);
      // Aura de blizzard visible en continu
      if (spec.aura) { g.lineStyle(1, C.frost, 0.35); g.strokeCircle(x, y, spec.aura.radius); }
    }

    // Sélection : portée actuelle (blanc) + portée du niveau suivant (pointillés dorés)
    if (t.slotIndex === this.selectedSlot) {
      const curRange: number = spec ? (spec.aura ? spec.aura.radius : spec.stats.range) : def.levels[t.level - 1]!.range;
      g.lineStyle(1, 0xffffff, 0.4); g.strokeCircle(x, y, curRange);
      const next: TowerLevelStats | undefined = spec ? undefined : def.levels[t.level];
      if (next) {
        g.lineStyle(2, 0xe8c252, 0.55);
        const segs: number = 36;
        for (let i: number = 0; i < segs; i += 2) {
          g.beginPath();
          g.arc(x, y, next.range, (i / segs) * Math.PI * 2, ((i + 1) / segs) * Math.PI * 2);
          g.strokePath();
        }
      }
    }
  }

  // ---------- Créatures & héros (sprites Tiny + overlays) ----------

  /** Sens du regard : on mémorise la dernière position pour déduire la direction. */
  private facingOf(uid: number, x: number): number {
    const last: FacingState | undefined = this.facing.get(uid);
    let face: number = last?.face ?? 1;
    if (last && Math.abs(x - last.x) > 0.3) face = x > last.x ? 1 : -1;
    this.facing.set(uid, { x, face });
    return face;
  }

  /** Taille d'affichage d'un ennemi, EN UNITÉS LOGIQUES (ADR-016).
   *  Exprimée en pixels plutôt qu'en facteur d'échelle : les entités faisaient
   *  ~15 px à l'écran et étaient indiscernables. La hiérarchie de taille porte
   *  aussi de l'information — la brute doit se voir grosse au premier regard. */
  private enemySize(e: EnemyState): number {
    // La taille vit dans le registre de skin (ADR-005/022), plus dans une cascade
    // de ternaires ici : à dix créatures elle devenait illisible, et un changement
    // de skin doit pouvoir revoir toute la hiérarchie d'un seul endroit.
    const base: number = enemyView(e.defId).size ?? ENEMY_SIZE_FALLBACK;
    return this.isBoss(e) ? base * 1.45 : base;
  }

  private isBoss(e: EnemyState): boolean {
    return e.maxHp > CONTENT.enemies[e.defId]!.hp * 1.8;
  }

  /** Position/scale/flip/teinte du sprite d'ennemi (appelé chaque frame par SpriteLayer). */
  private placeEnemy(s: Phaser.GameObjects.Sprite, e: EnemyState) {
    const def: EnemyDef = CONTENT.enemies[e.defId]!;
    // Animation procédurale (ADR-017) : marche, vol ou respiration selon l'état.
    // Le déphasage par uid évite qu'une horde entière bouge au même rythme.
    const phase: number = (e.uid % 17) / 17;
    const weight: number = Math.min(1, def.hp / 260);   // la brute pèse, le gobelin sautille
    const pose: UnitPose = def.flying
      ? flyPose(this.time.now, phase)
      : e.blocked
        ? idlePose(this.time.now, phase)
        : walkPose(this.time.now, phase, def.speed / 55, weight);

    const y: number = (def.flying ? e.pos.y - 14 : e.pos.y) + pose.dy;
    const face: number = this.facingOf(e.uid, e.pos.x);
    const size: number = this.enemySize(e);
    s.setOrigin(0.5, 0.62)
      .setDisplaySize(size * pose.scaleX, size * pose.scaleY)
      .setRotation(pose.tilt * face)
      .setFlipX(face < 0);
    s.setPosition(Math.round(e.pos.x), Math.round(y));
    s.setDepth(100 + e.pos.y); // tri en profondeur par position verticale
    // Boss : reteinté or chaud (le registre n'a pas de sprite dédié).
    if (this.isBoss(e)) s.setTint(0xffd98a);
  }

  /** Overlay d'ennemi (gfx) : barre de PV, anneaux de statut, couronne de boss. */
  private drawEnemyOverlay(g: Phaser.GameObjects.Graphics, e: EnemyState) {
    const boss: boolean = this.isBoss(e);
    const r: number = this.enemySize(e) * 0.5;  // rayon visuel du sprite (cale anneaux/barre)
    const x: number = e.pos.x, y: number = e.pos.y - r * 0.4;

    // Gelé : cristaux de givre qui orbitent lentement + halo froid. Un anneau bleu
    // seul ne se distinguait pas d'un anneau de brûlure (ADR-016).
    if (this.run.time < e.slowUntil) {
      const spin: number = this.time.now / 900 + e.uid;
      g.fillStyle(SIGNAL.slow, 0.22);
      g.fillEllipse(x, y + r * 0.5, r * 1.9, r * 0.7);
      for (let i: number = 0; i < 5; i++) {
        const a: number = spin + (i / 5) * Math.PI * 2;
        const px: number = x + Math.cos(a) * (r + 4), py: number = y + Math.sin(a) * (r + 4) * 0.55;
        const s: number = 3.2 + Math.sin(this.time.now / 260 + i) * 0.8;
        g.fillStyle(SIGNAL.slow, 0.95);
        g.fillTriangle(px, py - s, px - s * 0.9, py + s * 0.7, px + s * 0.9, py + s * 0.7);
      }
    }
    // En feu : langues de flamme montantes, jamais un anneau.
    if (this.run.time < e.burnUntil) {
      for (let i: number = 0; i < 4; i++) {
        const ph: number = (this.time.now / 260 + i * 0.27 + e.uid * 0.11) % 1;
        const fx2: number = x + (i - 1.5) * (r * 0.42);
        const fy: number = y + r * 0.35 - ph * (r * 1.5);
        const s: number = (1 - ph) * (r * 0.34) + 2;
        g.fillStyle(i % 2 ? SIGNAL.burn : 0xf5c542, 0.85 * (1 - ph));
        g.fillTriangle(fx2, fy - s * 1.7, fx2 - s * 0.72, fy + s * 0.6, fx2 + s * 0.72, fy + s * 0.6);
      }
    }

    // Couronne de mini-boss
    if (boss) {
      const cy: number = y - r - 7;
      g.fillStyle(0xe8c252);
      g.fillTriangle(x - 8, cy + 4, x - 8, cy - 4, x - 3, cy + 1);
      g.fillTriangle(x - 3, cy + 4, x, cy - 6, x + 3, cy + 4);
      g.fillTriangle(x + 8, cy + 4, x + 8, cy - 4, x + 3, cy + 1);
      g.fillRect(x - 8, cy + 2, 16, 3);
    }

    // Barre PV arrondie (verte → rouge selon les PV restants)
    const pct: number = e.hp / e.maxHp;
    // Barre proportionnelle au sprite : les unités ayant grandi, une largeur fixe
    // aurait paru minuscule au-dessus d'une brute.
    const barW: number = r * 1.5, barH: number = boss ? 6 : 5, barY: number = y - r - (boss ? 16 : 11);
    const barColor: number = pct > 0.55 ? STATUS.hpGood : pct > 0.25 ? STATUS.hpWarn : STATUS.hpBad;
    g.fillStyle(C.hpBack, 0.85); g.fillRoundedRect(x - barW / 2, barY, barW, barH, 2);
    if (pct > 0.05) { g.fillStyle(barColor); g.fillRoundedRect(x - barW / 2, barY, barW * pct, barH, 2); }
  }

  private drawHero(g: Phaser.GameObjects.Graphics) {
    const h: HeroState = this.run.hero;
    this.heroSprite.setVisible(h.alive);
    if (!h.alive) return;
    const moving: boolean = Math.hypot(h.target.x - h.pos.x, h.target.y - h.pos.y) > 2;
    const bob: number = moving ? Math.sin(this.time.now / 110) * 1.5 : 0;
    const x: number = h.pos.x, y: number = h.pos.y + bob;
    const foe: EnemyState | undefined = this.run.enemies.find(e => e.alive && e.blocked);
    const face: number = foe ? (foe.pos.x >= x ? 1 : -1) : this.facingOf(-1, x);

    // --- Cycle de frappe -------------------------------------------------
    // Le combat était un simple cercle blanc clignotant. Ici un vrai cycle :
    // armé (recul) → frappe (bond en avant) → récupération, avec un arc de lame
    // qui balaie l'ennemi. Piloté par l'horloge murale, jamais par la sim.
    const SWING_MS: number = 520;
    const k: number = foe ? (this.time.now % SWING_MS) / SWING_MS : 0; // 0→1
    // Courbe d'attaque : recul lent (0→0,55) puis détente sèche (0,55→0,75).
    const wind: number = k < 0.55 ? -(k / 0.55) * 3.5 : k < 0.75 ? (k - 0.55) / 0.2 * 11 - 3.5 : (1 - (k - 0.75) / 0.25) * 7.5;
    const lunge: number = foe ? wind : 0;
    const tilt: number = foe ? (k < 0.55 ? -0.12 * (k / 0.55) : 0.22 * (1 - (k - 0.55) / 0.45)) : 0;

    this.heroSprite.setFlipX(face < 0).setDisplaySize(58, 58)
      .setRotation(tilt * face)
      .setPosition(Math.round(x + face * lunge), Math.round(y))
      .setDepth(100 + h.pos.y);

    // Arc de lame : visible seulement pendant la détente, il balaie de haut en bas
    // devant le héros. C'est lui qui rend le coup lisible, pas l'étincelle.
    if (foe && k >= 0.55 && k < 0.82) {
      const t: number = (k - 0.55) / 0.27;              // 0→1 sur la frappe
      const a0: number = -1.5, a1: number = 0.9;                 // du haut vers le bas
      const ang: number = a0 + (a1 - a0) * t;
      const cxh: number = x + face * 16, cyh: number = y - 8;
      const rad: number = 26;
      g.lineStyle(4, 0xffffff, 0.85 * (1 - t));
      g.beginPath();
      g.arc(cxh, cyh, rad, face > 0 ? ang - 0.5 : Math.PI - ang + 0.5,
        face > 0 ? ang : Math.PI - ang, face < 0);
      g.strokePath();
      g.lineStyle(2, HERO_C.gold, 0.9 * (1 - t));
      g.beginPath();
      g.arc(cxh, cyh, rad - 5, face > 0 ? ang - 0.4 : Math.PI - ang + 0.4,
        face > 0 ? ang : Math.PI - ang, face < 0);
      g.strokePath();

      // Impact sur l'ennemi, au moment où la lame arrive.
      if (t > 0.45) {
        const ix: number = foe.pos.x, iy: number = foe.pos.y - 6;
        g.fillStyle(0xffffff, 0.85 * (1 - t));
        for (let i: number = 0; i < 4; i++) {
          const sa: number = i * 1.6 + this.time.now / 200;
          g.fillCircle(ix + Math.cos(sa) * 9, iy + Math.sin(sa) * 7, 2.2);
        }
      }
    }

    // Barre PV
    const pct: number = h.hp / h.maxHp;
    const by: number = y - 24;
    g.fillStyle(C.hpBack, 0.85); g.fillRoundedRect(x - 16, by, 32, 5, 2);
    if (pct > 0.04) { g.fillStyle(STATUS.hpGood); g.fillRoundedRect(x - 16, by, 32 * pct, 5, 2); }
  }

  private strokePath(g: Phaser.GameObjects.Graphics, p: Vec2[]) {
    g.beginPath(); g.moveTo(p[0]!.x, p[0]!.y);
    for (let i: number = 1; i < p.length; i++) g.lineTo(p[i]!.x, p[i]!.y);
    g.strokePath();
  }

  /** Des ennemis (vivants ou à venir) utilisent encore ce chemin. */
  private pathInUse(pathIdx: number): boolean {
    return this.run.pendingSpawns.some(p => p.pathIndex === pathIdx)
      || this.run.enemies.some(e => e.alive && e.pathIndex === pathIdx);
  }

  /** La vague suivante fera arriver des ennemis par ce chemin. */
  private nextWaveUsesPath(pathIdx: number): boolean {
    const wave: WaveDef | undefined = this.ch.waves[this.run.waveIndex + 1];
    return !!wave?.spawns.some(sp => (sp.pathIndex ?? 0) === pathIdx);
  }
}
