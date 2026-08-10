// ============================================================
// render/MenuScene.ts — Hub "Le Campement" : Histoire (chapitres),
// Armurerie (Arsenal/Forge/Héros), Chroniques (meilleurs runs).
// Première visite : intro lore (profile.introSeen).
// Wording & lore : voir GDD §Lore & présentation.
// ============================================================

import Phaser from "phaser";
import { CONTENT, UNLOCKS } from "../content/index";
import type { ProfileService, SkillId } from "../meta/profile";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY, preloadUi, setupCamera, UI_TINT } from "./ui";
import { uiButton, uiPanel } from "./components";

type View = "home" | "story" | "rifts" | "shop" | "chronicles" | "bestiary";
type ShopTab = "arsenal" | "forge" | "hero";

const TXT = { fontFamily: FONT_BODY };
const TITLE = { fontFamily: FONT_DISPLAY };
const GOLD = "#e8c252", DIM = "#a89878", OK = "#27ae60", LIGHT = "#f0e6d2", SCEAU = "#c97ba2";

const LORE_INTRO = [
  "Les hordes du Roi-Charogne ont franchi les marches du Nord.",
  "Village après village, la vallée brûle. Il ne reste qu'une place forte",
  "sur leur route : le Bastion — et vous, Chevalier, pour le tenir.",
  "",
  "Dressez vos tours. Menez la charge. Tenez les remparts.",
].join("\n");

const RIFT = "#b07cc6";

export class MenuScene extends Phaser.Scene {
  private profileSvc!: ProfileService;
  private panel: Phaser.GameObjects.Container | null = null;
  private currencyTxt!: Phaser.GameObjects.Text;
  private currentView: View = "home";
  private currentShopTab: ShopTab = "arsenal";
  private bestiaryTab: "creatures" | "defenses" = "creatures";

  constructor() { super("menu"); }
  init(data: { profileSvc: ProfileService }) { this.profileSvc = data.profileSvc; }
  preload() { preloadUi(this); }

  create() {
    setupCamera(this);
    this.panel = null;
    this.add.rectangle(400, 300, 800, 600, 0x1a140e);
    this.add.text(400, 48, "⚔ Bastion", { fontSize: "40px", color: GOLD, ...TITLE }).setOrigin(0.5);
    this.add.text(400, 88, "Le campement", { fontSize: "16px", color: DIM, ...TXT }).setOrigin(0.5);
    this.currencyTxt = this.add.text(400, 122, "", { fontSize: "19px", color: LIGHT, ...TITLE }).setOrigin(0.5);
    this.refreshCurrencies();

    if (!this.profileSvc.get().introSeen) this.showIntro();
    else this.showView(this.currentView);
  }

  private refreshCurrencies() {
    const p = this.profileSvc.get();
    this.currencyTxt.setText(`◆ Éclats : ${p.shards}      ⚜ Sceaux : ${p.sceaux}`);
  }

  // ---------- Intro lore (première visite) ----------

  private showIntro() {
    const c = this.add.container(400, 300).setDepth(30);
    c.add(this.add.rectangle(0, 0, 800, 600, 0x120d08, 0.97));
    c.add(this.add.text(0, -150, "An 312 du Vieux Royaume", { fontSize: "15px", color: DIM, ...TXT }).setOrigin(0.5));
    c.add(this.add.text(0, -50, LORE_INTRO, { fontSize: "19px", color: LIGHT, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
    c.add(uiButton(this, 0, 110, "🛡 Prendre le commandement", { w: 330, h: 50, gold: true, fontSize: 19 }, () => {
      this.profileSvc.markIntroSeen();
      c.destroy();
      this.showView("story"); // on guide direct vers le combat
    }).container);
  }

  // ---------- Navigation ----------

  private showView(view: View) {
    this.currentView = view;
    this.panel?.destroy();
    this.panel = this.add.container(0, 0);
    if (view === "home") this.buildHome();
    else if (view === "story") this.buildStory();
    else if (view === "rifts") this.buildRifts();
    else if (view === "shop") this.buildShop();
    else if (view === "bestiary") this.buildBestiary();
    else this.buildChronicles();
  }

  /** Panneau Kenney (nine-slice teinté) + liseré d'état, ajouté au panel courant. */
  private box(x: number, y: number, w: number, h: number, fill: number, stroke: number, r = 10): Phaser.GameObjects.Graphics {
    // fill historique (0x22…/0x2b…) → teinte sombre ; on garde la sémantique des appels existants
    const tint = fill === 0x221b12 ? UI_TINT.panelDim : UI_TINT.panel;
    this.panel!.add(uiPanel(this, x, y, w, h, tint));
    const g = this.add.graphics();
    g.lineStyle(1, stroke, 0.85); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    this.panel!.add(g);
    return g;
  }

  /** Bouton retour vers le hub, commun aux sous-écrans. */
  private backButton(title: string) {
    const p = this.panel!;
    p.add(uiButton(this, 80, 165, "⟵ Campement", { w: 130, h: 30, fontSize: 13 }, () => this.showView("home")).container);
    p.add(this.add.text(400, 165, title, { fontSize: "20px", color: GOLD, ...TITLE }).setOrigin(0.5));
  }

  /** Rangée générique : cadre, titre, description, bouton à droite. */
  private row(y: number, title: string, desc: string, btnLabel: string, btnColor: string, cb: (() => void) | null) {
    const p = this.panel!;
    this.box(400, y, 600, 62, 0x2b2118, 0xc9a227);
    p.add(this.add.text(120, y - 14, title, { fontSize: "17px", color: LIGHT, ...TXT }));
    p.add(this.add.text(120, y + 8, desc, { fontSize: "12px", color: DIM, ...TXT }));
    if (cb) {
      p.add(uiButton(this, 630, y, btnLabel, { w: 96, h: 34, gold: true, fontSize: 14 }, cb).container);
    } else {
      p.add(this.add.text(630, y, btnLabel, { fontSize: "15px", color: btnColor, ...TXT }).setOrigin(0.5));
    }
  }

  // ---------- Hub ----------

  private buildHome() {
    const p = this.panel!;
    const wonCount = this.profileSvc.get().chaptersWon.length;
    const total = CONTENT.chapters.length;
    const storyDone = this.profileSvc.storyCompleted();
    const entries: { icon: string; title: string; sub: string; view: View }[] = [
      { icon: "📜", title: "Histoire", sub: wonCount > 0 ? `${wonCount}/${total} chapitres conquis` : "Chapitre 1 : La Route du Bastion", view: "story" },
      {
        icon: storyDone ? "🌀" : "🔒", title: "Failles infinies",
        sub: storyDone ? "Vagues sans fin, gloire au plus endurant — bientôt" : "Se débloque en achevant l'Histoire",
        view: "rifts",
      },
      { icon: "🛡", title: "Armurerie", sub: "Arsenal, forge des tours et sorts du héros", view: "shop" },
      { icon: "📖", title: "Bestiaire", sub: `Connaître l'ennemi, c'est déjà le vaincre — ${this.profileSvc.get().bestiary.length}/${Object.keys(CONTENT.enemies).length} découverts`, view: "bestiary" },
      { icon: "📯", title: "Chroniques", sub: "Vos hauts faits de guerre", view: "chronicles" },
    ];
    entries.forEach((e, i) => {
      const y = 192 + i * 80;
      this.box(400, y, 540, 68, 0x2b2118, e.view === "rifts" ? 0x6b5a3e : 0xc9a227, 12);
      // Surbrillance au survol
      const hl = this.add.graphics();
      hl.fillStyle(0xc9a227, 0.07); hl.fillRoundedRect(130, y - 34, 540, 68, 12);
      hl.lineStyle(1, 0xe8c252, 0.9); hl.strokeRoundedRect(130, y - 34, 540, 68, 12);
      hl.setVisible(false);
      p.add(hl);
      p.add(this.add.text(160, y, e.icon, { fontSize: "26px" }).setOrigin(0.5));
      p.add(this.add.text(205, y - 16, e.title, { fontSize: "19px", color: e.view === "rifts" ? RIFT : GOLD, ...TXT }));
      p.add(this.add.text(205, y + 9, e.sub, { fontSize: "12px", color: DIM, ...TXT }));
      const zone = this.add.zone(400, y, 540, 68).setInteractive({ cursor: CURSOR_POINT });
      zone.on("pointerover", () => hl.setVisible(true));
      zone.on("pointerout", () => hl.setVisible(false));
      zone.on("pointerdown", () => this.showView(e.view));
      p.add(zone);
    });
  }

  // ---------- Bestiaire (découverte progressive) ----------

  private buildBestiary() {
    this.backButton("Bestiaire");
    const p = this.panel!;

    // Onglets Créatures / Défenses
    const tabs: { id: "creatures" | "defenses"; label: string }[] = [
      { id: "creatures", label: "Créatures" },
      { id: "defenses", label: "Défenses" },
    ];
    tabs.forEach((t, i) => {
      const active = this.bestiaryTab === t.id;
      p.add(uiButton(this, 320 + i * 160, 205, t.label, { w: 130, h: 32, gold: active, fontSize: 15 },
        () => { this.bestiaryTab = t.id; this.showView("bestiary"); }).container);
    });

    if (this.bestiaryTab === "defenses") { this.buildDefensePages(); return; }

    const seen = this.profileSvc.get().bestiary;
    const enemies = Object.values(CONTENT.enemies);
    enemies.forEach((e, i) => {
      const y = 265 + i * 84;
      const known = seen.includes(e.id);
      this.box(400, y, 640, 76, known ? 0x2b2118 : 0x221b12, known ? 0xc9a227 : 0x4a3f2e);
      if (!known) {
        p.add(this.add.text(110, y - 24, "???", { fontSize: "17px", color: DIM, ...TXT }));
        p.add(this.add.text(110, y + 2, "Croisez cette créature au combat pour compléter sa page.", { fontSize: "12px", color: DIM, ...TXT }));
        return;
      }
      p.add(this.add.text(110, y - 26, `${e.name}${e.flying ? "  🪽" : ""}`, { fontSize: "17px", color: GOLD, ...TXT }));
      p.add(this.add.text(110, y - 5, e.lore, { fontSize: "11px", color: DIM, ...TXT, lineSpacing: 2 }));
      const stats = [
        `❤ ${e.hp} PV`, `🏃 ${e.speed}`, `◆ ${e.goldReward}`,
        `🏰 -${e.damageToCastle} PV`, e.meleeDps > 0 ? `⚔ ${e.meleeDps}/s` : "⚔ inoffensif au contact",
      ].join("    ");
      p.add(this.add.text(110, y + 23, stats, { fontSize: "12px", color: LIGHT, ...TXT }));
    });
    p.add(this.add.text(400, 265 + enemies.length * 84 - 24,
      "Les mini-boss sont des variantes renforcées des créatures connues.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5, 0));
  }

  /** Onglet Défenses : explique le rôle et les différences de chaque tour. */
  private buildDefensePages() {
    const p = this.panel!;
    const towers = Object.values(CONTENT.towers);
    towers.forEach((t, i) => {
      const y = 273 + i * 100;
      const locked = t.requiresUnlock !== null && !this.profileSvc.get().unlocks.includes(t.requiresUnlock);
      this.box(400, y, 640, 92, 0x2b2118, locked ? 0x6b5a3e : 0xc9a227);
      p.add(this.add.text(110, y - 34, `${t.name}${locked ? "  (verrouillée — Arsenal)" : ""}`, { fontSize: "17px", color: locked ? DIM : GOLD, ...TXT }));
      p.add(this.add.text(110, y - 13, t.lore, { fontSize: "11px", color: DIM, ...TXT, lineSpacing: 2 }));
      // Rôle tactique : LA ligne qui différencie les tours
      const role = t.splashRadius > 0 ? `Dégâts de zone (rayon ${t.splashRadius})` : "Monocible";
      const target = t.groundOnly ? "⚠ ne touche PAS les volants" : "vise sol et volants";
      const slow = t.slow ? ` · ralentit (vitesse ×${t.slow.factor} pendant ${t.slow.duration}s)` : "";
      p.add(this.add.text(110, y + 13, `${role} · ${target}${slow}`, { fontSize: "12px", color: t.groundOnly ? "#e8a87c" : LIGHT, ...TXT }));
      const l1 = t.levels[0]!, l3 = t.levels[t.levels.length - 1]!;
      p.add(this.add.text(110, y + 31, `⚔ ${l1.damage}→${l3.damage}   ⊙ ${l1.range}→${l3.range}   ${l1.fireRate}→${l3.fireRate} tir/s   coûts ${t.costs.join(" / ")} ◆`,
        { fontSize: "12px", color: LIGHT, ...TXT }));
    });
    p.add(this.add.text(400, 273 + towers.length * 100 - 28,
      "Le héros bloque et frappe les ennemis terrestres ; les volants l'ignorent — prévoyez l'Archerie.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5, 0));
  }

  // ---------- Histoire (chapitres) ----------

  private buildStory() {
    this.backButton("Histoire");
    const p = this.panel!;

    // Déblocage séquentiel : conquérir le chapitre précédent pour ouvrir le suivant
    const isUnlocked = (i: number) => CONTENT.chapters[i]!.playable && (i === 0 || this.profileSvc.chapterWon(i - 1));

    CONTENT.chapters.forEach((ch, i) => {
      const y = 200 + i * 36;
      const won = this.profileSvc.chapterWon(i);
      const unlocked = isUnlocked(i);
      this.box(400, y, 640, 32, unlocked ? 0x2b2118 : 0x221b12, won ? 0x27ae60 : unlocked ? 0xc9a227 : 0x4a3f2e, 8);
      p.add(this.add.text(100, y, `${i + 1}.`, { fontSize: "14px", color: unlocked ? GOLD : DIM, ...TXT }).setOrigin(0, 0.5));
      p.add(this.add.text(135, y, unlocked || won ? ch.name : "???", { fontSize: "15px", color: unlocked ? LIGHT : DIM, ...TXT }).setOrigin(0, 0.5));
      if (won) {
        const stars = this.profileSvc.chapterStarsOf(i);
        p.add(this.add.text(560, y, "★".repeat(stars) + "☆".repeat(3 - stars), { fontSize: "15px", color: GOLD, ...TXT }).setOrigin(0.5));
      }
      if (unlocked) {
        p.add(uiButton(this, 660, y, won ? "Rejouer" : "⚔ Se battre", { w: 104, h: 26, gold: !won, fontSize: 12 },
          () => this.scene.start("game", { profileSvc: this.profileSvc, chapterIndex: i })).container);
      } else {
        p.add(this.add.text(660, y, ch.playable ? "🔒 Verrouillé" : "Bientôt", { fontSize: "13px", color: DIM, ...TXT }).setOrigin(0.5));
      }
    });

    // Lore du prochain objectif (premier chapitre débloqué non conquis)
    const next = CONTENT.chapters.findIndex((_ch, i) => isUnlocked(i) && !this.profileSvc.chapterWon(i));
    const lore = next >= 0 ? CONTENT.chapters[next]!.lore : "La vallée respire. Pour l'instant.";
    p.add(this.add.text(400, 200 + CONTENT.chapters.length * 36 + 8, lore.replace("\n", " "),
      { fontSize: "12px", color: DIM, ...TXT, align: "center", wordWrap: { width: 600 } }).setOrigin(0.5, 0));
  }

  // ---------- Failles infinies (mode séparé, teaser v1) ----------

  private buildRifts() {
    this.backButton("Failles infinies");
    const p = this.panel!;
    if (!this.profileSvc.storyCompleted()) {
      p.add(this.add.text(400, 290,
        "Les Failles ne s'ouvrent qu'aux vainqueurs.\n\nAchevez l'Histoire — terrassez le Roi-Charogne —\net leur seuil vous sera révélé.",
        { fontSize: "17px", color: LIGHT, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
      p.add(this.add.text(400, 410, `🔒 ${this.profileSvc.get().chaptersWon.length}/${CONTENT.chapters.length} chapitres conquis`, {
        fontSize: "16px", color: DIM, ...TXT, backgroundColor: "#221b12", padding: { x: 16, y: 8 },
      }).setOrigin(0.5));
      return;
    }
    p.add(this.add.text(400, 280,
      "Au-delà des terres connues, les Failles déversent\ndes hordes sans fin. Nul n'en est revenu —\nseuls les noms des plus endurants survivent,\ngravés dans les Chroniques.",
      { fontSize: "17px", color: LIGHT, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
    p.add(this.add.text(400, 400, "🌀 Bientôt", {
      fontSize: "20px", color: RIFT, ...TXT, backgroundColor: "#221b12", padding: { x: 20, y: 10 },
    }).setOrigin(0.5));
    p.add(this.add.text(400, 460, "Mode v1 : scaling agressif, modificateurs de Faille, leaderboard.",
      { fontSize: "12px", color: DIM, ...TXT }).setOrigin(0.5));
  }

  // ---------- Armurerie (Arsenal / Forge / Héros) ----------

  private buildShop() {
    this.backButton("Armurerie");
    const p = this.panel!;
    const tabs: { id: ShopTab; label: string }[] = [
      { id: "arsenal", label: "Arsenal" },
      { id: "forge", label: "Forge" },
      { id: "hero", label: "Héros" },
    ];
    tabs.forEach((t, i) => {
      const active = this.currentShopTab === t.id;
      p.add(uiButton(this, 250 + i * 150, 205, t.label, { w: 120, h: 32, gold: active, fontSize: 15 },
        () => { this.currentShopTab = t.id; this.showView("shop"); }).container);
    });
    if (this.currentShopTab === "arsenal") this.buildArsenalRows();
    else if (this.currentShopTab === "forge") this.buildForgeRows();
    else this.buildHeroRows();
  }

  private buildArsenalRows() {
    const p = this.profileSvc.get();
    UNLOCKS.forEach((u, i) => {
      const y = 268 + i * 78;
      const owned = p.unlocks.includes(u.id);
      this.row(y, u.name, u.desc,
        owned ? "Acquis" : `${u.cost} ◆`,
        owned ? OK : GOLD,
        owned ? null : () => { if (this.profileSvc.buy(u.id)) { this.refreshCurrencies(); this.showView("shop"); } });
    });
  }

  private buildForgeRows() {
    const unlocks = this.profileSvc.get().unlocks;
    const pct = Math.round(CONTENT.forge.damageMultPerLevel * 100);
    const maxLvl = CONTENT.forge.upgradeCosts.length;
    Object.values(CONTENT.towers).forEach((t, i) => {
      const y = 268 + i * 78;
      const locked = t.requiresUnlock !== null && !unlocks.includes(t.requiresUnlock);
      const lvl = this.profileSvc.forgeLevel(t.id);
      const cost = this.profileSvc.forgeNextCost(t.id);
      const stars = "★".repeat(lvl) + "☆".repeat(maxLvl - lvl);
      if (locked) {
        this.row(y, `${t.name}  ${stars}`, "Débloquez d'abord cette tour (Arsenal).", "Verrouillé", DIM, null);
      } else if (cost === null) {
        this.row(y, `${t.name}  ${stars}`, `+${pct}% dégâts par niveau — niveau maximum atteint.`, "Max", OK, null);
      } else {
        this.row(y, `${t.name}  ${stars}`, `+${pct}% dégâts permanents par niveau (actuel : +${lvl * pct}%).`,
          `${cost} ◆`, GOLD,
          () => { if (this.profileSvc.buyForge(t.id)) { this.refreshCurrencies(); this.showView("shop"); } });
      }
    });
  }

  private buildHeroRows() {
    this.panel!.add(this.add.text(400, 240, `${CONTENT.hero.name} — les Sceaux ⚜ se gagnent avec les kills du héros en run`,
      { fontSize: "13px", color: DIM, ...TXT }).setOrigin(0.5));

    const skills: { id: SkillId; name: string; desc: (lvl: number) => string }[] = [
      {
        id: "whirlwind", name: "Tournoiement",
        desc: lvl => {
          const s = CONTENT.hero.skills.whirlwind.levels[lvl - 1]!;
          return `AoE au contact : ${s.damage} dégâts, rayon ${s.radius}, recharge ${s.cooldownS}s.`;
        },
      },
      {
        id: "rally", name: "Ralliement",
        desc: lvl => {
          const s = CONTENT.hero.skills.rally.levels[lvl - 1]!;
          return `Cadence des tours proches ×${s.fireRateMult} pendant ${s.durationS}s, recharge ${s.cooldownS}s.`;
        },
      },
    ];

    skills.forEach((sk, i) => {
      const y = 280 + i * 78;
      const def = CONTENT.hero.skills[sk.id];
      const lvl = this.profileSvc.skillLevel(sk.id);
      const cost = this.profileSvc.skillNextCost(sk.id);
      const title = `${sk.name} — niv. ${lvl}/${def.levels.length}`;
      if (cost === null) {
        this.row(y, title, sk.desc(lvl), "Max", OK, null);
      } else {
        this.row(y, title, sk.desc(lvl), `${cost} ⚜`, SCEAU,
          () => { if (this.profileSvc.buySkill(sk.id)) { this.refreshCurrencies(); this.showView("shop"); } });
      }
    });

    // Teaser : second héros (GDD : roster v1)
    const y = 280 + skills.length * 78;
    this.box(400, y, 600, 62, 0x221b12, 0x6b5a3e);
    this.panel!.add(this.add.text(120, y - 14, "???", { fontSize: "17px", color: DIM, ...TXT }));
    this.panel!.add(this.add.text(120, y + 8, "Un nouveau héros rejoindra bientôt le campement…", { fontSize: "12px", color: DIM, ...TXT }));
    this.panel!.add(this.add.text(630, y, "Bientôt", { fontSize: "15px", color: DIM, ...TXT }).setOrigin(0.5));
  }

  // ---------- Chroniques (meilleurs runs, futur leaderboard) ----------

  private buildChronicles() {
    this.backButton("Chroniques");
    const runs = this.profileSvc.get().bestRuns;
    if (runs.length === 0) {
      this.panel!.add(this.add.text(400, 340, "Les Chroniques sont vierges.\nLe Roi-Charogne n'attendra pas — partez au combat !",
        { fontSize: "16px", color: DIM, ...TXT, align: "center", lineSpacing: 6 }).setOrigin(0.5));
      return;
    }
    this.panel!.add(this.add.text(400, 210, `Vos ${runs.length} plus hauts faits`, { fontSize: "14px", color: DIM, ...TXT }).setOrigin(0.5));
    runs.forEach((r, i) => {
      const y = 250 + i * 52;
      const date = new Date(r.dateISO).toLocaleDateString("fr-FR");
      this.box(400, y, 600, 44, 0x2b2118, r.victory ? 0x27ae60 : 0x6b5a3e, 8);
      this.panel!.add(this.add.text(120, y, `#${i + 1}`, { fontSize: "15px", color: GOLD, ...TXT }).setOrigin(0, 0.5));
      const chap = r.chapter !== undefined ? `Ch.${r.chapter + 1} — ` : "";
      this.panel!.add(this.add.text(170, y, `${chap}${r.waves} vague${r.waves > 1 ? "s" : ""} — ${r.kills} kills`, { fontSize: "15px", color: LIGHT, ...TXT }).setOrigin(0, 0.5));
      this.panel!.add(this.add.text(500, y, r.victory ? "Victoire" : "Défaite", { fontSize: "14px", color: r.victory ? OK : DIM, ...TXT }).setOrigin(0.5));
      this.panel!.add(this.add.text(680, y, date, { fontSize: "13px", color: DIM, ...TXT }).setOrigin(1, 0.5));
    });
  }
}
