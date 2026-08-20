// ============================================================
// render/MenuScene.ts — Hub "Le Campement" : Histoire (chapitres),
// Armurerie (Arsenal/Forge/Héros), Chroniques (meilleurs runs).
// Première visite : intro lore (profile.introSeen).
// Wording & lore : voir GDD §Lore & présentation.
// Chaque écran vit dans render/menu/*View.ts ; cette scène ne fait
// plus que le lifecycle, le bandeau de titre, les monnaies et le
// dispatch de vue (ADR-034).
// ============================================================

import Phaser from "phaser";
import type { ProfileService } from "../meta/profile";
import { FONT_BODY, onSceneResize, preloadUi, setupCamera } from "./theme/ui";
import { touchSize, viewport } from "./platform/viewport";
import { EMBLEM, ICON, preloadIcons } from "./theme/icons";
import { addBackdrop } from "./assets/backdrop";
import { preloadSprites } from "./assets/assets";
import { applyAudioSettings, playMenuMusic, preloadAudio, preloadMusic, stopMenuMusic } from "./platform/audio";
import { buildLabel } from "./platform/buildInfo";
import { ACCENT, TEXT } from "./theme/theme";
import type { Viewport } from "./platform/viewport";
import { layoutCursor, uiButton, uiChip, uiModal, type LayoutCursor, type UiChip, type UiModal } from "./components";
import type { AudioFlag } from "../meta/profile";
import { buildBestiary } from "./menu/bestiaryView";
import { buildChronicles } from "./menu/chroniclesView";
import { buildHome } from "./menu/homeView";
import { buildRifts } from "./menu/riftsView";
import { buildShop } from "./menu/shopView";
import { buildStory } from "./menu/storyView";
import { CX, LORE_INTRO, TITLE } from "./menu/theme";
import type { BestiaryTab, MenuCtx, ShopTab, View } from "./menu/types";
import type { AudioSettings, Profile } from "../core/types";

export class MenuScene extends Phaser.Scene {
  private profileSvc!: ProfileService;
  private panel: Phaser.GameObjects.Container | null = null;
  private chipShards!: UiChip;
  private chipSceaux!: UiChip;
  private currentView: View = "home";
  private currentShopTab: ShopTab = "arsenal";
  private bestiaryTab: BestiaryTab = "creatures";
  private fsBtn: Phaser.GameObjects.Container | null = null;
  private soundBtn: Phaser.GameObjects.Container | null = null;

  constructor() { super("menu"); }
  init(data: { profileSvc: ProfileService }) { this.profileSvc = data.profileSvc; }
  // Le campement charge aussi les sprites du monde : le Bestiaire affiche
  // désormais les créatures et les tours, pas seulement leur description.
  preload() { preloadUi(this); preloadIcons(this); preloadSprites(this); preloadAudio(this); preloadMusic(this); }

  create() {
    setupCamera(this);
    // SoundManager partagé par toutes les scènes (une seule instance Phaser.Game,
    // ADR-037) : le Campement démarre toujours en premier (main.ts), donc c'est
    // ici que l'état persisté prend effet pour tout le jeu.
    applyAudioSettings(this, this.profileSvc.audioSettings());
    // Musique de menu (ADR-039) : idempotente (ne redémarre pas si déjà en cours,
    // cas du scene.restart() au resize), jamais jouée en run — coupée au shutdown
    // de cette scène (départ en run), pas seulement si les réglages l'interdisent.
    playMenuMusic(this);
    this.events.on("shutdown", () => stopMenuMusic());
    this.panel = null;
    // Le fond couvre la vue entière, pas seulement la zone de jeu : sur un écran
    // large, le débord doit rester habillé plutôt que noir (ADR-010). Grain +
    // vignette générés sur canvas plutôt qu'un aplat (ADR-014).
    const v: Viewport = viewport();
    addBackdrop(this, v);
    // Le campement n'a pas d'état volatil : au resize/rotation, on rebâtit l'écran
    // à neuf plutôt que de repositionner chaque élément un par un.
    onSceneResize(this, () => this.scene.restart({ profileSvc: this.profileSvc }));
    this.buildMasthead(v);
    // Étiquette de build (`render/platform/buildInfo.ts`) : discrète, en coin, mais
    // toujours là — c'est le point de repère pour ne plus se demander si le
    // navigateur affiche une version en cache après une modif.
    this.add.text(v.safeLeft + 6, v.safeBottom - 6, buildLabel(), {
      fontSize: "10px", color: TEXT.dim, fontFamily: FONT_BODY,
    }).setOrigin(0, 1).setAlpha(0.5).setDepth(999);
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
    const cx: number = CX;
    const g: Phaser.GameObjects.Graphics = this.add.graphics().setDepth(-50);

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
      const x0: number = cx + dir * 74, x1: number = cx + dir * 168;
      g.lineStyle(1, ACCENT.gold, 0.5);
      g.lineBetween(x0, 82, x1, 82);
      g.fillStyle(ACCENT.goldSoft, 0.75);
      g.fillCircle(x1 + dir * 5, 82, 2);
    }

    // Bascule plein écran : en onglet mobile, la barre d'URL mange une bonne part
    // de la hauteur. Le passage en plein écran EXIGE un geste utilisateur, d'où ce
    // bouton — il ne peut pas être déclenché au chargement.
    if (this.scale.fullscreen.available) {
      const s: number = touchSize(38);
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
    this.buildSoundBtn();
  }

  /** Bouton son (ADR-037/038), à gauche du plein écran — ouvre la modale de
   *  réglages plutôt que de couper directement (4 interrupteurs + volume,
   *  trop pour un simple clic). Reconstruit à chaque bascule de `master` pour
   *  refléter l'état sans garder de référence à l'icône interne (même limite
   *  que `fsBtn`, qui se resynchronise via un `scene.restart()` au resize). */
  private buildSoundBtn() {
    this.soundBtn?.destroy();
    const s: number = touchSize(38);
    const master: boolean = this.profileSvc.audioSettings().master;
    const gap: number = this.scale.fullscreen.available ? s + 10 : 0;
    const btn: Phaser.GameObjects.Container = uiButton(
      this, viewport().safeRight - s / 2 - 10 - gap, s / 2 + 10, "",
      { w: s, h: s, compact: true, icon: EMBLEM.sound },
      () => this.openAudioSettings(),
    ).container.setDepth(50);
    // État « éteint » : alpha réduit sur le bouton entier, pas de teinte — un
    // emblème raster arrive avec ses propres couleurs (ADR-031).
    btn.setAlpha(master ? 1 : 0.4);
    this.soundBtn = btn;
  }

  /** Modale de réglages audio (ADR-038) : 4 interrupteurs (master + 3
   *  catégories) et le volume par paliers de 10 %. `uiModal` ne se met pas à
   *  jour en place — `rebuild()` vide et redessine le contenu à chaque clic,
   *  même limite déjà documentée pour `uiButton` (.ai/pitfalls.md). */
  private openAudioSettings() {
    const w: number = 560, h: number = 460;
    // Toute mutation (interrupteur ou volume) doit repasser par applyAudioSettings :
    // ProfileService ne fait que persister, c'est ce point qui pousse l'état vers le
    // SoundManager Phaser ET le cache de catégorie de render/platform/audio.ts (ADR-038).
    // applyAudioSettings COUPE la musique si les réglages l'interdisent désormais, mais ne la
    // démarre jamais lui-même (il ne sait pas si le contexte actuel en veut) — playMenuMusic()
    // s'en charge ici, et ne fait rien si les réglages ne l'autorisent pas ou si elle joue déjà.
    const sync = () => { applyAudioSettings(this, this.profileSvc.audioSettings()); playMenuMusic(this); };
    const rebuild = (content: Phaser.GameObjects.Container) => {
      content.removeAll(true);
      const s: AudioSettings = this.profileSvc.audioSettings();
      const cursor: LayoutCursor = layoutCursor(-h / 2 + 90);
      const flagRow = (label: string, flag: AudioFlag, value: boolean) => {
        const y: number = cursor.next(44, 12);
        content.add(this.add.text(-w / 2 + 40, y, label, { fontSize: "16px", color: TEXT.light, fontFamily: FONT_BODY }).setOrigin(0, 0.5));
        content.add(uiButton(this, w / 2 - 100, y, value ? "ON" : "OFF",
          { w: 90, h: 38, gold: value },
          () => { this.profileSvc.toggleAudioFlag(flag); sync(); rebuild(content); this.buildSoundBtn(); }).container);
      };
      flagRow("Tout (son)", "master", s.master);
      flagRow("Musique", "music", s.music);
      flagRow("Notifications", "notifications", s.notifications);
      flagRow("Dégâts", "damage", s.damage);

      const volY: number = cursor.next(44, 12);
      content.add(this.add.text(-w / 2 + 40, volY, "Volume", { fontSize: "16px", color: TEXT.light, fontFamily: FONT_BODY }).setOrigin(0, 0.5));
      content.add(uiButton(this, w / 2 - 150, volY, "−", { w: 40, h: 38, compact: true },
        () => { this.profileSvc.stepVolume(-1); sync(); rebuild(content); }).container);
      content.add(this.add.text(w / 2 - 100, volY, `${Math.round(s.volume * 100)}%`, {
        fontSize: "16px", color: TEXT.gold, fontFamily: FONT_BODY,
      }).setOrigin(0.5));
      content.add(uiButton(this, w / 2 - 50, volY, "+", { w: 40, h: 38, compact: true },
        () => { this.profileSvc.stepVolume(1); sync(); rebuild(content); }).container);
    };
    let modal: UiModal;
    // eslint-disable-next-line prefer-const -- le bouton "Fermer" doit capturer cette même variable (référence circulaire volontaire : le callback est construit avant que la modale existe).
    modal = uiModal(this, {
      w, h, title: "Réglages du son", dimAlpha: 0.75,
      build: rebuild,
      buttons: [{ label: "Fermer", w: 200, gold: true, onClick: () => modal.close() }],
    });
  }

  /** Écarte les deux chips d'après leur largeur RÉELLE. Des X en dur les faisaient
   *  se chevaucher dès que la police est remontée sur petit écran (ADR-015). */
  private spreadCurrencies() {
    const gap: number = 34;
    const wa: number = this.chipShards.text.width, wb: number = this.chipSceaux.text.width;
    const total: number = wa + gap + wb;
    this.chipShards.container.setX(CX - total / 2 + wa / 2);
    this.chipSceaux.container.setX(CX + total / 2 - wb / 2);
  }

  private refreshCurrencies() {
    const p: Profile = this.profileSvc.get();
    this.chipShards.setText(`Éclats : ${p.shards}`);
    this.chipSceaux.setText(`Sceaux : ${p.sceaux}`);
    if (this.chipShards.container.scene) this.spreadCurrencies();
  }

  // ---------- Intro lore (première visite) ----------

  private showIntro() {
    const modal: UiModal = uiModal(this, {
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

  /** Contexte passé à l'écran courant : la scène, le panel fraîchement créé, et
   *  les points d'entrée vers l'état que seule cette classe possède. */
  private menuCtx(): MenuCtx {
    return {
      scene: this,
      panel: this.panel!,
      profileSvc: this.profileSvc,
      chipsBottomY: this.chipShards.container.y + this.chipShards.text.height / 2,
      navigate: (view: View) => this.showView(view),
      refreshCurrencies: () => this.refreshCurrencies(),
    };
  }

  private showView(view: View) {
    this.currentView = view;
    this.panel?.destroy();
    this.panel = this.add.container(0, 0);
    const ctx: MenuCtx = this.menuCtx();
    if (view === "home") buildHome(ctx);
    else if (view === "story") buildStory(ctx);
    else if (view === "rifts") buildRifts(ctx);
    else if (view === "shop") {
      buildShop(ctx, this.currentShopTab, (t) => { this.currentShopTab = t; this.showView("shop"); });
    } else if (view === "bestiary") {
      buildBestiary(ctx, this.bestiaryTab, (t) => { this.bestiaryTab = t; this.showView("bestiary"); });
    } else buildChronicles(ctx);
  }
}
