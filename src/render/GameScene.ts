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
import type { EnemyState, PlayableChapter, RunState, SimEvent, TowerState } from "../core/types";
import type { ProfileService } from "../meta/profile";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY, onSceneResize, preloadUi, setupCamera, UI_TINT } from "./ui";
import { scaleFont, touchSize, viewport } from "./viewport";
import { ICON, preloadIcons } from "./icons";
import { ensureBackdropTextures, TEX_VIGNETTE } from "./backdrop";
import { uiButton, uiPanel } from "./components";
import { preloadSprites, TEX } from "./assets";
import { enemyView, heroView, keepView, tileFor, towerView } from "./sprites";
import { drawDirtPath, ensureTerrainTextures, TEX_GRASS } from "./terrain";
import { GROUND, HERO_C, SIGNAL } from "./palette";
import { projectileFor, projectilePoint, type ProjectileStyle } from "./projectiles";
import { SpriteLayer } from "./EntityLayer";
import { STATUS } from "./theme";

// Palette médiévale (parchemin/forêt/pierre)
const C = {
  grass: 0x4a6741, path: 0xb59a6a, pathEdge: 0x8a7350,
  stone: 0x8d8d93, wood: 0x7a5436, slot: 0x6b5a3e,
  archer: 0x3e6b8c, catapult: 0x8c5a3e, frost: 0x7ec8e3, portal: 0x9b59b6,
  goblin: 0x77a83a, orc: 0x5a7a3a, brute: 0x6b4a3a, bat: 0x5a4a6b,
  hero: 0xc9a227, heroBlade: 0xd9d9e0, castle: 0x9a9aa5,
  hpBack: 0x222222, hpFront: 0xc0392b, gold: 0xe8c252, ui: 0x2b2118, uiText: "#f0e6d2",
};

// Champ de bataille : défini par le core (source unique), pas redéclaré ici.
const GAME_W = BATTLEFIELD.w, GAME_H = BATTLEFIELD.h;
/** Voile des modales : volontairement plus grand que tout écran plausible, pour
 *  couvrir la vue quelle que soit sa taille sans avoir à le redimensionner. */
const VEIL = 4000;

/** Distance d'un point à un segment [a,b] (pour éviter de poser du décor sur la route). */
function distToSeg(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
// Délai UI avant l'enchaînement auto des vagues (confort, pas de l'équilibrage).
const AUTO_WAVE_DELAY_MS = 2000;

export class GameScene extends Phaser.Scene {
  private run!: RunState;
  private profileSvc!: ProfileService;
  private chapterIdx = 0;
  private ch!: PlayableChapter;
  private gfx!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Container;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private selectedSlot = -1;
  /** Or au moment où le menu de slot a été construit — pour le rafraîchir si l'or change (kills async). */
  private menuGold = -1;
  private spellMode = false;
  /** Effets transitoires. `kind` choisit le rendu : chaque sort doit être
   *  reconnaissable à sa forme, pas seulement à sa couleur (ADR-016). */
  private fx: {
    pos: { x: number; y: number }; radius: number; until: number;
    life?: number; color?: number; kind?: "whirl" | "rally" | "arrows";
  }[] = [];
  /** Projectiles en vol : chacun porte son style (ADR-016) et l'instant de départ,
   *  pour être interpolé le long de sa trajectoire au lieu d'être un trait fixe. */
  private shots: {
    from: { x: number; y: number }; to: { x: number; y: number };
    start: number; until: number; style: ProjectileStyle;
  }[] = [];
  /** Recul des tours au tir : slotIndex → instant du tir. */
  private towerRecoil = new Map<number, number>();
  private ended = false;
  private autoWave = false;
  private autoWaveAt: number | null = null;
  private confirmQuit: Phaser.GameObjects.Container | null = null;
  /** Direction du regard par entité (uid → dernière x). uid -1 = héros. */
  private facing = new Map<number, { x: number; face: number }>();
  /** Dernier impact sur le château (flash rouge). */
  private castleHitAt = -9999;
  private hudPlates: Record<string, Phaser.GameObjects.NineSlice> = {};
  private hudIcons: Record<string, Phaser.GameObjects.Image> = {};
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
  /** Bord gauche sûr du HUD : origine de la cascade or / base / vague. */
  private hudLeftX = 0;

  constructor() { super("game"); }

  init(data: { profileSvc: ProfileService; chapterIndex?: number }) {
    this.profileSvc = data.profileSvc;
    this.chapterIdx = data.chapterIndex ?? 0;
    const ch = CONTENT.chapters[this.chapterIdx];
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
    const cont = this.add.container(0, 0).setDepth(-10);
    this.terrain = cont;
    const v = viewport();

    // Sol généré (ADR-016) : nuances, touffes et grain, dans une gamme désaturée
    // qui laisse les unités ressortir. Remplace la tuile d'herbe fluo du pack.
    ensureTerrainTextures(this);
    if (this.textures.exists(TEX_GRASS)) {
      cont.add(this.add.tileSprite(v.left, v.top, v.width, v.height, TEX_GRASS).setOrigin(0, 0));
    } else {
      cont.add(this.add.rectangle(v.left, v.top, v.width, v.height, GROUND.grass).setOrigin(0, 0));
    }

    // Chemins : un seul tracé continu, bordé. L'ancien estampage d'une tuile tous
    // les 16 px laissait des bosses régulières bien visibles.
    const roads = this.add.graphics();
    for (const p of this.ch.map.paths) {
      if (p.portal) continue; // les Failles n'apparaissent que lorsqu'elles sont actives (draw())
      drawDirtPath(roads, this.smoothPath(p.waypoints));
    }
    cont.add(roads);

    this.buildBattlefieldFrame(cont);

    // Emplacements de tour : dalle de pierre, bien plus grande qu'avant — les
    // unités et les tours ont grandi, les repères de construction devaient suivre.
    this.slotMarkers = this.ch.map.slots.map(s =>
      this.add.image(s.x, s.y, tileFor("pad").key).setDisplaySize(64, 64).setDepth(50),
    );
  }

  /** Polyligne lissée (spline) utilisée pour le tracé VISUEL des chemins — la sim
   *  suit toujours les segments linéaires (ADR-001). */
  private smoothPath(wps: readonly { x: number; y: number }[]): { x: number; y: number }[] {
    const spline = new Phaser.Curves.Spline(wps.map(w => new Phaser.Math.Vector2(w.x, w.y)));
    const n = Math.max(8, Math.round(spline.getLength() / 12));
    return spline.getSpacedPoints(n).map(p => ({ x: p.x, y: p.y }));
  }

  /** Délimite le champ de bataille. L'écran déborde de la zone de jeu (ADR-010) :
   *  sans repère, la carte a l'air de flotter au milieu d'un terrain jouable qui ne
   *  l'est pas. Le débord est donc assombri et la zone cernée d'un liseré — cohérent
   *  avec le fait que le héros ne peut pas en sortir (`moveHero`).
   *  Ajouté au container de terrain : détruit et reconstruit avec lui au resize. */
  private buildBattlefieldFrame(cont: Phaser.GameObjects.Container) {
    const v = viewport();

    // Vignette sur la zone de jeu : concentre le regard au centre et évite l'aplat
    // uniforme d'herbe d'un bord à l'autre (ADR-014).
    ensureBackdropTextures(this);
    if (this.textures.exists(TEX_VIGNETTE)) {
      cont.add(this.add.image(GAME_W / 2, GAME_H / 2, TEX_VIGNETTE)
        .setDisplaySize(GAME_W, GAME_H).setAlpha(0.55));
    }

    const g = this.add.graphics();
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
    const main = this.ch.map.paths[0]!.waypoints;
    const end = main[main.length - 1]!;
    const cont = this.add.container(0, 0).setDepth(100 + end.y);
    // Ramené dans le champ de bataille : les chemins finissent au bord droit, un
    // Bastion centré sur le waypoint final débordait hors cadre (vu à l'écran).
    const kx = Math.min(end.x, GAME_W - 62), ky = Math.min(end.y, GAME_H - 70);
    cont.add(this.add.ellipse(kx, ky + 30, 110, 30, 0x1e2a17, 0.3));
    cont.add(this.add.image(kx, ky - 6, keepView().key).setDisplaySize(124, 124));
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
    const slotIdx = this.ch.map.slots.findIndex(s => Phaser.Math.Distance.Between(x, y, s.x, s.y) < 32);
    if (slotIdx >= 0) { this.openSlotMenu(slotIdx); return; }
    this.closeMenu();

    // Sinon : déplacement du héros
    moveHero(this.run, { x, y });
  }

  private openSlotMenu(slotIdx: number) {
    this.closeMenu();
    this.selectedSlot = slotIdx;
    const slot = this.ch.map.slots[slotIdx]!;
    const existing = this.run.towers.find(t => t.slotIndex === slotIdx);
    // Le menu reste dans les bords sûrs de l'écran courant, pas du cadre 800×600.
    const v = viewport();
    const menu = this.add.container(
      Phaser.Math.Clamp(slot.x, v.safeLeft + 125, v.safeRight - 125),
      Math.max(v.safeTop + 70, slot.y - 70),
    );
    const unlocks = this.profileSvc.get().unlocks;

    // cb null = entrée désactivée (or insuffisant) : grisée, coût en rouge.
    // sub/sub2 = lignes secondaires (pitch, stats).
    let entries: { label: string; sub?: string; sub2?: string; cb: (() => void) | null; color?: string }[] = [];
    if (!existing) {
      entries = Object.values(CONTENT.towers)
        .filter(t => !t.requiresUnlock || unlocks.includes(t.requiresUnlock))
        .map(t => {
          const cost = t.costs[0]!;
          const lv1 = t.levels[0]!;
          const afford = this.run.gold >= cost;
          const role = t.splashRadius > 0 ? "zone" : "monocible";
          const extra = t.groundOnly ? " · ignore les volants" : t.slow ? " · ralentit" : " · vise tout";
          return {
            label: `${t.name} (${cost} ◆)`,
            sub: `⚔ ${lv1.damage}  ⊙ ${lv1.range}  ${lv1.fireRate}/s · ${role}${extra}`,
            color: afford ? C.uiText : "#e74c3c",
            cb: afford ? () => { buildTower(this.run, CONTENT, slotIdx, t.id, unlocks); this.closeMenu(); } : null,
          };
        });
    } else {
      const def = CONTENT.towers[existing.defId]!;
      if (existing.level < def.levels.length) {
        const cost = def.costs[existing.level]!;
        const cur = def.levels[existing.level - 1]!, next = def.levels[existing.level]!;
        const afford = this.run.gold >= cost;
        entries.push({
          label: `Améliorer niv.${existing.level + 1} (${cost} ◆)`,
          sub: `⚔ ${cur.damage}→${next.damage}  ⊙ ${cur.range}→${next.range}  ${cur.fireRate}→${next.fireRate}/s`,
          color: afford ? C.uiText : "#e74c3c",
          cb: afford ? () => { upgradeTower(this.run, CONTENT, slotIdx); this.closeMenu(); } : null,
        });
      } else if (!existing.specId && def.specs?.length) {
        // Niveau 4 : choix de spécialisation (exclusif et définitif), avec deltas de stats
        const cur = def.levels[def.levels.length - 1]!;
        for (const sp of def.specs) {
          const afford = this.run.gold >= sp.cost;
          const stats = sp.aura
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
        const spec = specOf(CONTENT, existing);
        entries.push({ label: spec ? `★ ${spec.name}` : "Niveau max", color: "#27ae60", cb: () => this.closeMenu() });
      }
      // Vente : rembourse un % de l'investissement (GDD §Tours)
      const refund = sellRefundFor(CONTENT, existing.defId, existing.level, existing.specId);
      entries.push({
        label: `Vendre (+${refund} ◆)`,
        color: "#e8a87c",
        cb: () => { sellTower(this.run, CONTENT, slotIdx); this.closeMenu(); },
      });
    }

    let yOff = 0;
    for (const e of entries) {
      const enabled = e.cb !== null;
      const hgt = e.sub2 ? 58 : e.sub ? 44 : 30;
      const cy = yOff + hgt / 2;
      const bg = uiPanel(this, 0, cy, 230, hgt, enabled ? UI_TINT.panel : UI_TINT.panelDim, enabled ? 1 : 0.8);
      menu.add(bg);
      const edge = this.add.graphics();
      edge.lineStyle(1, enabled ? 0xc9a227 : 0x6b5a3e, 0.9);
      edge.strokeRoundedRect(-115, yOff, 230, hgt, 8);
      menu.add(edge);
      const labelY = e.sub2 ? cy - 17 : e.sub ? cy - 8 : cy;
      const txt = this.add.text(0, labelY, e.label, {
        fontSize: "14px", color: e.color ?? C.uiText, fontFamily: FONT_BODY,
      }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75);
      menu.add(txt);
      if (e.sub) {
        menu.add(this.add.text(0, e.sub2 ? cy - 1 : cy + 10, e.sub, {
          fontSize: "11px", color: "#a89878", fontFamily: FONT_BODY,
        }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75));
      }
      if (e.sub2) {
        menu.add(this.add.text(0, cy + 15, e.sub2, {
          fontSize: "11px", color: "#f0e6d2", fontFamily: FONT_BODY,
        }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75));
      }
      if (enabled) {
        const zone = this.add.zone(0, cy, 230, hgt).setInteractive({ cursor: CURSOR_POINT });
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

  // ---------- HUD ----------

  private buildHud() {
    this.hud = this.add.container(0, 0);
    const v = viewport();
    // Le HUD s'ancre aux bords RÉELS de l'écran, pas au cadre 800×600 : ressources
    // à gauche, actions et sorts à droite (sous le pouce). Sur un écran large, la
    // barre s'étale au lieu de laisser du vide sur les côtés (ADR-010).
    // La barre se dimensionne d'après ses boutons, pas l'inverse : sur mobile leur
    // plancher tactile dépasse la hauteur historique de 70 (ADR-011).
    const btnH = touchSize(40);
    const iconS = touchSize(48);
    const barH = Math.max(70, Math.max(btnH, iconS) + 22);
    const cy = v.safeBottom - barH / 2;   // axe des contrôles
    this.hudTop = v.safeBottom - barH;
    const xL = v.safeLeft, xR = v.safeRight;

    const bar = this.add.graphics();
    bar.fillStyle(C.ui, 0.97); bar.fillRect(v.left, this.hudTop, v.width, v.bottom - this.hudTop);
    bar.lineStyle(2, 0xc9a227, 0.35); bar.lineBetween(v.left, this.hudTop, v.right, this.hudTop);
    this.hud.add(bar);

    // Libellé passif (sans plaque), aligné à gauche : le groupe est ensuite mis en
    // cascade d'après les largeurs réelles (`layoutHudLeft`), car les valeurs
    // changent en jeu et les polices sont remontées sur petit écran (ADR-015).
    const mk = (key: string, _x: number, label: string, size = 16) => {
      const t = this.add.text(0, cy, label, { fontSize: `${size}px`, color: C.uiText, fontFamily: FONT_DISPLAY }).setOrigin(0, 0.5);
      this.hudTexts[key] = t; this.hud.add(t);
    };
    // Bouton Kenney nine-slice (gold = action principale). La plaque s'élargit pour
    // contenir son libellé, comme `uiButton`.
    const mkBtn = (key: string, x: number, w: number, label: string, cb: () => void, size = 14, gold = false) => {
      const plate = this.add.nineslice(x, cy, gold ? "ui_btn_gold" : "ui_btn", undefined, w, btnH, 14, 14, 14, 16);
      if (!gold) plate.setTint(UI_TINT.btn);
      plate.setInteractive({ cursor: CURSOR_POINT })
        .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); cb(); });
      this.hudPlates[key] = plate; this.hud.add(plate);
      const t = this.add.text(x, cy - 2, label, {
        fontSize: `${size}px`, color: gold ? "#3a2c12" : C.uiText, fontFamily: FONT_DISPLAY,
      }).setOrigin(0.5);
      if (t.width + 20 > plate.width) plate.setSize(t.width + 20, btnH);
      this.hudTexts[key] = t; this.hud.add(t);
      return plate.width;
    };
    // Sorts : boutons-icônes carrés (cooldown affiché sous l'icône)
    const mkIconBtn = (key: string, x: number, icon: string, cb: () => void) => {
      const plate = this.add.nineslice(x, cy, "ui_btn", undefined, iconS, iconS, 14, 14, 14, 16);
      plate.setTint(UI_TINT.btn);
      plate.setInteractive({ cursor: CURSOR_POINT })
        .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); cb(); });
      this.hudPlates[key] = plate; this.hud.add(plate);
      const glyph = iconS * 0.54;
      const img = this.add.image(x, cy - iconS * 0.08, icon).setDisplaySize(glyph, glyph).setTint(0xf0e6d2);
      this.hudIcons[key] = img; this.hud.add(img);
      const cd = this.add.text(x, cy + iconS * 0.33, "", { fontSize: "10px", color: "#e8c252", fontFamily: FONT_DISPLAY }).setOrigin(0.5);
      this.hudTexts[key] = cd; this.hud.add(cd);
    };

    // --- Groupe gauche : état du run (lecture seule) ---
    mk("gold", 0, "");
    // Icône du registre plutôt qu'un emoji 🏰 : rendu identique sur tout OS et
    // teintable (elle vire au rouge quand la base souffre — cf. update()).
    const cs = Math.max(17, scaleFont(15));
    this.hudIcons["castle"] = this.add.image(0, cy, ICON.castle).setDisplaySize(cs, cs);
    this.hud.add(this.hudIcons["castle"]!);
    mk("castle", 0, "");
    mk("wave", 0, "", 15);
    this.hudLeftX = xL + 14;

    // --- Groupe droit : actions, posées de droite à gauche ---
    // Les sorts occupent l'extrémité (les plus utilisés en combat), puis les
    // contrôles de vague. `▶ Vague` reste en or : c'est l'action principale.
    // Posés de droite à gauche à partir du bord sûr, chacun d'après sa largeur
    // effective : les boutons grossissent sur mobile sans jamais se chevaucher.
    let x = xR - 16;
    // `draw` renvoie la largeur EFFECTIVE de la plaque (elle a pu s'élargir pour
    // loger son libellé) : sans ça, les boutons se chevauchaient sur petit écran.
    const place = (w: number, draw: (cx: number) => number | void) => {
      x -= w / 2;
      const real = draw(x) ?? w;
      x -= Math.max(w, real) / 2 + 8 + Math.max(0, real - w) / 2;
    };
    if (this.run.hasAccountSpell) {
      place(iconS, cx => mkIconBtn("spell", cx, "icon_spell", () => { this.spellMode = true; }));
    }
    place(iconS, cx => mkIconBtn("rally", cx, "icon_rally", () => {
      if (castRally(this.run, CONTENT)) {
        // Onde de portée au lancement : montre la zone d'effet du cri de ralliement
        const sk = CONTENT.hero.skills.rally.levels[this.run.skillLevels.rally - 1]!;
        this.fx.push({ pos: { ...this.run.hero.pos }, radius: sk.radius, until: this.time.now + 650, life: 650, kind: "rally" });
      }
    }));
    place(iconS, cx => mkIconBtn("ww", cx, "icon_ww", () => {
      const evs: SimEvent[] = [];
      if (castWhirlwind(this.run, CONTENT, evs)) {
        const sk = CONTENT.hero.skills.whirlwind.levels[this.run.skillLevels.whirlwind - 1]!;
        this.fx.push({ pos: { ...this.run.hero.pos }, radius: sk.radius, until: this.time.now + 520, life: 520, kind: "whirl" });
      }
      this.consumeEvents(evs);
    }));
    const wSpeed = touchSize(48), wAuto = touchSize(76), wWave = touchSize(100);
    place(wSpeed, cx => mkBtn("speed", cx, wSpeed, "x1", () => { this.run.speed = this.run.speed === 1 ? 2 : 1; }));
    place(wAuto, cx => mkBtn("auto", cx, wAuto, "Auto ✗", () => { this.autoWave = !this.autoWave; this.autoWaveAt = null; }));
    place(wWave, cx => mkBtn("nextWave", cx, wWave, "▶ Vague", () => { startNextWave(this.run, CONTENT); }, 15, true));

    // Séparateur entre le bloc d'état et le bloc d'actions
    bar.lineStyle(1, 0xc9a227, 0.15);
    bar.lineBetween(x - 8, this.hudTop + 12, x - 8, v.safeBottom - 12);
    this.hud.setDepth(1000);

    // Bouton quitter : coin haut-gauche sûr (sous l'encoche éventuelle). Sa hauteur
    // effective décide de son centre, sinon il déborderait au-dessus sur mobile.
    const quitH = touchSize(32), quitW = touchSize(86);
    this.quitBtn = uiButton(this, v.safeLeft + 10 + quitW / 2, v.safeTop + 8 + quitH / 2, "⟵ Camp",
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
    const c = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(3000);
    c.add(this.add.rectangle(0, 0, VEIL, VEIL, 0x000000, 0.5));
    c.add(uiPanel(this, 0, 0, 420, 190));
    const edge = this.add.graphics();
    edge.lineStyle(2, 0xc9a227, 1); edge.strokeRoundedRect(-210, -95, 420, 190, 14);
    c.add(edge);
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
      const evs = tick(this.run, CONTENT, dtMs / 1000);
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
    const r = this.run;
    this.hudTexts["gold"]?.setText(`◆ ${r.gold}`).setColor("#e8c252");
    const castlePct = r.castleHp / r.castleHpMax;
    const castleTint = castlePct > 0.55 ? 0xf0e6d2 : castlePct > 0.25 ? 0xe8c252 : 0xc0392b;
    this.hudTexts["castle"]?.setText(`${r.castleHp}/${r.castleHpMax}`)
      .setColor(castlePct > 0.55 ? C.uiText : castlePct > 0.25 ? "#e8c252" : "#c0392b");
    this.hudIcons["castle"]?.setTint(castleTint);
    this.hudTexts["wave"]?.setText(`Vague ${Math.max(0, r.waveIndex + 1)}/${this.ch.waves.length}`);
    this.layoutHudLeft();
    const waveReady = r.phase === "building";
    this.hudTexts["nextWave"]?.setAlpha(waveReady ? 1 : 0.35);
    this.hudPlates["nextWave"]?.setAlpha(waveReady ? 1 : 0.35);
    this.hudTexts["auto"]?.setText(this.autoWave ? "Auto ✓" : "Auto ✗").setColor(this.autoWave ? "#27ae60" : C.uiText);
    this.hudTexts["speed"]?.setText(`x${r.speed}`).setColor(r.speed === 2 ? "#e8c252" : C.uiText);
    const skill = (key: string, readyAt: number) => {
      const left = readyAt - r.time;
      const onCd = left > 0;
      this.hudTexts[key]?.setText(onCd ? `${Math.ceil(left)}s` : "");
      this.hudPlates[key]?.setAlpha(onCd ? 0.45 : 1);
      this.hudIcons[key]?.setAlpha(onCd ? 0.4 : 1);
    };
    skill("ww", r.hero.whirlwindReady);
    skill("rally", r.hero.rallyReady);
    skill("spell", r.accountSpellReady);
  }

  /** Met en cascade or → base → vague d'après leurs largeurs courantes. Recalculé
   *  à chaque frame car les valeurs changent en jeu (« 160 » puis « 1160 ») et une
   *  position fixe finissait par faire se chevaucher les libellés. */
  private layoutHudLeft() {
    const gap = 16;
    let x = this.hudLeftX;
    const put = (t?: Phaser.GameObjects.Text) => {
      if (!t) return;
      t.setX(x);
      x += t.width + gap;
    };
    put(this.hudTexts["gold"]);
    const icon = this.hudIcons["castle"];
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
        const style = projectileFor(e.towerDefId);
        const now = this.time.now;
        this.shots.push({ from: e.from, to: e.to, start: now, until: now + style.flightMs, style });
        // Recul de la tour au départ du coup : l'animation de tir part de l'arme,
        // pas seulement du projectile.
        const shooter = this.run.towers.find(t => {
          const s = this.ch.map.slots[t.slotIndex]!;
          return Math.hypot(s.x - e.from.x, s.y - e.from.y) < 24;
        });
        if (shooter) this.towerRecoil.set(shooter.slotIndex, now);
      }
      if (e.type === "castleHit") {
        const main = this.ch.map.paths[0]!.waypoints;
        const end = main[main.length - 1]!;
        this.spawnFlame(end.x - 18, end.y - 6, 0.8 + e.damage * 0.12);
        this.castleHitAt = this.time.now;
      }
    }
  }

  /** Dessine un projectile en vol selon son style (ADR-016). L'impact est produit
   *  à l'ARRIVÉE, pas au départ : avant, la déflagration apparaissait sur la cible
   *  au moment du tir, ce qui rendait la trajectoire inutile. */
  private drawProjectile(
    g: Phaser.GameObjects.Graphics,
    s: { from: { x: number; y: number }; to: { x: number; y: number }; start: number; until: number; style: ProjectileStyle },
    now: number,
  ) {
    const st = s.style;
    const t = (now - s.start) / Math.max(1, s.until - s.start);
    const from = { x: s.from.x, y: s.from.y - 10 };
    const p = projectilePoint(from, s.to, t, st.arc);

    if (st.trail > 0) {
      const back = projectilePoint(from, s.to, Math.max(0, t - st.trail / 200), st.arc);
      g.lineStyle(2, st.color, 0.45);
      g.lineBetween(back.x, back.y, p.x, p.y);
    }

    if (st.kind === "arrow") {
      const tip = projectilePoint(from, s.to, Math.min(1, t + 0.06), st.arc);
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
      const a = st.spin ? now / 60 : 0;
      g.fillStyle(st.color, 1);
      g.fillTriangle(
        p.x + Math.cos(a) * st.size, p.y + Math.sin(a) * st.size,
        p.x + Math.cos(a + 2.1) * st.size, p.y + Math.sin(a + 2.1) * st.size,
        p.x + Math.cos(a + 4.2) * st.size, p.y + Math.sin(a + 4.2) * st.size,
      );
    }

    // Impact : déclenché une seule fois, quand le projectile arrive vraiment.
    if (t >= 1 && !(s as { hit?: boolean }).hit) {
      (s as { hit?: boolean }).hit = true;
      this.spawnFlame(s.to.x, s.to.y - 6, st.kind === "boulder" ? 0.55 : 0.3);
    }
  }

  /** Flamme/explosion transitoire (sprite flamme Kenney TD #296) : grandit puis s'efface. */
  private spawnFlame(x: number, y: number, scale = 0.6) {
    const f = this.add.image(x, y, TEX.td, 296).setScale(scale * 0.4).setDepth(850).setAlpha(0.95);
    this.tweens.add({ targets: f, scale, alpha: 0, duration: 280, ease: "Quad.out", onComplete: () => f.destroy() });
  }

  private endRun() {
    this.ended = true;
    const result = computeResult(this.run, CONTENT);
    this.profileSvc.applyRunResult(result, this.chapterIdx);
    const overlay = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(4000);
    overlay.add(this.add.rectangle(0, 0, VEIL, VEIL, 0x000000, 0.45));
    overlay.add(uiPanel(this, 0, 0, 420, 240));
    const edge = this.add.graphics();
    edge.lineStyle(2, 0xc9a227, 1); edge.strokeRoundedRect(-210, -120, 420, 240, 14);
    overlay.add(edge);
    overlay.add(this.add.text(0, -88, result.victory ? "Victoire !" : "Défaite", { fontSize: "30px", color: "#e8c252", fontFamily: FONT_DISPLAY }).setOrigin(0.5));
    if (result.victory) {
      const stars = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
      overlay.add(this.add.text(0, -56, stars, { fontSize: "26px", color: "#e8c252", fontFamily: FONT_BODY }).setOrigin(0.5));
    }
    overlay.add(this.add.text(0, -30, `Vagues : ${result.wavesCleared}/${this.ch.waves.length}`, { fontSize: "18px", color: C.uiText, fontFamily: FONT_BODY }).setOrigin(0.5));
    overlay.add(this.add.text(0, 5, `Éclats gagnés : +${result.shards}`, { fontSize: "20px", color: "#7ec8e3", fontFamily: FONT_BODY }).setOrigin(0.5));
    if (result.sceaux > 0) overlay.add(this.add.text(0, 32, `Sceaux gagnés : +${result.sceaux} ⚜ (${result.heroKills} kills du héros)`, { fontSize: "15px", color: "#c97ba2", fontFamily: FONT_BODY }).setOrigin(0.5));
    overlay.add(uiButton(this, 0, 75, "Retour au campement", { w: 240, h: 44, gold: true, fontSize: 17 },
      () => this.scene.start("menu", { profileSvc: this.profileSvc })).container);
  }

  // ---------- Draw (vectoriel, redessiné chaque frame) ----------

  private draw() {
    const g = this.gfx;
    g.clear();

    // Le sol + les chemins non-portail sont en tuiles statiques (buildTerrain).
    // Ici, seuls les chemins de Faille (portails) — dynamiques : n'apparaissent que
    // lorsqu'ils sont actifs ou annoncés pour la vague suivante (GDD §Portails).
    this.ch.map.paths.forEach((p, i) => {
      if (!p.portal) return;
      const active = this.pathInUse(i);
      const announced = this.run.phase === "building" && this.nextWaveUsesPath(i);
      if (!active && !announced) return;
      const alpha = active ? 1 : 0.35;
      g.lineStyle(36, C.portal, 0.25 * alpha); this.strokePath(g, p.waypoints);
      g.lineStyle(30, C.path, 0.7 * alpha); this.strokePath(g, p.waypoints);
      // Vortex à l'entrée du portail
      const o = p.waypoints[0]!;
      const pulse = 3 * Math.sin(this.time.now / 150);
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
    const main = this.ch.map.paths[0]!.waypoints;
    const end = main[main.length - 1]!;
    const hitFlash = this.time.now - this.castleHitAt < 280;
    if (hitFlash) { g.fillStyle(0xc0392b, 0.35); g.fillRect(end.x - 34, end.y - 24, 100, 64); }

    // Barre de PV de la base, toujours visible au-dessus du château
    {
      const pct = Math.max(0, this.run.castleHp / this.run.castleHpMax);
      const bx = Math.min(end.x - 62, GAME_W - 78), by = end.y - 78, bw = 72, bh = 9;
      const color = pct > 0.55 ? 0x27ae60 : pct > 0.25 ? 0xe8c252 : 0xc0392b;
      g.fillStyle(C.hpBack, 0.9); g.fillRoundedRect(bx, by, bw, bh, 4);
      if (pct > 0.03) { g.fillStyle(color); g.fillRoundedRect(bx, by, bw * pct, bh, 4); }
      g.lineStyle(1, hitFlash ? 0xc0392b : 0xc9a227, hitFlash ? 1 : 0.6);
      g.strokeRoundedRect(bx, by, bw, bh, 4);
    }

    // Slots vides : marqueur masqué dès qu'une tour occupe le slot, sinon
    // anneau doré pulsé + croix « + » pour signaler « construire ici ».
    for (let i = 0; i < this.ch.map.slots.length; i++) {
      const occupied = this.run.towers.some(t => t.slotIndex === i);
      this.slotMarkers[i]?.setVisible(!occupied);
      if (occupied) continue;
      const s = this.ch.map.slots[i]!;
      const sel = i === this.selectedSlot;
      const pulse = Math.sin(this.time.now / 350 + i) * 1.5;
      const rad = 24 + pulse;
      g.lineStyle(2, 0xe8c252, sel ? 0.95 : 0.55);
      const segs = 28;
      for (let k = 0; k < segs; k += 2) {
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
      this.run.towers, t => t.slotIndex, t => towerView(t.defId).base, (s, t) => this.placeTowerPart(s, t, -12, 84),
    );
    this.towerEmblemLayer.sync(
      this.run.towers.filter(t => towerView(t.defId).emblem),
      t => t.slotIndex, t => towerView(t.defId).emblem!, (s, t) => this.placeTowerPart(s, t, -8, 52),
    );
    for (const t of this.run.towers) this.drawTowerOverlay(g, t);

    // Ennemis : corps en sprites (retained-mode), barres/statuts en overlay gfx.
    const aliveEnemies = this.run.enemies.filter(e => e.alive);
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
    const now = this.time.now;
    this.shots = this.shots.filter(s => s.until > now);
    for (const s of this.shots) this.drawProjectile(g, s, now);
    this.fx = this.fx.filter(f => f.until > now);
    for (const f of this.fx) {
      const life = f.life ?? 220;
      const t = 1 - (f.until - now) / life; // 0 → 1
      const fade = 1 - t;
      if (f.kind === "whirl") {
        // Tournoiement : trois bras en spirale qui s'ouvrent en tournant, plus
        // une onde de bord. Un cercle seul ne disait pas « ça tourne ».
        const spin = t * 7;
        for (let arm = 0; arm < 3; arm++) {
          g.lineStyle(4 - arm, HERO_C.gold, 0.85 * fade);
          g.beginPath();
          const base = spin + (arm * Math.PI * 2) / 3;
          for (let s = 0; s <= 12; s++) {
            const u = s / 12;
            const rr = f.radius * t * u;
            const aa = base + u * 2.6;
            const px = f.pos.x + Math.cos(aa) * rr, py = f.pos.y + Math.sin(aa) * rr * 0.72;
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
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const rr = f.radius * t;
          g.fillStyle(HERO_C.gold, 0.7 * fade);
          g.fillCircle(f.pos.x + Math.cos(a) * rr, f.pos.y + Math.sin(a) * rr * 0.65, 3 * fade + 1);
        }
      } else if (f.kind === "arrows") {
        // Pluie de flèches : une volée qui TOMBE vraiment dans la zone, puis se
        // plante. Auparavant, le sort le plus coûteux du jeu ne produisait qu'un
        // cercle, indiscernable d'un tir de catapulte.
        g.lineStyle(2, 0xf0e6d2, 0.35 * fade);
        g.strokeEllipse(f.pos.x, f.pos.y, f.radius * 2, f.radius * 1.15);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + i;
          const rr = f.radius * (0.25 + ((i * 37) % 100) / 130);
          const tx = f.pos.x + Math.cos(a) * rr, ty = f.pos.y + Math.sin(a) * rr * 0.62;
          const delay = ((i * 13) % 40) / 100;          // volée échelonnée
          const p = Math.min(1, Math.max(0, (t - delay) / 0.45));
          if (p <= 0) continue;
          const fall = (1 - p) * 90;                    // hauteur de chute restante
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
    const slot = this.ch.map.slots[t.slotIndex]!;
    const firedAt = this.towerRecoil.get(t.slotIndex);
    const age = firedAt === undefined ? Infinity : this.time.now - firedAt;
    const RECOIL_MS = 160;
    // 1 → 0 sur la durée du recul ; squash vertical + léger enfoncement.
    const k = age < RECOIL_MS ? 1 - age / RECOIL_MS : 0;
    const squash = 1 - 0.12 * k;
    s.setOrigin(0.5, 0.86)
      .setDisplaySize(size * (1 + 0.06 * k), size * squash)
      .setPosition(slot.x, slot.y + dy + 4 * k)
      .setDepth(100 + slot.y + (dy < 0 ? 1 : 0));
  }

  /** Overlay de tour (gfx) : ralliement, pips de niveau, étoile/aura de spec, portée à la sélection. */
  private drawTowerOverlay(g: Phaser.GameObjects.Graphics, t: TowerState) {
    const s = this.ch.map.slots[t.slotIndex]!;
    const def = CONTENT.towers[t.defId]!;
    const x = s.x, y = s.y;

    // Tour ralliée : socle de lumière au sol, étincelles montantes et bannière
    // qui claque. L'ancien anneau + deux chevrons se lisait à peine (ADR-016).
    if (this.run.time < t.rallyUntil) {
      const pulse = Math.sin(this.time.now / 150);
      // Halo au sol : ancre l'effet sur la tour plutôt que de flotter autour.
      g.fillStyle(HERO_C.gold, 0.14 + 0.05 * pulse);
      g.fillEllipse(x, y + 6, 62 + pulse * 5, 24 + pulse * 2);
      g.lineStyle(2, HERO_C.gold, 0.75);
      g.strokeEllipse(x, y + 6, 62 + pulse * 5, 24 + pulse * 2);
      // Étincelles ascendantes, échelonnées pour un flux continu.
      for (let i = 0; i < 5; i++) {
        const ph = ((this.time.now / 620) + i * 0.2 + t.slotIndex * 0.13) % 1;
        const sx = x + Math.sin(i * 2.3 + ph * 3) * 17;
        const sy = y + 4 - ph * 52;
        g.fillStyle(i % 2 ? 0xfff0c0 : HERO_C.gold, 0.9 * (1 - ph));
        g.fillCircle(sx, sy, 2.6 * (1 - ph) + 0.8);
      }
      // Chevron unique, plus lisible que deux qui se chevauchaient.
      const rise = ((this.time.now / 70) % 22);
      const cy = y - 40 - rise;
      g.lineStyle(3, HERO_C.gold, Math.max(0, 1 - rise / 22));
      g.lineBetween(x - 7, cy + 6, x, cy - 3);
      g.lineBetween(x + 7, cy + 6, x, cy - 3);
    }

    // Pips de niveau sur la face avant — étoile dorée si spécialisée
    for (let lv = 0; lv < t.level; lv++) { g.fillStyle(0xe8c252); g.fillCircle(x - 8 + lv * 8, y + 1, 2.5); }
    const spec = specOf(CONTENT, t);
    if (spec) {
      const sy = y - 32 + Math.sin(this.time.now / 300) * 1.5;
      g.fillStyle(0xe8c252);
      g.fillTriangle(x - 5, sy + 2, x + 5, sy + 2, x, sy - 6);
      g.fillTriangle(x - 5, sy - 2, x + 5, sy - 2, x, sy + 6);
      // Aura de blizzard visible en continu
      if (spec.aura) { g.lineStyle(1, C.frost, 0.35); g.strokeCircle(x, y, spec.aura.radius); }
    }

    // Sélection : portée actuelle (blanc) + portée du niveau suivant (pointillés dorés)
    if (t.slotIndex === this.selectedSlot) {
      const curRange = spec ? (spec.aura ? spec.aura.radius : spec.stats.range) : def.levels[t.level - 1]!.range;
      g.lineStyle(1, 0xffffff, 0.4); g.strokeCircle(x, y, curRange);
      const next = spec ? undefined : def.levels[t.level];
      if (next) {
        g.lineStyle(2, 0xe8c252, 0.55);
        const segs = 36;
        for (let i = 0; i < segs; i += 2) {
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
    const last = this.facing.get(uid);
    let face = last?.face ?? 1;
    if (last && Math.abs(x - last.x) > 0.3) face = x > last.x ? 1 : -1;
    this.facing.set(uid, { x, face });
    return face;
  }

  /** Taille d'affichage d'un ennemi, EN UNITÉS LOGIQUES (ADR-016).
   *  Exprimée en pixels plutôt qu'en facteur d'échelle : les entités faisaient
   *  ~15 px à l'écran et étaient indiscernables. La hiérarchie de taille porte
   *  aussi de l'information — la brute doit se voir grosse au premier regard. */
  private enemySize(e: EnemyState): number {
    const base = e.defId === "brute" ? 62 : e.defId === "orc" ? 54 : e.defId === "bat" ? 52 : 46;
    return this.isBoss(e) ? base * 1.45 : base;
  }

  private isBoss(e: EnemyState): boolean {
    return e.maxHp > CONTENT.enemies[e.defId]!.hp * 1.8;
  }

  /** Position/scale/flip/teinte du sprite d'ennemi (appelé chaque frame par SpriteLayer). */
  private placeEnemy(s: Phaser.GameObjects.Sprite, e: EnemyState) {
    const def = CONTENT.enemies[e.defId]!;
    // Volants : flottement ; terrestres : petits bonds de marche (stoppés quand bloqués)
    const bob = def.flying
      ? Math.sin(this.time.now / 180 + e.uid) * 2
      : e.blocked ? 0 : -Math.abs(Math.sin(this.time.now / 130 + e.uid * 1.7)) * 2.5;
    const y = (def.flying ? e.pos.y - 14 : e.pos.y) + bob;
    const face = this.facingOf(e.uid, e.pos.x);
    const size = this.enemySize(e);
    s.setOrigin(0.5, 0.62).setDisplaySize(size, size).setFlipX(face < 0);
    s.setPosition(Math.round(e.pos.x), Math.round(y));
    s.setDepth(100 + e.pos.y); // tri en profondeur par position verticale
    // Boss : reteinté or chaud (le registre n'a pas de sprite dédié).
    if (this.isBoss(e)) s.setTint(0xffd98a);
  }

  /** Overlay d'ennemi (gfx) : barre de PV, anneaux de statut, couronne de boss. */
  private drawEnemyOverlay(g: Phaser.GameObjects.Graphics, e: EnemyState) {
    const boss = this.isBoss(e);
    const r = this.enemySize(e) * 0.5;  // rayon visuel du sprite (cale anneaux/barre)
    const x = e.pos.x, y = e.pos.y - r * 0.4;

    // Gelé : cristaux de givre qui orbitent lentement + halo froid. Un anneau bleu
    // seul ne se distinguait pas d'un anneau de brûlure (ADR-016).
    if (this.run.time < e.slowUntil) {
      const spin = this.time.now / 900 + e.uid;
      g.fillStyle(SIGNAL.slow, 0.22);
      g.fillEllipse(x, y + r * 0.5, r * 1.9, r * 0.7);
      for (let i = 0; i < 5; i++) {
        const a = spin + (i / 5) * Math.PI * 2;
        const px = x + Math.cos(a) * (r + 4), py = y + Math.sin(a) * (r + 4) * 0.55;
        const s = 3.2 + Math.sin(this.time.now / 260 + i) * 0.8;
        g.fillStyle(SIGNAL.slow, 0.95);
        g.fillTriangle(px, py - s, px - s * 0.9, py + s * 0.7, px + s * 0.9, py + s * 0.7);
      }
    }
    // En feu : langues de flamme montantes, jamais un anneau.
    if (this.run.time < e.burnUntil) {
      for (let i = 0; i < 4; i++) {
        const ph = (this.time.now / 260 + i * 0.27 + e.uid * 0.11) % 1;
        const fx2 = x + (i - 1.5) * (r * 0.42);
        const fy = y + r * 0.35 - ph * (r * 1.5);
        const s = (1 - ph) * (r * 0.34) + 2;
        g.fillStyle(i % 2 ? SIGNAL.burn : 0xf5c542, 0.85 * (1 - ph));
        g.fillTriangle(fx2, fy - s * 1.7, fx2 - s * 0.72, fy + s * 0.6, fx2 + s * 0.72, fy + s * 0.6);
      }
    }

    // Couronne de mini-boss
    if (boss) {
      const cy = y - r - 7;
      g.fillStyle(0xe8c252);
      g.fillTriangle(x - 8, cy + 4, x - 8, cy - 4, x - 3, cy + 1);
      g.fillTriangle(x - 3, cy + 4, x, cy - 6, x + 3, cy + 4);
      g.fillTriangle(x + 8, cy + 4, x + 8, cy - 4, x + 3, cy + 1);
      g.fillRect(x - 8, cy + 2, 16, 3);
    }

    // Barre PV arrondie (verte → rouge selon les PV restants)
    const pct = e.hp / e.maxHp;
    // Barre proportionnelle au sprite : les unités ayant grandi, une largeur fixe
    // aurait paru minuscule au-dessus d'une brute.
    const barW = r * 1.5, barH = boss ? 6 : 5, barY = y - r - (boss ? 16 : 11);
    const barColor = pct > 0.55 ? STATUS.hpGood : pct > 0.25 ? STATUS.hpWarn : STATUS.hpBad;
    g.fillStyle(C.hpBack, 0.85); g.fillRoundedRect(x - barW / 2, barY, barW, barH, 2);
    if (pct > 0.05) { g.fillStyle(barColor); g.fillRoundedRect(x - barW / 2, barY, barW * pct, barH, 2); }
  }

  private drawHero(g: Phaser.GameObjects.Graphics) {
    const h = this.run.hero;
    this.heroSprite.setVisible(h.alive);
    if (!h.alive) return;
    const moving = Math.hypot(h.target.x - h.pos.x, h.target.y - h.pos.y) > 2;
    const bob = moving ? Math.sin(this.time.now / 110) * 1.5 : 0;
    const x = h.pos.x, y = h.pos.y + bob;
    const foe = this.run.enemies.find(e => e.alive && e.blocked);
    const face = foe ? (foe.pos.x >= x ? 1 : -1) : this.facingOf(-1, x);

    // --- Cycle de frappe -------------------------------------------------
    // Le combat était un simple cercle blanc clignotant. Ici un vrai cycle :
    // armé (recul) → frappe (bond en avant) → récupération, avec un arc de lame
    // qui balaie l'ennemi. Piloté par l'horloge murale, jamais par la sim.
    const SWING_MS = 520;
    const k = foe ? (this.time.now % SWING_MS) / SWING_MS : 0; // 0→1
    // Courbe d'attaque : recul lent (0→0,55) puis détente sèche (0,55→0,75).
    const wind = k < 0.55 ? -(k / 0.55) * 3.5 : k < 0.75 ? (k - 0.55) / 0.2 * 11 - 3.5 : (1 - (k - 0.75) / 0.25) * 7.5;
    const lunge = foe ? wind : 0;
    const tilt = foe ? (k < 0.55 ? -0.12 * (k / 0.55) : 0.22 * (1 - (k - 0.55) / 0.45)) : 0;

    this.heroSprite.setFlipX(face < 0).setDisplaySize(58, 58)
      .setRotation(tilt * face)
      .setPosition(Math.round(x + face * lunge), Math.round(y))
      .setDepth(100 + h.pos.y);

    // Arc de lame : visible seulement pendant la détente, il balaie de haut en bas
    // devant le héros. C'est lui qui rend le coup lisible, pas l'étincelle.
    if (foe && k >= 0.55 && k < 0.82) {
      const t = (k - 0.55) / 0.27;              // 0→1 sur la frappe
      const a0 = -1.5, a1 = 0.9;                 // du haut vers le bas
      const ang = a0 + (a1 - a0) * t;
      const cxh = x + face * 16, cyh = y - 8;
      const rad = 26;
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
        const ix = foe.pos.x, iy = foe.pos.y - 6;
        g.fillStyle(0xffffff, 0.85 * (1 - t));
        for (let i = 0; i < 4; i++) {
          const sa = i * 1.6 + this.time.now / 200;
          g.fillCircle(ix + Math.cos(sa) * 9, iy + Math.sin(sa) * 7, 2.2);
        }
      }
    }

    // Barre PV
    const pct = h.hp / h.maxHp;
    const by = y - 24;
    g.fillStyle(C.hpBack, 0.85); g.fillRoundedRect(x - 16, by, 32, 5, 2);
    if (pct > 0.04) { g.fillStyle(STATUS.hpGood); g.fillRoundedRect(x - 16, by, 32 * pct, 5, 2); }
  }

  private strokePath(g: Phaser.GameObjects.Graphics, p: { x: number; y: number }[]) {
    g.beginPath(); g.moveTo(p[0]!.x, p[0]!.y);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i]!.x, p[i]!.y);
    g.strokePath();
  }

  /** Des ennemis (vivants ou à venir) utilisent encore ce chemin. */
  private pathInUse(pathIdx: number): boolean {
    return this.run.pendingSpawns.some(p => p.pathIndex === pathIdx)
      || this.run.enemies.some(e => e.alive && e.pathIndex === pathIdx);
  }

  /** La vague suivante fera arriver des ennemis par ce chemin. */
  private nextWaveUsesPath(pathIdx: number): boolean {
    const wave = this.ch.waves[this.run.waveIndex + 1];
    return !!wave?.spawns.some(sp => (sp.pathIndex ?? 0) === pathIdx);
  }
}
