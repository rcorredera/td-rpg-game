// ============================================================
// render/MenuScene.ts — Hub "Le Campement" : Histoire (chapitres),
// Armurerie (Arsenal/Forge/Héros), Chroniques (meilleurs runs).
// Première visite : intro lore (profile.introSeen).
// Wording & lore : voir GDD §Lore & présentation.
// ============================================================

import Phaser from "phaser";
import { CONTENT, UNLOCKS } from "../content/index";
import type { ProfileService, SkillId } from "../meta/profile";
import { FONT_BODY, FONT_DISPLAY, onSceneResize, preloadUi, setupCamera, UI_TINT } from "./ui";
import { touchSize, viewport } from "./viewport";
import { ACCENT, TEXT } from "./theme";
import {
  layoutCursor, uiButton, uiChip, uiListRow, uiModal, uiNavCard, uiPanel, uiSectionHeader,
  type LayoutCursor, type RowState, type UiChip,
} from "./components";

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

export class MenuScene extends Phaser.Scene {
  private profileSvc!: ProfileService;
  private panel: Phaser.GameObjects.Container | null = null;
  private chipShards!: UiChip;
  private chipSceaux!: UiChip;
  private currentView: View = "home";
  private currentShopTab: ShopTab = "arsenal";
  private bestiaryTab: "creatures" | "defenses" = "creatures";

  constructor() { super("menu"); }
  init(data: { profileSvc: ProfileService }) { this.profileSvc = data.profileSvc; }
  preload() { preloadUi(this); }

  create() {
    setupCamera(this);
    this.panel = null;
    // Le fond couvre la vue entière, pas seulement la zone de jeu : sur un écran
    // large, le débord doit rester habillé plutôt que noir (ADR-010).
    const v = viewport();
    this.add.rectangle(400, 300, v.width, v.height, 0x1a140e);
    // Le campement n'a pas d'état volatil : au resize/rotation, on rebâtit l'écran
    // à neuf plutôt que de repositionner chaque élément un par un.
    onSceneResize(this, () => this.scene.restart({ profileSvc: this.profileSvc }));
    this.add.text(400, 48, "⚔ Bastion", { fontSize: "40px", color: TEXT.gold, ...TITLE }).setOrigin(0.5);
    this.add.text(400, 88, "Le campement", { fontSize: "16px", color: TEXT.dim, ...TXT }).setOrigin(0.5);
    this.chipShards = uiChip(this, 330, 122, { icon: "◆", text: "Éclats : 0", fontSize: 19, color: TEXT.light });
    this.chipSceaux = uiChip(this, 470, 122, { icon: "⚜", text: "Sceaux : 0", fontSize: 19, color: TEXT.light });
    this.refreshCurrencies();

    if (!this.profileSvc.get().introSeen) this.showIntro();
    else this.showView(this.currentView);
  }

  private refreshCurrencies() {
    const p = this.profileSvc.get();
    this.chipShards.setText(`Éclats : ${p.shards}`);
    this.chipSceaux.setText(`Sceaux : ${p.sceaux}`);
  }

  // ---------- Intro lore (première visite) ----------

  private showIntro() {
    const modal = uiModal(this, {
      w: 600, h: 340,
      title: "An 312 du Vieux Royaume",
      body: LORE_INTRO,
      dimAlpha: 0.9,
      buttons: [{
        label: "🛡 Prendre le commandement", w: 340, gold: true,
        onClick: () => {
          this.profileSvc.markIntroSeen();
          modal.close();
          this.showView("story"); // on guide direct vers le combat
        },
      }],
    });
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
    const entries: { icon: string; title: string; sub: string; view: View; rift?: boolean }[] = [
      { icon: "📜", title: "Histoire", sub: wonCount > 0 ? `${wonCount}/${total} chapitres conquis` : "Chapitre 1 : La Route du Bastion", view: "story" },
      {
        icon: storyDone ? "🌀" : "🔒", title: "Failles infinies",
        sub: storyDone ? "Vagues sans fin, gloire au plus endurant — bientôt" : "Se débloque en achevant l'Histoire",
        view: "rifts", rift: true,
      },
      { icon: "🛡", title: "Armurerie", sub: "Arsenal, forge des tours et sorts du héros", view: "shop" },
      { icon: "📖", title: "Bestiaire", sub: `Connaître l'ennemi, c'est déjà le vaincre — ${this.profileSvc.get().bestiary.length}/${Object.keys(CONTENT.enemies).length} découverts`, view: "bestiary" },
      { icon: "📯", title: "Chroniques", sub: "Vos hauts faits de guerre", view: "chronicles" },
    ];
    // Empilement d'après la hauteur EFFECTIVE des cartes : sur mobile elles grandissent
    // pour rester tapables, un pas en dur les ferait se chevaucher (ADR-011).
    const cardH = touchSize(68);
    const cursor = layoutCursor(192 - cardH / 2);
    entries.forEach((e) => {
      const y = cursor.next(cardH, 12);
      p.add(uiNavCard(this, 400, y, {
        icon: e.icon, title: e.title, sub: e.sub,
        titleColor: e.rift ? TEXT.rift : TEXT.gold,
        accent: e.rift ? ACCENT.dimBorder : ACCENT.gold,
        onSelect: () => this.showView(e.view),
      }).container);
    });
  }

  // ---------- Bestiaire (découverte progressive) ----------

  private buildBestiary() {
    this.backButton("Bestiaire");
    const p = this.panel!;

    // Onglets Créatures / Défenses
    const tabsY = 205, tabsH = 32;
    const tabs: { id: "creatures" | "defenses"; label: string }[] = [
      { id: "creatures", label: "Créatures" },
      { id: "defenses", label: "Défenses" },
    ];
    tabs.forEach((t, i) => {
      const active = this.bestiaryTab === t.id;
      p.add(uiButton(this, 320 + i * 160, tabsY, t.label, { w: 130, h: tabsH, gold: active, fontSize: 15 },
        () => { this.bestiaryTab = t.id; this.showView("bestiary"); }).container);
    });

    // Empilement vertical à partir du bas des onglets (+6px de respiration) : plus jamais
    // de recalcul manuel d'offset par écran, ni de risque de chevauchement (bug #7/#9).
    const cursor = layoutCursor(tabsY + tabsH / 2 + 6);

    if (this.bestiaryTab === "defenses") { this.buildDefensePages(cursor); return; }

    const seen = this.profileSvc.get().bestiary;
    const enemies = Object.values(CONTENT.enemies);
    enemies.forEach((e) => {
      const y = cursor.next(76);
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
    p.add(this.add.text(400, cursor.y + 12,
      "Les mini-boss sont des variantes renforcées des créatures connues.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5, 0));
  }

  /** Onglet Défenses : explique le rôle et les différences de chaque tour. */
  private buildDefensePages(cursor: LayoutCursor) {
    const p = this.panel!;
    const towers = Object.values(CONTENT.towers);
    towers.forEach((t) => {
      const y = cursor.next(92);
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
    p.add(this.add.text(400, cursor.y + 12,
      "Le héros bloque et frappe les ennemis terrestres ; les volants l'ignorent — prévoyez l'Archerie.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5, 0));
  }

  // ---------- Histoire (chapitres) ----------

  private buildStory() {
    const p = this.panel!;
    p.add(uiSectionHeader(this, { title: "Histoire", onBack: () => this.showView("home") }));

    // Déblocage séquentiel : conquérir le chapitre précédent pour ouvrir le suivant
    const isUnlocked = (i: number) => CONTENT.chapters[i]!.playable && (i === 0 || this.profileSvc.chapterWon(i - 1));

    const rowsCursor = layoutCursor(202 - touchSize(38) / 2);
    CONTENT.chapters.forEach((ch, i) => {
      const won = this.profileSvc.chapterWon(i);
      const unlocked = isUnlocked(i);
      const state: RowState = won ? "done" : unlocked ? "normal" : "locked";
      const title = `${i + 1}. ${unlocked || won ? ch.name : "???"}`;
      const trailing = unlocked
        ? { label: won ? "Rejouer" : "⚔ Se battre", onClick: () => this.scene.start("game", { profileSvc: this.profileSvc, chapterIndex: i }) }
        : { label: ch.playable ? "🔒 Verrouillé" : "Bientôt" };
      const probe = uiListRow(this, 400, 0, { w: 640, h: 38, title, trailing, state });
      probe.container.setY(rowsCursor.next(probe.h, 4));
      if (won) {
        const stars = this.profileSvc.chapterStarsOf(i);
        probe.container.add(this.add.text(160, 0, "★".repeat(stars) + "☆".repeat(3 - stars), { fontSize: "15px", color: TEXT.gold, ...TXT }).setOrigin(0.5));
      }
      p.add(probe.container);
    });

    // Lore du prochain objectif (premier chapitre débloqué non conquis)
    const next = CONTENT.chapters.findIndex((_ch, i) => isUnlocked(i) && !this.profileSvc.chapterWon(i));
    const lore = next >= 0 ? CONTENT.chapters[next]!.lore : "La vallée respire. Pour l'instant.";
    p.add(this.add.text(400, rowsCursor.y + 8, lore.replace("\n", " "),
      { fontSize: "12px", color: TEXT.dim, ...TXT, align: "center", wordWrap: { width: 600 } }).setOrigin(0.5, 0));
  }

  // ---------- Failles infinies (mode séparé, teaser v1) ----------

  private buildRifts() {
    const p = this.panel!;
    p.add(uiSectionHeader(this, { title: "Failles infinies", onBack: () => this.showView("home") }));
    if (!this.profileSvc.storyCompleted()) {
      p.add(this.add.text(400, 290,
        "Les Failles ne s'ouvrent qu'aux vainqueurs.\n\nAchevez l'Histoire — terrassez le Roi-Charogne —\net leur seuil vous sera révélé.",
        { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
      p.add(uiChip(this, 400, 410, {
        icon: "🔒", text: `${this.profileSvc.get().chaptersWon.length}/${CONTENT.chapters.length} chapitres conquis`,
        fontSize: 16, color: TEXT.dim, pill: true,
      }).container);
      return;
    }
    p.add(this.add.text(400, 280,
      "Au-delà des terres connues, les Failles déversent\ndes hordes sans fin. Nul n'en est revenu —\nseuls les noms des plus endurants survivent,\ngravés dans les Chroniques.",
      { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
    p.add(uiChip(this, 400, 400, { icon: "🌀", text: "Bientôt", fontSize: 20, color: TEXT.rift, pill: true }).container);
    p.add(this.add.text(400, 460, "Mode v1 : scaling agressif, modificateurs de Faille, leaderboard.",
      { fontSize: "12px", color: TEXT.dim, ...TXT }).setOrigin(0.5));
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
