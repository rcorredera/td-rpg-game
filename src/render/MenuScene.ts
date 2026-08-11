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
import { ICON, preloadIcons } from "./icons";
import { ACCENT, TEXT } from "./theme";
import {
  layoutCursor, uiButton, uiChip, uiLevelGrid, uiListRow, uiModal, uiNavCard, uiPanel,
  uiScrollList, uiSectionHeader,
  type LayoutCursor, type RowState, type UiChip, type UiScrollList,
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
  preload() { preloadUi(this); preloadIcons(this); }

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
        label: "Prendre le commandement", w: 320, gold: true,
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
  private box(x: number, y: number, w: number, h: number, fill: number, stroke: number, r = 10,
              target?: Phaser.GameObjects.Container): Phaser.GameObjects.Graphics {
    // fill historique (0x22…/0x2b…) → teinte sombre ; on garde la sémantique des appels existants
    const t = target ?? this.panel!;
    const tint = fill === 0x221b12 ? UI_TINT.panelDim : UI_TINT.panel;
    t.add(uiPanel(this, x, y, w, h, tint));
    const g = this.add.graphics();
    g.lineStyle(1, stroke, 0.85); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    t.add(g);
    return g;
  }

  /** En-tête de sous-écran (retour + titre). Renvoie le Y à partir duquel empiler :
   *  les écrans ne doivent PLUS partir d'une constante, le bouton retour grandissant
   *  avec le plancher tactile (c'est ce qui masquait le titre du Bestiaire sur mobile). */
  private header(title: string): number {
    const h = uiSectionHeader(this, { title, onBack: () => this.showView("home") });
    this.panel!.add(h.container);
    return h.bottom;
  }

  /** Barre d'onglets posée sous `top`. Renvoie le Y du BAS des onglets — leur
   *  hauteur suit le plancher tactile, elle ne peut pas être supposée. */
  private tabs<T extends string>(
    top: number, defs: { id: T; label: string }[], active: T, onPick: (id: T) => void,
  ): number {
    const h = touchSize(32);
    const w = touchSize(130);
    const gap = 12;
    const totalW = defs.length * w + (defs.length - 1) * gap;
    const cy = top + 10 + h / 2;
    defs.forEach((t, i) => {
      const x = 400 - totalW / 2 + w / 2 + i * (w + gap);
      this.panel!.add(uiButton(this, x, cy, t.label,
        { w, h, gold: active === t.id, fontSize: 15 }, () => onPick(t.id)).container);
    });
    return cy + h / 2;
  }

  /** Zone défilante occupant tout l'espace restant sous `top`, jusqu'au bas de l'écran. */
  private scrollArea(top: number): UiScrollList {
    const v = viewport();
    const y = top + 10;
    const scroll = uiScrollList(this, { x: v.left, y, w: v.width, h: Math.max(80, v.bottom - y - 12) });
    this.panel!.add(scroll.content);
    return scroll;
  }

  /** Rangée de boutique, empilée dans une zone défilante. Migrée sur `uiListRow`
   *  (kit ADR-007) : hauteur effective et états gérés par le composant. */
  private row(
    cursor: LayoutCursor, c: Phaser.GameObjects.Container,
    title: string, desc: string, trailingLabel: string, trailingColor: string,
    cb: (() => void) | null, state: RowState = "normal",
  ) {
    const r = uiListRow(this, 400, 0, {
      w: 640, title, desc, state,
      trailing: cb ? { label: trailingLabel, onClick: cb } : { label: trailingLabel, color: trailingColor },
    });
    r.container.setY(cursor.next(r.h, 10));
    c.add(r.container);
  }

  // ---------- Hub ----------

  private buildHome() {
    const p = this.panel!;
    const wonCount = this.profileSvc.get().chaptersWon.length;
    const total = CONTENT.chapters.length;
    const storyDone = this.profileSvc.storyCompleted();
    const entries: { icon: string; title: string; sub: string; view: View; rift?: boolean }[] = [
      { icon: ICON.story, title: "Histoire", sub: wonCount > 0 ? `${wonCount}/${total} chapitres conquis` : "Chapitre 1 : La Route du Bastion", view: "story" },
      {
        icon: storyDone ? ICON.rift : ICON.locked, title: "Failles infinies",
        sub: storyDone ? "Vagues sans fin, gloire au plus endurant — bientôt" : "Se débloque en achevant l'Histoire",
        view: "rifts", rift: true,
      },
      { icon: ICON.armory, title: "Armurerie", sub: "Arsenal, forge des tours et sorts du héros", view: "shop" },
      { icon: ICON.bestiary, title: "Bestiaire", sub: `Connaître l'ennemi, c'est déjà le vaincre — ${this.profileSvc.get().bestiary.length}/${Object.keys(CONTENT.enemies).length} découverts`, view: "bestiary" },
      { icon: ICON.chronicles, title: "Chroniques", sub: "Vos hauts faits de guerre", view: "chronicles" },
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
        iconColor: e.rift ? (storyDone ? 0xb07cc6 : ACCENT.locked) : ACCENT.goldSoft,
        accent: e.rift ? ACCENT.dimBorder : ACCENT.gold,
        onSelect: () => this.showView(e.view),
      }).container);
    });
  }

  // ---------- Bestiaire (découverte progressive) ----------

  private buildBestiary() {
    const top = this.header("Bestiaire");
    const tabsY = this.tabs(top, [
      { id: "creatures", label: "Créatures" },
      { id: "defenses", label: "Défenses" },
    ], this.bestiaryTab, (id) => { this.bestiaryTab = id; this.showView("bestiary"); });

    // Liste défilante : le Bestiaire grandit à chaque créature ajoutée, il ne peut
    // plus dépendre de ce qui « tient » dans 600 px (ADR-013).
    const scroll = this.scrollArea(tabsY);
    const c = scroll.content;
    const cursor = layoutCursor(0);

    if (this.bestiaryTab === "defenses") { this.buildDefensePages(cursor, c, scroll); return; }

    const seen = this.profileSvc.get().bestiary;
    const enemies = Object.values(CONTENT.enemies);
    enemies.forEach((e) => {
      const y = cursor.next(76);
      const known = seen.includes(e.id);
      this.box(400, y, 640, 76, known ? 0x2b2118 : 0x221b12, known ? 0xc9a227 : 0x4a3f2e, 10, c);
      if (!known) {
        c.add(this.add.text(110, y - 24, "???", { fontSize: "17px", color: DIM, ...TXT }));
        c.add(this.add.text(110, y + 2, "Croisez cette créature au combat pour compléter sa page.", { fontSize: "12px", color: DIM, ...TXT }));
        return;
      }
      c.add(this.add.text(110, y - 26, `${e.name}${e.flying ? "  ·  volant" : ""}`, { fontSize: "17px", color: GOLD, ...TXT }));
      c.add(this.add.text(110, y - 5, e.lore, { fontSize: "11px", color: DIM, ...TXT, lineSpacing: 2 }));
      const stats = [
        `❤ ${e.hp} PV`, `Vitesse ${e.speed}`, `◆ ${e.goldReward}`,
        `Base -${e.damageToCastle} PV`, e.meleeDps > 0 ? `⚔ ${e.meleeDps}/s` : "⚔ inoffensif au contact",
      ].join("    ");
      c.add(this.add.text(110, y + 23, stats, { fontSize: "12px", color: LIGHT, ...TXT }));
    });
    c.add(this.add.text(400, cursor.next(28) - 6,
      "Les mini-boss sont des variantes renforcées des créatures connues.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5));
    scroll.setContentHeight(cursor.y);
  }

  /** Onglet Défenses : explique le rôle et les différences de chaque tour. */
  private buildDefensePages(cursor: LayoutCursor, c: Phaser.GameObjects.Container, scroll: UiScrollList) {
    const towers = Object.values(CONTENT.towers);
    towers.forEach((t) => {
      const y = cursor.next(92);
      const locked = t.requiresUnlock !== null && !this.profileSvc.get().unlocks.includes(t.requiresUnlock);
      this.box(400, y, 640, 92, 0x2b2118, locked ? 0x6b5a3e : 0xc9a227, 10, c);
      c.add(this.add.text(110, y - 34, `${t.name}${locked ? "  (verrouillée — Arsenal)" : ""}`, { fontSize: "17px", color: locked ? DIM : GOLD, ...TXT }));
      c.add(this.add.text(110, y - 13, t.lore, { fontSize: "11px", color: DIM, ...TXT, lineSpacing: 2 }));
      // Rôle tactique : LA ligne qui différencie les tours
      const role = t.splashRadius > 0 ? `Dégâts de zone (rayon ${t.splashRadius})` : "Monocible";
      const target = t.groundOnly ? "⚠ ne touche PAS les volants" : "vise sol et volants";
      const slow = t.slow ? ` · ralentit (vitesse ×${t.slow.factor} pendant ${t.slow.duration}s)` : "";
      c.add(this.add.text(110, y + 13, `${role} · ${target}${slow}`, { fontSize: "12px", color: t.groundOnly ? "#e8a87c" : LIGHT, ...TXT }));
      const l1 = t.levels[0]!, l3 = t.levels[t.levels.length - 1]!;
      c.add(this.add.text(110, y + 31, `⚔ ${l1.damage}→${l3.damage}   ⊙ ${l1.range}→${l3.range}   ${l1.fireRate}→${l3.fireRate} tir/s   coûts ${t.costs.join(" / ")} ◆`,
        { fontSize: "12px", color: LIGHT, ...TXT }));
    });
    c.add(this.add.text(400, cursor.next(30) - 6,
      "Le héros bloque et frappe les ennemis terrestres ; les volants l'ignorent — prévoyez l'Archerie.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5));
    scroll.setContentHeight(cursor.y);
  }

  // ---------- Histoire (chapitres) ----------

  private buildStory() {
    const top = this.header("Histoire");

    // Déblocage séquentiel : conquérir le chapitre précédent pour ouvrir le suivant
    const isUnlocked = (i: number) => CONTENT.chapters[i]!.playable && (i === 0 || this.profileSvc.chapterWon(i - 1));

    // Grille plutôt que liste : les chapitres sont des items courts et nombreux.
    // En paysage, une liste verticale gâche la largeur et déborde dès 10 entrées,
    // là où une grille les montre tous d'un coup (ADR-013).
    const scroll = this.scrollArea(top);
    const c = scroll.content;
    const tiles = CONTENT.chapters.map((ch, i) => {
      const won = this.profileSvc.chapterWon(i);
      const unlocked = isUnlocked(i);
      return {
        index: i + 1,
        name: unlocked || won ? ch.name : "???",
        state: (won ? "done" : unlocked ? "normal" : "locked") as RowState,
        stars: won ? this.profileSvc.chapterStarsOf(i) : 0,
        onSelect: unlocked
          ? () => this.scene.start("game", { profileSvc: this.profileSvc, chapterIndex: i })
          : undefined,
      };
    });
    const grid = uiLevelGrid(this, 400, 6, tiles, Math.min(700, viewport().width - 60));
    c.add(grid.container);

    // Lore du prochain objectif (premier chapitre débloqué non conquis)
    const next = CONTENT.chapters.findIndex((_ch, i) => isUnlocked(i) && !this.profileSvc.chapterWon(i));
    const lore = next >= 0 ? CONTENT.chapters[next]!.lore : "La vallée respire. Pour l'instant.";
    const loreY = 6 + grid.layout.totalH + 14;
    const loreText = this.add.text(400, loreY, lore.replace("\n", " "),
      { fontSize: "12px", color: TEXT.dim, ...TXT, align: "center", wordWrap: { width: 600 } }).setOrigin(0.5, 0);
    c.add(loreText);
    scroll.setContentHeight(loreY + loreText.height + 12);
  }

  // ---------- Failles infinies (mode séparé, teaser v1) ----------

  private buildRifts() {
    const p = this.panel!;
    this.header("Failles infinies");
    if (!this.profileSvc.storyCompleted()) {
      p.add(this.add.text(400, 290,
        "Les Failles ne s'ouvrent qu'aux vainqueurs.\n\nAchevez l'Histoire — terrassez le Roi-Charogne —\net leur seuil vous sera révélé.",
        { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
      const locked = uiChip(this, 412, 410, {
        text: `${this.profileSvc.get().chaptersWon.length}/${CONTENT.chapters.length} chapitres conquis`,
        fontSize: 16, color: TEXT.dim, pill: true,
      });
      p.add(locked.container);
      p.add(this.add.image(412 - locked.text.width / 2 - 18, 410, ICON.locked)
        .setDisplaySize(17, 17).setTint(ACCENT.dimBorder));
      return;
    }
    p.add(this.add.text(400, 280,
      "Au-delà des terres connues, les Failles déversent\ndes hordes sans fin. Nul n'en est revenu —\nseuls les noms des plus endurants survivent,\ngravés dans les Chroniques.",
      { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
    const soon = uiChip(this, 408, 400, { text: "Bientôt", fontSize: 20, color: TEXT.rift, pill: true });
    p.add(soon.container);
    p.add(this.add.image(408 - soon.text.width / 2 - 20, 400, ICON.rift).setDisplaySize(21, 21).setTint(0xb07cc6));
    p.add(this.add.text(400, 460, "Mode v1 : scaling agressif, modificateurs de Faille, leaderboard.",
      { fontSize: "12px", color: TEXT.dim, ...TXT }).setOrigin(0.5));
  }

  // ---------- Armurerie (Arsenal / Forge / Héros) ----------

  private buildShop() {
    const top = this.header("Armurerie");
    const tabsY = this.tabs(top, [
      { id: "arsenal" as ShopTab, label: "Arsenal" },
      { id: "forge" as ShopTab, label: "Forge" },
      { id: "hero" as ShopTab, label: "Héros" },
    ], this.currentShopTab, (id) => { this.currentShopTab = id; this.showView("shop"); });

    const scroll = this.scrollArea(tabsY);
    const cursor = layoutCursor(0);
    if (this.currentShopTab === "arsenal") this.buildArsenalRows(cursor, scroll.content);
    else if (this.currentShopTab === "forge") this.buildForgeRows(cursor, scroll.content);
    else this.buildHeroRows(cursor, scroll.content);
    scroll.setContentHeight(cursor.y);
  }

  private buildArsenalRows(cursor: LayoutCursor, c: Phaser.GameObjects.Container) {
    const p = this.profileSvc.get();
    UNLOCKS.forEach((u) => {
      const owned = p.unlocks.includes(u.id);
      // « Inabordable » : cadre atténué et coût en rouge tant que les Éclats manquent
      // (état prévu au GDD, jamais rendu jusqu'ici).
      const affordable = p.shards >= u.cost;
      this.row(cursor, c, u.name, u.desc,
        owned ? "Acquis" : `${u.cost} ◆`,
        owned ? OK : affordable ? GOLD : TEXT.bad,
        owned || !affordable ? null : () => { if (this.profileSvc.buy(u.id)) { this.refreshCurrencies(); this.showView("shop"); } },
        owned ? "done" : affordable ? "normal" : "unaffordable");
    });
  }

  private buildForgeRows(cursor: LayoutCursor, c: Phaser.GameObjects.Container) {
    const prof = this.profileSvc.get();
    const unlocks = prof.unlocks;
    const pct = Math.round(CONTENT.forge.damageMultPerLevel * 100);
    const maxLvl = CONTENT.forge.upgradeCosts.length;
    Object.values(CONTENT.towers).forEach((t) => {
      const locked = t.requiresUnlock !== null && !unlocks.includes(t.requiresUnlock);
      const lvl = this.profileSvc.forgeLevel(t.id);
      const cost = this.profileSvc.forgeNextCost(t.id);
      const stars = "★".repeat(lvl) + "☆".repeat(maxLvl - lvl);
      if (locked) {
        this.row(cursor, c, `${t.name}  ${stars}`, "Débloquez d'abord cette tour (Arsenal).", "Verrouillé", DIM, null, "locked");
      } else if (cost === null) {
        this.row(cursor, c, `${t.name}  ${stars}`, `+${pct}% dégâts par niveau — niveau maximum atteint.`, "Max", OK, null, "done");
      } else {
        const affordable = prof.shards >= cost;
        this.row(cursor, c, `${t.name}  ${stars}`, `+${pct}% dégâts permanents par niveau (actuel : +${lvl * pct}%).`,
          `${cost} ◆`, affordable ? GOLD : TEXT.bad,
          affordable ? () => { if (this.profileSvc.buyForge(t.id)) { this.refreshCurrencies(); this.showView("shop"); } } : null,
          affordable ? "normal" : "unaffordable");
      }
    });
  }

  private buildHeroRows(cursor: LayoutCursor, c: Phaser.GameObjects.Container) {
    c.add(this.add.text(400, cursor.next(26), `${CONTENT.hero.name} — les Sceaux ⚜ se gagnent avec les kills du héros en run`,
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

    skills.forEach((sk) => {
      const def = CONTENT.hero.skills[sk.id];
      const lvl = this.profileSvc.skillLevel(sk.id);
      const cost = this.profileSvc.skillNextCost(sk.id);
      const title = `${sk.name} — niv. ${lvl}/${def.levels.length}`;
      if (cost === null) {
        this.row(cursor, c, title, sk.desc(lvl), "Max", OK, null, "done");
      } else {
        const affordable = this.profileSvc.get().sceaux >= cost;
        this.row(cursor, c, title, sk.desc(lvl), `${cost} ⚜`, affordable ? SCEAU : TEXT.bad,
          affordable ? () => { if (this.profileSvc.buySkill(sk.id)) { this.refreshCurrencies(); this.showView("shop"); } } : null,
          affordable ? "normal" : "unaffordable");
      }
    });

    // Teaser : second héros (GDD : roster v1)
    this.row(cursor, c, "???", "Un nouveau héros rejoindra bientôt le campement…", "Bientôt", DIM, null, "locked");
  }

  // ---------- Chroniques (meilleurs runs, futur leaderboard) ----------

  private buildChronicles() {
    const top = this.header("Chroniques");
    const runs = this.profileSvc.get().bestRuns;
    if (runs.length === 0) {
      this.panel!.add(this.add.text(400, top + 120, "Les Chroniques sont vierges.\nLe Roi-Charogne n'attendra pas — partez au combat !",
        { fontSize: "16px", color: DIM, ...TXT, align: "center", lineSpacing: 6 }).setOrigin(0.5));
      return;
    }
    const scroll = this.scrollArea(top);
    const c = scroll.content;
    const cursor = layoutCursor(0);
    c.add(this.add.text(400, cursor.next(24), `Vos ${runs.length} plus hauts faits`, { fontSize: "14px", color: DIM, ...TXT }).setOrigin(0.5));
    runs.forEach((r, i) => {
      const y = cursor.next(touchSize(44), 8);
      const date = new Date(r.dateISO).toLocaleDateString("fr-FR");
      this.box(400, y, 600, touchSize(44), 0x2b2118, r.victory ? 0x27ae60 : 0x6b5a3e, 8, c);
      c.add(this.add.text(120, y, `#${i + 1}`, { fontSize: "15px", color: GOLD, ...TXT }).setOrigin(0, 0.5));
      const chap = r.chapter !== undefined ? `Ch.${r.chapter + 1} — ` : "";
      c.add(this.add.text(170, y, `${chap}${r.waves} vague${r.waves > 1 ? "s" : ""} — ${r.kills} kills`, { fontSize: "15px", color: LIGHT, ...TXT }).setOrigin(0, 0.5));
      c.add(this.add.text(500, y, r.victory ? "Victoire" : "Défaite", { fontSize: "14px", color: r.victory ? OK : DIM, ...TXT }).setOrigin(0.5));
      c.add(this.add.text(680, y, date, { fontSize: "13px", color: DIM, ...TXT }).setOrigin(1, 0.5));
    });
    scroll.setContentHeight(cursor.y);
  }
}
