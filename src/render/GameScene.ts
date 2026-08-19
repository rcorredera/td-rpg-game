// ============================================================
// render/GameScene.ts — Rendu Phaser du run. Lit RunState, ne le
// mute jamais directement : toute action passe par les commandes
// de core/sim.ts (ADR-001).
// Style : vectoriel médiéval dessiné en Graphics (pas d'assets bitmap).
// Terrain, HUD, FX, menu de slot et rendu des entités vivent dans
// render/game/*.ts ; cette scène ne fait plus que le lifecycle,
// l'input et l'orchestration de la boucle update/draw (ADR-034).
// ============================================================

import Phaser from "phaser";
import { CONTENT } from "../content/index";
import {
  castAccountSpell, castRally, castWhirlwind, computeResult, createRun, moveHero, startNextWave, tick,
} from "../core/sim";
import type {
  ChapterDef, EnemyState, PlayableChapter, RallyLevel, RunResult, RunState,
  SimEvent, TowerState, Vec2, WhirlwindLevel,
} from "../core/types";
import type { ProfileService } from "../meta/profile";
import { onSceneResize, preloadUi, setupCamera } from "./ui";
import { preloadIcons } from "./icons";
import { preloadSprites } from "./assets";
import { applyAudioSettings, playSfx, preloadAudio, shotSfx } from "./audio";
import { enemyView, heroView, towerView } from "./sprites";
import { projectileFor, type ProjectileStyle } from "./projectiles";
import { SpriteLayer } from "./EntityLayer";
import { AUTO_WAVE_DELAY_MS } from "./game/constants";
import { BattlefieldEntities } from "./game/entities";
import { FxLayer } from "./game/fx";
import { Hud, type HudCallbacks } from "./game/hud";
import { buildEndRunOverlay, buildQuitConfirm } from "./game/modals";
import { buildSlotMenu } from "./game/slotMenu";
import {
  buildCastle, buildTerrain, drawCastleBar, drawPortals, drawSlotMarkers,
  type CastleBuild, type TerrainBuild,
} from "./game/terrain";

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private profileSvc!: ProfileService;
  private chapterIdx = 0;
  private ch!: PlayableChapter;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private entities!: BattlefieldEntities;
  private fxPool!: FxLayer;
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private selectedSlot = -1;
  /** Or au moment où le menu de slot a été construit — pour le rafraîchir si l'or change (kills async). */
  private menuGold = -1;
  private spellMode = false;
  private ended = false;
  private autoWave = false;
  private autoWaveAt: number | null = null;
  private confirmQuit: Phaser.GameObjects.Container | null = null;
  /** Dernier impact sur le château (flash rouge). */
  private castleHitAt = -9999;
  /** Dernier SFX de coup d'épée du héros — le blocage mêlée est un DPS continu
   *  côté sim (pas un événement par coup, ADR-042), donc le rendu impose lui-même
   *  une cadence de swing plausible plutôt que de jouer le son à chaque frame. */
  private heroAttackAt = -9999;
  private static readonly HERO_ATTACK_INTERVAL_MS = 450;
  /** Couches de sprites retained-mode (ennemis par uid, tours par slotIndex). */
  private enemyLayer!: SpriteLayer<EnemyState>;
  private towerBaseLayer!: SpriteLayer<TowerState>;
  private towerEmblemLayer!: SpriteLayer<TowerState>;
  private heroSprite!: Phaser.GameObjects.Sprite;
  /** Marqueurs de slot vide (sprites statiques, masqués quand une tour occupe le slot). */
  private slotMarkers: Phaser.GameObjects.Image[] = [];
  /** Décor statique (herbe, routes, château) — reconstruit tel quel au resize. */
  private terrain: Phaser.GameObjects.Container | null = null;
  /** Châsse de la jauge du Bastion (habillage du pack) ; `null` sans habillage. */
  private castleBar: Phaser.GameObjects.NineSlice | null = null;

  constructor() { super("game"); }

  init(data: { profileSvc: ProfileService; chapterIndex?: number }) {
    this.profileSvc = data.profileSvc;
    this.chapterIdx = data.chapterIndex ?? 0;
    const ch: ChapterDef | undefined = CONTENT.chapters[this.chapterIdx];
    if (!ch?.playable) throw new Error(`chapitre ${this.chapterIdx} injouable`);
    this.ch = ch;
    this.run = createRun(CONTENT, this.profileSvc.get(), this.chapterIdx);
    this.ended = false; this.selectedSlot = -1; this.spellMode = false;
    this.autoWave = false; this.autoWaveAt = null; this.confirmQuit = null;
    this.castleHitAt = -9999;
  }

  preload() { preloadUi(this); preloadSprites(this); preloadIcons(this); preloadAudio(this); }

  create() {
    setupCamera(this);
    // SoundManager partagé par toutes les scènes (une seule instance Phaser.Game,
    // ADR-037) : appliqué ici aussi pour rester correct même si l'ordre de boot change.
    applyAudioSettings(this, this.profileSvc.audioSettings());
    const terrainBuild: TerrainBuild = buildTerrain(this, this.ch);
    this.terrain = terrainBuild.container;
    this.slotMarkers = terrainBuild.slotMarkers;
    const castleBuild: CastleBuild = buildCastle(this, this.ch);
    this.castleBar = castleBuild.castleBar;
    // Un run ne se rejoue pas : au resize/rotation on ne redémarre PAS la scène,
    // on se contente de réancrer ce qui dépend des bords (décor étendu, HUD).
    onSceneResize(this, () => this.relayout());
    this.enemyLayer = new SpriteLayer<EnemyState>(this, 100);
    this.towerBaseLayer = new SpriteLayer<TowerState>(this, 100);
    this.towerEmblemLayer = new SpriteLayer<TowerState>(this, 100);
    this.heroSprite = this.add.sprite(0, 0, heroView().key).setOrigin(0.5, 0.62);
    // Overlay monde (barres de PV, portées, FX, sélection) : au-dessus des entités, sous le HUD.
    this.gfx = this.add.graphics().setDepth(900);
    this.entities = new BattlefieldEntities();
    this.fxPool = new FxLayer(this);
    this.hud = new Hud(this);
    this.hud.build(this.run.hasAccountSpell, this.hudCallbacks());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onTap(p.worldX, p.worldY));
  }

  /** Actions déclenchées par les boutons du HUD (sorts, vitesse, vague, quitter). */
  private hudCallbacks(): HudCallbacks {
    return {
      onSpell: () => { this.spellMode = true; },
      onRally: () => {
        if (castRally(this.run, CONTENT)) {
          // Onde de portée au lancement : montre la zone d'effet du cri de ralliement
          const sk: RallyLevel = CONTENT.hero.skills.rally.levels[this.run.skillLevels.rally - 1]!;
          this.fxPool.addEffect({ pos: { ...this.run.hero.pos }, radius: sk.radius, until: this.time.now + 650, life: 650, kind: "rally" });
        }
      },
      onWhirlwind: () => {
        const evs: SimEvent[] = [];
        if (castWhirlwind(this.run, CONTENT, evs)) {
          const sk: WhirlwindLevel = CONTENT.hero.skills.whirlwind.levels[this.run.skillLevels.whirlwind - 1]!;
          this.fxPool.addEffect({ pos: { ...this.run.hero.pos }, radius: sk.radius, until: this.time.now + 520, life: 520, kind: "whirl" });
        }
        this.consumeEvents(evs);
      },
      onSpeedToggle: () => { this.run.speed = this.run.speed === 1 ? 2 : 1; },
      onAutoToggle: () => { this.autoWave = !this.autoWave; this.autoWaveAt = null; },
      onNextWave: () => { startNextWave(this.run, CONTENT); },
      onQuit: () => this.openQuitConfirm(),
    };
  }

  /** Réancre ce qui dépend des bords de l'écran (décor étendu, HUD) après un
   *  resize ou une rotation. Le run lui-même n'est jamais touché : les entités
   *  et la sim vivent en coordonnées logiques, indépendantes de l'écran. Le
   *  Bastion n'en dépend pas non plus (ancré au monde) : il n'est pas reconstruit ici. */
  private relayout() {
    this.closeMenu();
    this.terrain?.destroy(true);
    this.terrain = null;
    this.slotMarkers.forEach(m => m.destroy());
    this.slotMarkers = [];
    const terrainBuild: TerrainBuild = buildTerrain(this, this.ch);
    this.terrain = terrainBuild.container;
    this.slotMarkers = terrainBuild.slotMarkers;
    this.hud.destroy();
    this.hud.build(this.run.hasAccountSpell, this.hudCallbacks());
  }

  // ---------- Input ----------

  private onTap(x: number, y: number) {
    if (this.ended || this.confirmQuit) return;
    if (y > this.hud.top) return; // zone HUD bas (suit les bords réels de l'écran)

    if (this.spellMode) {
      const evs: SimEvent[] = [];
      castAccountSpell(this.run, CONTENT, { x, y }, evs);
      this.consumeEvents(evs);
      this.spellMode = false;
      return;
    }

    // Tap sur un slot ? Rayon élargi à 38 (cible tactile ~76px de diamètre, à la
    // limite basse de l'écart mini entre deux dalles sur la carte la plus serrée
    // — ch.5, ~78px — pour ne jamais faire chevaucher deux zones de détection) :
    // 32 obligeait à viser trop précisément une tour déjà posée pour l'améliorer,
    // ce qui faisait déplacer le héros par erreur au lieu d'ouvrir le menu.
    const slotIdx: number = this.ch.map.slots.findIndex(s => Phaser.Math.Distance.Between(x, y, s.x, s.y) < 38);
    if (slotIdx >= 0) { this.openSlotMenu(slotIdx); return; }
    this.closeMenu();

    // Sinon : déplacement du héros
    moveHero(this.run, { x, y });
  }

  private openSlotMenu(slotIdx: number) {
    this.closeMenu();
    this.selectedSlot = slotIdx;
    const unlocks: string[] = this.profileSvc.get().unlocks;
    this.buildMenu = buildSlotMenu(this, this.run, this.ch, unlocks, slotIdx, () => this.closeMenu());
    this.menuGold = this.run.gold;
  }

  private closeMenu() {
    this.buildMenu?.destroy(); this.buildMenu = null; this.selectedSlot = -1;
  }

  private openQuitConfirm() {
    if (this.confirmQuit || this.ended) return;
    this.closeMenu();
    this.confirmQuit = buildQuitConfirm(this,
      () => this.scene.start("menu", { profileSvc: this.profileSvc }),
      () => { this.confirmQuit?.destroy(); this.confirmQuit = null; });
  }

  // ---------- Update ----------

  update(_t: number, dtMs: number) {
    if (!this.ended && !this.confirmQuit) {
      const evs: SimEvent[] = tick(this.run, CONTENT, dtMs / 1000);
      this.consumeEvents(evs);
      this.updateHeroAttackSfx();
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
    this.hud.updateResources({
      gold: r.gold, castleHp: r.castleHp, castleHpMax: r.castleHpMax,
      waveIndex: r.waveIndex, totalWaves: this.ch.waves.length,
    });
    this.hud.updateActions({
      waveReady: r.phase === "building", autoWave: this.autoWave, speed: r.speed,
      wwReadyAt: r.hero.whirlwindReady, rallyReadyAt: r.hero.rallyReady, spellReadyAt: r.accountSpellReady,
      runTime: r.time,
    });
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

  /** Le héros bloque un ennemi terrestre : rejoue le son de coup d'épée à
   *  cadence fixe tant que le combat dure (ADR-042). */
  private updateHeroAttackSfx() {
    if (!this.run.hero.alive || !this.run.enemies.some(e => e.alive && e.blocked)) return;
    const now: number = this.time.now;
    if (now - this.heroAttackAt < GameScene.HERO_ATTACK_INTERVAL_MS) return;
    this.heroAttackAt = now;
    playSfx(this, "heroAttack");
  }

  private consumeEvents(evs: SimEvent[]) {
    for (const e of evs) {
      if (e.type === "explosion") {
        this.fxPool.spawnFlame(e.pos.x, e.pos.y, 0.4 + e.radius / 90);
        playSfx(this, "impact");
        // Grosse zone = sort de compte : on ajoute la volée de flèches qui tombe,
        // au lieu d'une simple déflagration indifférenciée.
        if (e.radius >= CONTENT.accountSpell.radius * 0.9) {
          this.fxPool.addEffect({ pos: { ...e.pos }, radius: e.radius, until: this.time.now + 620, life: 620, kind: "arrows" });
        }
      }
      if (e.type === "shot") {
        // Le projectile VOYAGE : son style dit ce qui frappe (flèche tendue,
        // rocher en cloche, éclat de givre) — cf. registre projectiles.ts.
        const style: ProjectileStyle = projectileFor(e.towerDefId);
        const now: number = this.time.now;
        this.fxPool.addShot({ from: e.from, to: e.to, start: now, until: now + style.flightMs, style });
        playSfx(this, shotSfx(e.towerDefId, e.specId));
        // Recul de la tour au départ du coup : l'animation de tir part de l'arme,
        // pas seulement du projectile.
        const shooter: TowerState | undefined = this.run.towers.find(t => {
          const s: Vec2 = this.ch.map.slots[t.slotIndex]!;
          return Math.hypot(s.x - e.from.x, s.y - e.from.y) < 24;
        });
        if (shooter) this.entities.recordShot(shooter.slotIndex, now);
      }
      if (e.type === "castleHit") {
        const main: Vec2[] = this.ch.map.paths[0]!.waypoints;
        const end: Vec2 = main[main.length - 1]!;
        this.fxPool.spawnFlame(end.x - 18, end.y - 6, 0.8 + e.damage * 0.12);
        this.castleHitAt = this.time.now;
        playSfx(this, "castleHit");
      }
      if (e.type === "enemyDied") playSfx(this, "enemyDied");
      if (e.type === "heroDied") playSfx(this, "heroDied");
    }
  }

  private endRun() {
    this.ended = true;
    const result: RunResult = computeResult(this.run, CONTENT);
    this.profileSvc.applyRunResult(result, this.chapterIdx);
    buildEndRunOverlay(this, result, this.ch.waves.length,
      () => this.scene.start("menu", { profileSvc: this.profileSvc }));
  }

  // ---------- Draw (vectoriel, redessiné chaque frame) ----------

  private draw() {
    const g: Phaser.GameObjects.Graphics = this.gfx;
    g.clear();

    // Le sol + les chemins non-portail sont en tuiles statiques (buildTerrain).
    // Ici, seuls les chemins de Faille (portails) — dynamiques (GDD §Portails).
    const portalWarn: boolean = drawPortals(g, this.ch, this.run, this.time.now);
    this.hud.showPortalWarn(portalWarn);

    // Château : muraille en tuiles (buildCastle). Ici, seul le flash rouge d'impact + la barre PV.
    const main: Vec2[] = this.ch.map.paths[0]!.waypoints;
    const end: Vec2 = main[main.length - 1]!;
    const hitFlash: boolean = this.time.now - this.castleHitAt < 280;
    const castlePct: number = this.run.castleHp / this.run.castleHpMax;
    drawCastleBar(g, this.castleBar, end, castlePct, hitFlash);

    // Slots vides
    drawSlotMarkers(g, this.slotMarkers, this.ch.map.slots,
      i => this.run.towers.some(t => t.slotIndex === i), this.selectedSlot, this.time.now);

    // Tours : le skin médiéval dessine la tour ENTIÈRE (plus de composition
    // socle + emblème, qui n'existait que pour recycler des tourelles sci-fi).
    this.towerBaseLayer.sync(
      this.run.towers, t => t.slotIndex, t => towerView(t.defId, t.level, t.specId).base,
      (s, t) => this.entities.placeTowerPart(s, t, this.ch.map.slots[t.slotIndex]!, this.time.now, -12, 84),
    );
    this.towerEmblemLayer.sync(
      this.run.towers.filter(t => towerView(t.defId).emblem),
      t => t.slotIndex, t => towerView(t.defId).emblem!,
      (s, t) => this.entities.placeTowerPart(s, t, this.ch.map.slots[t.slotIndex]!, this.time.now, -8, 52),
    );
    for (const t of this.run.towers) {
      this.entities.drawTowerOverlay(g, t, this.ch.map.slots[t.slotIndex]!, this.selectedSlot, this.run.time, this.time.now);
    }

    // Ennemis : corps en sprites (retained-mode), barres/statuts en overlay gfx.
    const aliveEnemies: EnemyState[] = this.run.enemies.filter(e => e.alive);
    this.enemyLayer.sync(
      aliveEnemies, e => e.uid, e => enemyView(e.defId),
      (s, e) => this.entities.placeEnemy(s, e, this.time.now),
      s => this.fxPool.spawnFlame(s.x, s.y, 0.55),
    );
    for (const e of aliveEnemies) this.entities.drawEnemyOverlay(g, e, this.run.time, this.time.now);

    // Héros
    const foe: EnemyState | undefined = this.run.enemies.find(e => e.alive && e.blocked);
    this.entities.drawHero(g, this.run.hero, this.heroSprite, foe, this.time.now);

    // Tirs & FX
    this.fxPool.draw(g, this.time.now);

    if (this.spellMode) {
      g.lineStyle(2, 0xe8c252, 0.8);
      g.strokeCircle(this.input.activePointer.worldX, this.input.activePointer.worldY, CONTENT.accountSpell.radius);
    }
  }
}
