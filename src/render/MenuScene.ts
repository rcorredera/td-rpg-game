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
import { touchSize, viewport, WORLD_W } from "./viewport";
import { EMBLEM, ICON, preloadIcons } from "./icons";
import { addBackdrop } from "./backdrop";
import { ensureTerrainTextures, grassTextureKey } from "./terrain";
import { enemyView, towerView } from "./sprites";
import { preloadSprites } from "./assets";
import { ACCENT, TEXT } from "./theme";
import {
  hubLayout, layoutCursor, levelGridZone, menuZone,
  decorativeEdgeVisible, uiButton, uiChip, uiLevelGrid, uiListRow, uiModal, uiPanel, uiPanelPad, uiTile,
  uiScrollList, uiSectionHeader,
  type LayoutCursor, type RowState, type UiChip, type UiScrollList,
} from "./components";

type View = "home" | "story" | "rifts" | "shop" | "chronicles" | "bestiary";
type ShopTab = "arsenal" | "forge" | "hero";

const TXT = { fontFamily: FONT_BODY };
const TITLE = { fontFamily: FONT_DISPLAY };

/** Centre horizontal du repère logique. Il était écrit en dur (`400` = l'ancien
 *  800/2) à une vingtaine d'endroits et a SURVÉCU au passage du champ de bataille
 *  en 960×540 (ADR-027) : tout l'écran était décalé de 80 unités vers la gauche.
 *  Invisible en paysage mobile — le débord latéral l'absorbe — mais flagrant dès
 *  que la largeur visible vaut celle du monde (desktop 16:10). Ne jamais réécrire
 *  un centre en dur : `hubZone`/`levelGridZone` le dérivent, et un test le garantit. */
const CX = WORLD_W / 2;
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
  private fsBtn: Phaser.GameObjects.Container | null = null;

  constructor() { super("menu"); }
  init(data: { profileSvc: ProfileService }) { this.profileSvc = data.profileSvc; }
  // Le campement charge aussi les sprites du monde : le Bestiaire affiche
  // désormais les créatures et les tours, pas seulement leur description.
  preload() { preloadUi(this); preloadIcons(this); preloadSprites(this); }

  create() {
    setupCamera(this);
    this.panel = null;
    // Le fond couvre la vue entière, pas seulement la zone de jeu : sur un écran
    // large, le débord doit rester habillé plutôt que noir (ADR-010). Grain +
    // vignette générés sur canvas plutôt qu'un aplat (ADR-014).
    const v = viewport();
    addBackdrop(this, v);
    // Le campement n'a pas d'état volatil : au resize/rotation, on rebâtit l'écran
    // à neuf plutôt que de repositionner chaque élément un par un.
    onSceneResize(this, () => this.scene.restart({ profileSvc: this.profileSvc }));
    this.buildMasthead(v);
    // Posées au centre : `spreadCurrencies()` les écarte ensuite d'après leur
    // largeur réelle. Les créer à des abscisses en dur « puisqu'elles sont
    // recalculées » laisse traîner deux valeurs justes par accident.
    this.chipShards = uiChip(this, CX, 122, { icon: "◆", text: "Éclats : 0", fontSize: 19, color: TEXT.light });
    this.chipSceaux = uiChip(this, CX, 122, { icon: "⚜", text: "Sceaux : 0", fontSize: 19, color: TEXT.light });
    this.refreshCurrencies();
    this.spreadCurrencies();

    if (!this.profileSvc.get().introSeen) this.showIntro();
    else this.showView(this.currentView);
  }

  /** Bandeau de titre : le seul point de l'écran qui doit crier, donc traité comme
   *  tel — halo derrière le titre, filets à filerets et non un simple trait, et un
   *  écart net avec le sous-titre. Avant, tout le texte avait le même poids. */
  private buildMasthead(v: { left: number; width: number }) {
    const cx = CX;
    const g = this.add.graphics().setDepth(-50);

    // Bandeau sombre derrière l'en-tête : détache le titre du grain du fond.
    g.fillStyle(0x0d0906, 0.45);
    g.fillRect(v.left, 0, v.width, 108);
    g.lineStyle(1, ACCENT.gold, 0.28);
    g.lineBetween(v.left, 108, v.left + v.width, 108);

    this.add.text(cx, 46, "⚔ Bastion", { fontSize: "42px", color: TEXT.gold, ...TITLE }).setOrigin(0.5);
    this.add.text(cx, 82, "LE CAMPEMENT", {
      fontSize: "12px", color: TEXT.dim, ...TITLE, letterSpacing: 4,
    }).setOrigin(0.5);

    // Filets latéraux, effilés vers l'extérieur : encadrent le sous-titre.
    for (const dir of [-1, 1]) {
      const x0 = cx + dir * 74, x1 = cx + dir * 168;
      g.lineStyle(1, ACCENT.gold, 0.5);
      g.lineBetween(x0, 82, x1, 82);
      g.fillStyle(ACCENT.goldSoft, 0.75);
      g.fillCircle(x1 + dir * 5, 82, 2);
    }

    // Bascule plein écran : en onglet mobile, la barre d'URL mange une bonne part
    // de la hauteur. Le passage en plein écran EXIGE un geste utilisateur, d'où ce
    // bouton — il ne peut pas être déclenché au chargement.
    if (this.scale.fullscreen.available) {
      const s = touchSize(38);
      // Icône du REGISTRE et non un glyphe Unicode : « ⤡ » n'est pas dans Cinzel,
      // il tombait sur la police du système et son encre, décentrée dans la boîte
      // de texte, faisait paraître le bouton de travers en plein écran (ADR-012).
      this.fsBtn = uiButton(this, viewport().safeRight - s / 2 - 10, s / 2 + 10, "",
        { w: s, h: s, compact: true, icon: this.scale.isFullscreen ? ICON.fullscreenExit : ICON.fullscreen },
        () => {
          if (this.scale.isFullscreen) this.scale.stopFullscreen();
          else this.scale.startFullscreen();
        }).container.setDepth(50);
    }
  }

  /** Écarte les deux chips d'après leur largeur RÉELLE. Des X en dur les faisaient
   *  se chevaucher dès que la police est remontée sur petit écran (ADR-015). */
  private spreadCurrencies() {
    const gap = 34;
    const wa = this.chipShards.text.width, wb = this.chipSceaux.text.width;
    const total = wa + gap + wb;
    this.chipShards.container.setX(CX - total / 2 + wa / 2);
    this.chipSceaux.container.setX(CX + total / 2 - wb / 2);
  }

  private refreshCurrencies() {
    const p = this.profileSvc.get();
    this.chipShards.setText(`Éclats : ${p.shards}`);
    this.chipSceaux.setText(`Sceaux : ${p.sceaux}`);
    if (this.chipShards.container.scene) this.spreadCurrencies();
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
    // Le panneau du pack porte son propre cadre : un liseré vectoriel par-dessus
    // le double (ADR-030). Même règle que `uiFramedPanel`, appliquée ici aussi —
    // ce helper sert les Chroniques et les fiches du Bestiaire.
    if (decorativeEdgeVisible(this)) {
      g.lineStyle(1, stroke, 0.85); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    }
    t.add(g);
    return g;
  }

  /** En-tête de sous-écran (retour + titre). Renvoie le Y à partir duquel empiler :
   *  les écrans ne doivent PLUS partir d'une constante, le bouton retour grandissant
   *  avec le plancher tactile (c'est ce qui masquait le titre du Bestiaire sur mobile). */
  private header(title: string): number {
    // L'en-tête se place SOUS les chips de monnaie, mesurées : le bouton retour
    // grandit avec le plancher tactile et la police, et un Y en dur le faisait
    // remonter par-dessus « Éclats » (constaté sur appareil réel).
    const chipsBottom = this.chipShards.container.y + this.chipShards.text.height / 2;
    const y = chipsBottom + 12 + touchSize(30) / 2;
    const h = uiSectionHeader(this, { title, y, onBack: () => this.showView("home") });
    this.panel!.add(h.container);
    return h.bottom;
  }

  /** Barre d'onglets posée sous `top`. Renvoie le Y du BAS des onglets — leur
   *  hauteur suit le plancher tactile, elle ne peut pas être supposée. */
  private tabs<T extends string>(
    top: number, defs: { id: T; label: string }[], active: T, onPick: (id: T) => void,
  ): number {
    const h = touchSize(32);
    const gap = 14;
    const cy = top + 10 + h / 2;
    // Les boutons s'élargissent pour contenir leur libellé (ADR-015) : on les crée
    // d'abord, puis on les positionne d'après leur largeur RÉELLE. Calculer les X
    // avant les faisait se toucher dès que la police est remontée.
    const made = defs.map(t => uiButton(this, 0, cy, t.label,
      { w: touchSize(130), h, gold: active === t.id, fontSize: 15 }, () => onPick(t.id)));
    const totalW = made.reduce((s, b) => s + b.w, 0) + gap * (made.length - 1);
    let x = CX - totalW / 2;
    made.forEach((b) => {
      b.container.setX(x + b.w / 2);
      x += b.w + gap;
      this.panel!.add(b.container);
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

  /**
   * Fiche du Bestiaire : empile des lignes de texte et dimensionne son cadre
   * D'APRÈS leur hauteur mesurée. Les tailles de police sont remontées sur petit
   * écran (ADR-015), donc une hauteur de carte fixe faisait déborder le texte
   * hors du cadre — constaté sur appareil réel.
   */
  private lorePage(
    cursor: LayoutCursor, c: Phaser.GameObjects.Container,
    lines: { text: string; size: number; color: string; wrap?: number }[],
    stroke: number, fill: number,
    /** Portrait affiché à gauche : le Bestiaire montre la créature, il ne la
     *  décrit pas seulement (ADR-016). `null` = inconnue, silhouette masquée. */
    portrait?: { key: string; known: boolean },
  ) {
    // Géométrie DÉRIVÉE de la carte. `textX` valait `110 + artW` et la carte va de
    // 160 à 800 : le texte du Bestiaire commençait 50 unités HORS de son panneau,
    // un reste du monde 800×600 que le passage en 960×540 (ADR-027) n'avait pas
    // rattrapé. La marge, elle, vient de l'ornement du pack (ADR-030).
    const cardW = 640;
    const pad = Math.max(14, uiPanelPad(this)), lead = 4;
    const cardLeft = CX - cardW / 2;
    const artW = portrait ? 76 : 0;
    const textX = cardLeft + pad + artW;
    const wrapMax = cardW - pad * 2 - artW;
    const objs = lines.map(l => this.add.text(0, 0, l.text, {
      fontSize: `${l.size}px`, color: l.color, ...TXT, lineSpacing: 2,
      ...(l.wrap ? { wordWrap: { width: Math.min(l.wrap, wrapMax) } } : {}),
    }));
    const inner = objs.reduce((s, o, i) => s + o.height + (i ? lead : 0), 0);
    const h = Math.max(inner + pad * 2, portrait ? 78 : 0);
    const y = cursor.next(h, 10);
    this.box(CX, y, cardW, h, fill, stroke, 10, c);

    if (portrait) {
      const size = Math.min(62, h - 14);
      const img = this.add.image(cardLeft + pad + artW / 2 - 8, y, portrait.key).setDisplaySize(size, size);
      // Créature non découverte : silhouette noire, comme un Pokédex — on voit la
      // forme sans révéler l'unité.
      if (!portrait.known) img.setTint(0x120d09);
      c.add(img);
    }

    let ty = y - h / 2 + pad;
    objs.forEach((o) => {
      o.setPosition(textX, ty);
      ty += o.height + lead;
      c.add(o);
    });
  }

  /** Rangée de boutique, empilée dans une zone défilante. Migrée sur `uiListRow`
   *  (kit ADR-007) : hauteur effective et états gérés par le composant. */
  private row(
    cursor: LayoutCursor, c: Phaser.GameObjects.Container,
    title: string, desc: string, trailingLabel: string, trailingColor: string,
    cb: (() => void) | null, state: RowState = "normal",
  ) {
    const r = uiListRow(this, CX, 0, {
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
    const entries: {
      icon: string; title: string; sub: string; view: View;
      /** Emblème raster du pack — affiché tel quel, sans teinte. */
      raw?: boolean;
      rift?: boolean;
    }[] = [
      // Sous-titres COURTS : une tuile n'est pas une rangée de liste, la phrase y
      // passe à la ligne et écrase l'icône. On y met l'état, pas la description —
      // le détail appartient à l'écran qu'elle ouvre (ADR-025).
      { icon: EMBLEM.bastion, raw: true, title: "Histoire", sub: wonCount > 0 ? `${wonCount} / ${total} chapitres conquis` : "Chapitre 1 · La Route du Bastion", view: "story" },
      {
        icon: storyDone ? ICON.rift : ICON.locked, title: "Failles infinies",
        sub: storyDone ? "Bientôt" : "Achevez l'Histoire",
        view: "rifts", rift: true,
      },
      { icon: ICON.armory, title: "Armurerie", sub: "Arsenal · Forge · Héros", view: "shop" },
      { icon: ICON.bestiary, title: "Bestiaire", sub: `${this.profileSvc.get().bestiary.length} / ${Object.keys(CONTENT.enemies).length} découverts`, view: "bestiary" },
      { icon: ICON.chronicles, title: "Chroniques", sub: "Vos hauts faits", view: "chronicles" },
    ];
    // Deux rangs de tuiles, disposés d'après la largeur RÉELLE de l'écran (ADR-025).
    // Avant : cinq cartes identiques dans une colonne de 540 unités, quand le paysage
    // mobile en offre ~1 300 — 44 % d'occupation, et aucune hiérarchie pour dire où
    // aller. La disposition est calculée par `hubLayout`, pur et testé, et son
    // ANCRAGE (centre + zone utile) par `menuZone` — les deux le sont désormais.
    const [primary, ...rest] = entries;
    const z = menuZone(viewport());
    const layout = hubLayout(z.cx, z.cy, z.w, z.h, rest.length);

    p.add(uiTile(this, layout.primary.x, layout.primary.y, {
      w: layout.primary.w, h: layout.primary.h,
      icon: primary!.icon, rawIcon: primary!.raw, title: primary!.title, sub: primary!.sub,
      primary: true,
      progress: total > 0 ? wonCount / total : 0,
      onSelect: () => this.showView(primary!.view),
    }));

    rest.forEach((e, i) => {
      const box = layout.secondary[i]!;
      p.add(uiTile(this, box.x, box.y, {
        w: box.w, h: box.h,
        icon: e.icon, title: e.title, sub: e.sub,
        titleColor: TEXT.light,
        ribbonTone: e.rift ? "rift" : "normal",
        iconColor: e.rift ? (storyDone ? 0xb07cc6 : ACCENT.locked) : ACCENT.goldSoft,
        accent: e.rift ? ACCENT.dimBorder : ACCENT.gold,
        locked: e.rift && !storyDone,
        onSelect: () => this.showView(e.view),
      }));
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
      const known = seen.includes(e.id);
      if (!known) {
        this.lorePage(cursor, c, [
          { text: "???", size: 17, color: DIM },
          { text: "Croisez cette créature au combat pour compléter sa page.", size: 12, color: DIM, wrap: 560 },
        ], 0x4a3f2e, 0x221b12, { key: enemyView(e.id).key, known: false });
        return;
      }
      const stats = [
        `❤ ${e.hp} PV`, `Vitesse ${e.speed}`, `◆ ${e.goldReward}`,
        `Base -${e.damageToCastle} PV`, e.meleeDps > 0 ? `⚔ ${e.meleeDps}/s` : "⚔ inoffensif au contact",
      ].join("    ");
      // Traits accolés au nom, comme « volant ». Ce sont eux qui dictent la réponse :
      // un Bestiaire qui les tait laisse le joueur découvrir sur le tas qu'une tour
      // ne sert à rien contre cette créature — et « connaître l'ennemi » est sa
      // promesse (ADR-022).
      const traits = [
        e.flying ? "volant" : "",
        e.armor ? `cuirassé ${e.armor}` : "",
        e.slowImmune ? "insensible au froid" : "",
      ].filter(Boolean);
      this.lorePage(cursor, c, [
        { text: `${e.name}${traits.length ? `  ·  ${traits.join("  ·  ")}` : ""}`, size: 17, color: GOLD },
        { text: e.lore, size: 11, color: DIM, wrap: 560 },
        { text: stats, size: 12, color: LIGHT, wrap: 560 },
      ], 0xc9a227, 0x2b2118, { key: enemyView(e.id).key, known: true });
    });
    c.add(this.add.text(CX,cursor.next(28) - 6,
      "Les mini-boss sont des variantes renforcées des créatures connues.",
      { fontSize: "11px", color: DIM, ...TXT }).setOrigin(0.5));
    scroll.setContentHeight(cursor.y);
  }

  /** Onglet Défenses : explique le rôle et les différences de chaque tour. */
  private buildDefensePages(cursor: LayoutCursor, c: Phaser.GameObjects.Container, scroll: UiScrollList) {
    const towers = Object.values(CONTENT.towers);
    towers.forEach((t) => {
      const locked = t.requiresUnlock !== null && !this.profileSvc.get().unlocks.includes(t.requiresUnlock);
      // Rôle tactique : LA ligne qui différencie les tours
      const role = t.splashRadius > 0 ? `Dégâts de zone (rayon ${t.splashRadius})` : "Monocible";
      const target = t.groundOnly ? "⚠ ne touche PAS les volants" : "vise sol et volants";
      const slow = t.slow ? ` · ralentit (vitesse ×${t.slow.factor} pendant ${t.slow.duration}s)` : "";
      const l1 = t.levels[0]!, l3 = t.levels[t.levels.length - 1]!;
      this.lorePage(cursor, c, [
        { text: `${t.name}${locked ? "  (verrouillée — Arsenal)" : ""}`, size: 17, color: locked ? DIM : GOLD },
        { text: t.lore, size: 11, color: DIM, wrap: 560 },
        { text: `${role} · ${target}${slow}`, size: 12, color: t.groundOnly ? "#e8a87c" : LIGHT, wrap: 560 },
        { text: `⚔ ${l1.damage}→${l3.damage}   ⊙ ${l1.range}→${l3.range}   ${l1.fireRate}→${l3.fireRate} tir/s   coûts ${t.costs.join(" / ")} ◆`, size: 12, color: LIGHT, wrap: 560 },
      ], locked ? 0x6b5a3e : 0xc9a227, 0x2b2118, { key: towerView(t.id).base.key, known: !locked });
    });
    c.add(this.add.text(CX,cursor.next(30) - 6,
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
    // Les textures de sol sont générées à la demande côté jeu (ADR-023) ; l'écran
    // Histoire en a besoin aussi pour l'aperçu des vignettes.
    for (const ch of CONTENT.chapters) ensureTerrainTextures(this, ch.biome);

    const tiles = CONTENT.chapters.map((ch, i) => {
      const won = this.profileSvc.chapterWon(i);
      const unlocked = isUnlocked(i);
      return {
        index: i + 1,
        name: unlocked || won ? ch.name : "???",
        state: (won ? "done" : unlocked ? "normal" : "locked") as RowState,
        stars: won ? this.profileSvc.chapterStarsOf(i) : 0,
        // Le lieu se découvre : un chapitre verrouillé garde son décor caché.
        biomeTexture: unlocked || won ? grassTextureKey(ch.biome) : undefined,
        onSelect: unlocked
          ? () => this.scene.start("game", { profileSvc: this.profileSvc, chapterIndex: i })
          : undefined,
      };
    });
    // La grille s'élargit avec l'écran : bornée à 700, elle laissait un tiers du
    // paysage inutilisé alors qu'elle est l'écran le plus consulté du jeu (ADR-025).
    const gz = levelGridZone(viewport());
    // La grille reçoit aussi la HAUTEUR disponible : bornée à sa cellule plancher
    // de 74, elle laissait 40 % de l'écran vide sous elle alors que les vignettes
    // portent l'aperçu du biome — c'est justement ce qui gagne à être grand.
    const GRID_TOP = 6, LORE_H = 44;
    const gridH = Math.max(80, viewport().bottom - (top + 10) - 12 - GRID_TOP - LORE_H);
    const grid = uiLevelGrid(this, gz.cx, GRID_TOP, tiles, gz.w, 5, gridH);
    c.add(grid.container);

    // Lore du prochain objectif (premier chapitre débloqué non conquis)
    const next = CONTENT.chapters.findIndex((_ch, i) => isUnlocked(i) && !this.profileSvc.chapterWon(i));
    const lore = next >= 0 ? CONTENT.chapters[next]!.lore : "La vallée respire. Pour l'instant.";
    const loreY = GRID_TOP + grid.layout.totalH + 14;
    const loreText = this.add.text(CX,loreY, lore.replace("\n", " "),
      { fontSize: "12px", color: TEXT.dim, ...TXT, align: "center", wordWrap: { width: 600 } }).setOrigin(0.5, 0);
    c.add(loreText);
    scroll.setContentHeight(loreY + loreText.height + 12);
  }

  // ---------- Failles infinies (mode séparé, teaser v1) ----------

  private buildRifts() {
    const p = this.panel!;
    this.header("Failles infinies");
    if (!this.profileSvc.storyCompleted()) {
      p.add(this.add.text(CX,290,
        "Les Failles ne s'ouvrent qu'aux vainqueurs.\n\nAchevez l'Histoire — terrassez le Roi-Charogne —\net leur seuil vous sera révélé.",
        { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
      const locked = uiChip(this, CX, 410, {
        text: `${this.profileSvc.get().chaptersWon.length}/${CONTENT.chapters.length} chapitres conquis`,
        fontSize: 16, color: TEXT.dim, pill: true,
      });
      p.add(locked.container);
      p.add(this.add.image(CX - locked.text.width / 2 - 18, 410, ICON.locked)
        .setDisplaySize(17, 17).setTint(ACCENT.dimBorder));
      return;
    }
    p.add(this.add.text(CX,280,
      "Au-delà des terres connues, les Failles déversent\ndes hordes sans fin. Nul n'en est revenu —\nseuls les noms des plus endurants survivent,\ngravés dans les Chroniques.",
      { fontSize: "17px", color: TEXT.light, ...TXT, align: "center", lineSpacing: 8 }).setOrigin(0.5));
    const soon = uiChip(this, CX + 8, 400, { text: "Bientôt", fontSize: 20, color: TEXT.rift, pill: true });
    p.add(soon.container);
    p.add(this.add.image(CX + 8 - soon.text.width / 2 - 20, 400, ICON.rift).setDisplaySize(21, 21).setTint(0xb07cc6));
    p.add(this.add.text(CX,460, "Mode v1 : scaling agressif, modificateurs de Faille, leaderboard.",
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
    // Dit ce qui est RÉELLEMENT récompensé (ADR-021) : le temps passé à retenir la
    // horde, et non les kills — sinon le joueur optimise la mauvaise chose.
    c.add(this.add.text(CX,cursor.next(26), `${CONTENT.hero.name} — les Sceaux ⚜ se gagnent en retenant la horde au corps à corps`,
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
      this.panel!.add(this.add.text(CX,top + 120, "Les Chroniques sont vierges.\nLe Roi-Charogne n'attendra pas — partez au combat !",
        { fontSize: "16px", color: DIM, ...TXT, align: "center", lineSpacing: 6 }).setOrigin(0.5));
      return;
    }
    const scroll = this.scrollArea(top);
    const c = scroll.content;
    const cursor = layoutCursor(0);
    c.add(this.add.text(CX,cursor.next(24), `Vos ${runs.length} plus hauts faits`, { fontSize: "14px", color: DIM, ...TXT }).setOrigin(0.5));
    // Colonnes DÉRIVÉES de la rangée, jamais posées en absolu. Les quatre X
    // valaient 120 / 170 / 500 / 680 : des restes du monde 800×600 centré sur 400.
    // Après le passage en 960×540 (ADR-027), la rangée va de 180 à 780 — le rang
    // « #1 » tombait donc 60 unités HORS du panneau et le libellé se posait sur sa
    // volute d'angle. Le centre avait été corrigé partout, ces quatre-là non.
    const rowW = 600;
    const pad = uiPanelPad(this);
    const left = CX - rowW / 2 + pad;
    const right = CX + rowW / 2 - pad;
    runs.forEach((r, i) => {
      const y = cursor.next(touchSize(44), 8);
      const date = new Date(r.dateISO).toLocaleDateString("fr-FR");
      this.box(CX, y, rowW, touchSize(44), 0x2b2118, r.victory ? 0x27ae60 : 0x6b5a3e, 8, c);
      const rang = this.add.text(left, y, `#${i + 1}`, { fontSize: "15px", color: GOLD, ...TXT }).setOrigin(0, 0.5);
      c.add(rang);
      const chap = r.chapter !== undefined ? `Ch.${r.chapter + 1} — ` : "";
      c.add(this.add.text(left + rang.width + 12, y, `${chap}${r.waves} vague${r.waves > 1 ? "s" : ""} — ${r.kills} kills`,
        { fontSize: "15px", color: LIGHT, ...TXT }).setOrigin(0, 0.5));
      c.add(this.add.text(CX + rowW * 0.12, y, r.victory ? "Victoire" : "Défaite",
        { fontSize: "14px", color: r.victory ? OK : DIM, ...TXT }).setOrigin(0.5));
      c.add(this.add.text(right, y, date, { fontSize: "13px", color: DIM, ...TXT }).setOrigin(1, 0.5));
    });
    scroll.setContentHeight(cursor.y);
  }
}
