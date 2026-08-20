// ============================================================
// render/game/hud.ts — Barre d'actions du run (or/PV/vague à
// gauche, sorts/vitesse/vague à droite) et bouton Camp. Voir
// ADR-011, ADR-015, ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CURSOR_POINT, FONT_BODY, FONT_DISPLAY, UI_TINT } from "../theme/ui";
import { scaleFont, touchSize, viewport } from "../platform/viewport";
import type { Viewport } from "../platform/viewport";
import { ICON } from "../theme/icons";
import { skinPressVisual, uiButton } from "../components";
import {
  ensureUiSkinTextures, uiSkinActive, uiSkinInsets,
  UI_SKIN_BTN, UI_SKIN_BTN_PRESS, UI_SKIN_BTN_PRIMARY, UI_SKIN_BTN_PRIMARY_PRESS,
} from "../skin/uiSkin";
import type { Insets } from "../skin/nineSlicePlan";
import { C, GAME_W, HUD_LABEL } from "./constants";
import type { HudBuildCtx, HudKey } from "./types";

/** Actions déclenchées par les boutons du HUD ; la logique (mode sort, FX de
 *  lancement, bascule vitesse…) reste dans `GameScene`, qui les passe en callbacks. */
export interface HudCallbacks {
  onSpell: () => void;
  onRally: () => void;
  onWhirlwind: () => void;
  onSpeedToggle: () => void;
  onAutoToggle: () => void;
  onNextWave: () => void;
  onQuit: () => void;
}

/** État courant à afficher, calculé une fois par frame par `GameScene.update`. */
export interface HudResourceState {
  gold: number;
  castleHp: number;
  castleHpMax: number;
  waveIndex: number;
  totalWaves: number;
}

export interface HudActionState {
  waveReady: boolean;
  autoWave: boolean;
  speed: number;
  wwReadyAt: number;
  rallyReadyAt: number;
  spellReadyAt: number;
  runTime: number;
}

export class Hud {
  container!: Phaser.GameObjects.Container;
  /** Haut de la barre en unités logiques — les taps au-dessous sont ignorés. */
  top = 0;
  /** Bouton « quitter » : hors du container HUD (ancré au coin haut), détruit à part. */
  quitBtn: Phaser.GameObjects.Container | null = null;

  private texts: Partial<Record<HudKey, Phaser.GameObjects.Text>> = {};
  private plates: Partial<Record<HudKey, Phaser.GameObjects.NineSlice>> = {};
  private icons: Partial<Record<HudKey, Phaser.GameObjects.Image>> = {};
  /** Bord gauche sûr du HUD : origine de la cascade or / base / vague. */
  private leftX = 0;

  constructor(private scene: Phaser.Scene) {}

  destroy(): void {
    this.container?.destroy(true);
    this.quitBtn?.destroy();
    this.quitBtn = null;
    this.texts = {}; this.plates = {}; this.icons = {};
  }

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
    const baseY: readonly number[] = movers.map(m => m.y);
    let pressed: boolean = false;
    const set = (on: boolean): void => {
      if (on === pressed) return;
      pressed = on;
      skinPressVisual(this.scene, plate, keyUp, keyDown, movers, baseY, on);
    };
    plate.on("pointerdown", () => set(true));
    plate.on("pointerup", () => set(false));
    plate.on("pointerout", () => set(false));
  }

  /** Libellé passif (sans plaque), aligné à gauche : le groupe est ensuite mis en
   *  cascade d'après les largeurs réelles (`layoutHudLeft`), car les valeurs
   *  changent en jeu et les polices sont remontées sur petit écran (ADR-015). */
  private mkHudLabel(ctx: HudBuildCtx, key: HudKey, label: string, size = 16): void {
    const t: Phaser.GameObjects.Text = this.scene.add.text(0, ctx.cy, label, { fontSize: `${size}px`, color: C.uiText, fontFamily: FONT_DISPLAY }).setOrigin(0, 0.5);
    this.texts[key] = t; this.container.add(t);
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
    const plate: Phaser.GameObjects.NineSlice = this.scene.add.nineslice(x, ctx.cy, k, undefined, w, ctx.btnH, pi.left, pi.right, pi.top, pi.bottom);
    if (!ctx.skin && !gold) plate.setTint(UI_TINT.btn);
    plate.setInteractive({ cursor: CURSOR_POINT })
      .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); cb(); });
    this.plates[key] = plate; this.container.add(plate);
    const t: Phaser.GameObjects.Text = this.scene.add.text(x, ctx.cy - 2, label, {
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
    this.texts[key] = t; this.container.add(t);
    this.wireHudPress(ctx, plate, k, this.hudPressedKey(ctx, gold), [t]);
    return plate.width;
  }

  /** Sorts : boutons-icônes carrés (cooldown affiché sous l'icône). */
  private mkHudIconButton(ctx: HudBuildCtx, key: HudKey, x: number, icon: string, cb: () => void): void {
    const k: string = this.hudPlateKey(ctx, false), pi: Insets = this.hudPlateInsets(ctx, k);
    // Plancher : deux marges doivent tenir dans le côté, sinon les coins se recouvrent.
    const side: number = Math.max(ctx.iconS, pi.left + pi.right + 2, pi.top + pi.bottom + 2);
    const plate: Phaser.GameObjects.NineSlice = this.scene.add.nineslice(x, ctx.cy, k, undefined, side, side, pi.left, pi.right, pi.top, pi.bottom);
    if (!ctx.skin) plate.setTint(UI_TINT.btn);
    plate.setInteractive({ cursor: CURSOR_POINT })
      .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); cb(); });
    this.plates[key] = plate; this.container.add(plate);
    // Icône et compteur SUPERPOSÉS, pas empilés. La zone plate d'une plaque du
    // pack ne fait que ~32 unités (le reste est pris par les marges et par le
    // relief dessiné sous le bouton) : y tasser une icône ET un chiffre les
    // faisait déborder sur ce relief, où le chiffre devenait illisible. Le
    // compteur remplace donc l'icône pendant la recharge, ce qui lève aussi
    // l'ambiguïté — un bouton qui affiche un chiffre est un bouton indisponible.
    const glyph: number = ctx.iconS * (ctx.skin ? 0.44 : 0.54);
    const img: Phaser.GameObjects.Image = this.scene.add.image(x, ctx.cy - (ctx.skin ? 0 : ctx.iconS * 0.08), icon)
      .setDisplaySize(glyph, glyph).setTint(0xf0e6d2);
    this.icons[key] = img; this.container.add(img);
    const cd: Phaser.GameObjects.Text = this.scene.add.text(x, ctx.cy + (ctx.skin ? 0 : ctx.iconS * 0.33), "",
      { fontSize: ctx.skin ? "15px" : "10px", color: ctx.skin ? HUD_LABEL : "#e8c252", fontFamily: FONT_DISPLAY }).setOrigin(0.5);
    this.texts[key] = cd; this.container.add(cd);
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
      for (const o of [this.plates[key], this.texts[key], this.icons[key]]) o?.setX(o.x + dx);
    }
    return cursorX - (real + 8);
  }

  /** (Re)construit tout le HUD — appelé par `create()` et par `relayout()` après
   *  un resize/rotation (l'ancien doit être détruit avant, via `destroy()`). */
  build(hasAccountSpell: boolean, cb: HudCallbacks): void {
    this.container = this.scene.add.container(0, 0);
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
    ensureUiSkinTextures(this.scene);
    const skin: boolean = uiSkinActive(this.scene);
    const btnH: number = touchSize(Math.max(40, skin ? 48 : 0));
    const iconS: number = touchSize(48);
    const barH: number = Math.max(70, Math.max(btnH, iconS) + 22);
    const cy: number = v.safeBottom - barH / 2;   // axe des contrôles
    this.top = v.safeBottom - barH;
    const xL: number = v.safeLeft, xR: number = v.safeRight;
    const ctx: HudBuildCtx = { skin, cy, btnH, iconS };

    const bar: Phaser.GameObjects.Graphics = this.scene.add.graphics();
    bar.fillStyle(C.ui, 0.97); bar.fillRect(v.left, this.top, v.width, v.bottom - this.top);
    bar.lineStyle(2, 0xc9a227, 0.35); bar.lineBetween(v.left, this.top, v.right, this.top);
    this.container.add(bar);

    // --- Groupe gauche : état du run (lecture seule) ---
    this.mkHudLabel(ctx, "gold", "");
    // Icône du registre plutôt qu'un emoji 🏰 : rendu identique sur tout OS et
    // teintable (elle vire au rouge quand la base souffre — cf. `updateResources`).
    const cs: number = Math.max(17, scaleFont(15));
    this.icons["castle"] = this.scene.add.image(0, cy, ICON.castle).setDisplaySize(cs, cs);
    this.container.add(this.icons["castle"]!);
    this.mkHudLabel(ctx, "castle", "");
    this.mkHudLabel(ctx, "wave", "", 15);
    this.leftX = xL + 14;

    // --- Groupe droit : actions, posées de droite à gauche ---
    // Les sorts occupent l'extrémité (les plus utilisés en combat), puis les
    // contrôles de vague. `▶ Vague` reste en or : c'est l'action principale.
    // Posés de droite à gauche à partir du bord sûr, chacun d'après sa largeur
    // effective : les boutons grossissent sur mobile sans jamais se chevaucher.
    let x: number = xR - 16;
    if (hasAccountSpell) {
      x = this.placeHudButton(x, "spell", iconS, cx => this.mkHudIconButton(ctx, "spell", cx, "icon_spell", cb.onSpell));
    }
    x = this.placeHudButton(x, "rally", iconS, cx => this.mkHudIconButton(ctx, "rally", cx, "icon_rally", cb.onRally));
    x = this.placeHudButton(x, "ww", iconS, cx => this.mkHudIconButton(ctx, "ww", cx, "icon_ww", cb.onWhirlwind));
    const wSpeed: number = touchSize(48), wAuto: number = touchSize(76), wWave: number = touchSize(100);
    x = this.placeHudButton(x, "speed", wSpeed, cx => this.mkHudButton(ctx, "speed", cx, wSpeed, "x1", cb.onSpeedToggle));
    x = this.placeHudButton(x, "auto", wAuto, cx => this.mkHudButton(ctx, "auto", cx, wAuto, "Auto ✗", cb.onAutoToggle));
    x = this.placeHudButton(x, "nextWave", wWave, cx => this.mkHudButton(ctx, "nextWave", cx, wWave, "▶ Vague", cb.onNextWave, 15, true));

    // Séparateur entre le bloc d'état et le bloc d'actions
    bar.lineStyle(1, 0xc9a227, 0.15);
    bar.lineBetween(x - 8, this.top + 12, x - 8, v.safeBottom - 12);
    this.container.setDepth(1000);

    // Bouton quitter : coin haut-gauche sûr (sous l'encoche éventuelle). Sa hauteur
    // effective décide de son centre, sinon il déborderait au-dessus sur mobile.
    // Il suit le bord sûr, mais JAMAIS au-delà du champ de bataille : sur un écran
    // plus large que le monde (2,2:1 mesuré chez un joueur), `safeLeft` vaut −114
    // et le bouton partait dans la bande noire, détaché du jeu et collé au bord du
    // canvas. Le bord du monde reste largement à portée du pouce (ADR-011), c'est
    // lui la vraie limite de l'écran utile.
    const quitH: number = touchSize(32), quitW: number = touchSize(86);
    const quitX: number = Math.max(v.safeLeft, 0) + 10 + quitW / 2;
    this.quitBtn = uiButton(this.scene, quitX, Math.max(v.safeTop, 0) + 8 + quitH / 2, "⟵ Camp",
      { w: quitW, h: quitH, fontSize: 13 }, cb.onQuit).container.setDepth(1000);

    // Annonce de Faille (portails) — haut de l'écran, visible uniquement quand pertinent
    this.texts["portalWarn"] = this.scene.add.text(GAME_W / 2, v.safeTop + 10, "", {
      fontSize: "16px", color: "#c9a2e8", fontFamily: FONT_BODY,
      backgroundColor: "#2b2118", padding: { x: 12, y: 5 },
    }).setOrigin(0.5, 0).setDepth(1000).setVisible(false);
  }

  showPortalWarn(show: boolean): void {
    if (show) this.texts["portalWarn"]?.setText("⚠ Une Faille s'ouvrira à la prochaine vague !");
    this.texts["portalWarn"]?.setVisible(show);
  }

  /** Met en cascade or → base → vague d'après leurs largeurs courantes. Recalculé
   *  à chaque frame car les valeurs changent en jeu (« 160 » puis « 1160 ») et une
   *  position fixe finissait par faire se chevaucher les libellés. */
  private layoutHudLeft(): void {
    const gap: number = 16;
    let x: number = this.leftX;
    const put = (t?: Phaser.GameObjects.Text) => {
      if (!t) return;
      t.setX(x);
      x += t.width + gap;
    };
    put(this.texts["gold"]);
    const icon: Phaser.GameObjects.Image | undefined = this.icons["castle"];
    if (icon) {
      icon.setX(x + icon.displayWidth / 2);
      x += icon.displayWidth + 6;
    }
    put(this.texts["castle"]);
    put(this.texts["wave"]);
  }

  /**
   * « +N » qui s'élève depuis le compteur d'or, à la fin d'une vague nettoyée.
   *
   * Depuis l'ADR-052, les trois quarts de l'or d'un chapitre arrivent EN UN BLOC à la
   * fin de la vague, et non plus au fil des kills. Sans ce retour, le joueur voit son
   * or bondir sans savoir pourquoi : le gain per-kill se lisait sur les monstres qui
   * tombaient, celui-ci n'a aucun support visuel propre.
   *
   * Texte flottant séparé et non modification du libellé d'or : `updateResources`
   * réécrit ce libellé à chaque frame, tout texte posé dessus serait effacé aussitôt.
   */
  flashIncome(amount: number): void {
    const anchor: Phaser.GameObjects.Text | undefined = this.texts["gold"];
    if (!anchor || amount <= 0) return;
    const t: Phaser.GameObjects.Text = this.scene.add.text(
      anchor.x + anchor.width / 2, anchor.y, `+${amount}`,
      { fontSize: `${Math.max(15, scaleFont(14))}px`, color: "#e8c252", fontFamily: FONT_DISPLAY },
    ).setOrigin(0.5, 1);
    this.container.add(t);
    this.scene.tweens.add({
      targets: t, y: anchor.y - 26, alpha: 0, duration: 1100, ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  updateResources(r: HudResourceState): void {
    this.texts["gold"]?.setText(`◆ ${r.gold}`).setColor("#e8c252");
    const castlePct: number = r.castleHp / r.castleHpMax;
    const castleTint: number = castlePct > 0.55 ? 0xf0e6d2 : castlePct > 0.25 ? 0xe8c252 : 0xc0392b;
    this.texts["castle"]?.setText(`${r.castleHp}/${r.castleHpMax}`)
      .setColor(castlePct > 0.55 ? C.uiText : castlePct > 0.25 ? "#e8c252" : "#c0392b");
    this.icons["castle"]?.setTint(castleTint);
    this.texts["wave"]?.setText(`Vague ${Math.max(0, r.waveIndex + 1)}/${r.totalWaves}`);
    this.layoutHudLeft();
  }

  /** Couleur d'un libellé d'état (Auto, x2) SEULEMENT sur la plaque grise d'origine —
   *  ces teintes avaient été choisies contre elle ; sur le teal du pack, l'écart de
   *  luminance tombe à 0,04 pour le vert (illisible) et 0,26 pour l'or, contre 0,43
   *  pour le crème. L'état reste lisible sans elles : il est déjà porté par le glyphe. */
  private hudStateColor(on: boolean, css: string): string {
    return uiSkinActive(this.scene) ? HUD_LABEL : on ? css : C.uiText;
  }

  /** Rafraîchit un bouton-icône de sort : compteur de recharge, alpha de la
   *  plaque et de l'icône. Sur l'habillage du pack, compteur et icône occupent
   *  le MÊME emplacement : l'icône s'efface donc complètement pendant la
   *  recharge au lieu de rester en filigrane sous le chiffre. */
  private updateSkillButton(key: HudKey, readyAt: number, runTime: number): void {
    const left: number = readyAt - runTime;
    const onCd: boolean = left > 0;
    this.texts[key]?.setText(onCd ? `${Math.ceil(left)}s` : "");
    this.plates[key]?.setAlpha(onCd ? 0.45 : 1);
    this.icons[key]?.setAlpha(onCd ? (uiSkinActive(this.scene) ? 0 : 0.4) : 1);
  }

  updateActions(a: HudActionState): void {
    this.texts["nextWave"]?.setAlpha(a.waveReady ? 1 : 0.35);
    this.plates["nextWave"]?.setAlpha(a.waveReady ? 1 : 0.35);
    this.texts["auto"]?.setText(a.autoWave ? "Auto ✓" : "Auto ✗")
      .setColor(this.hudStateColor(a.autoWave, "#27ae60"));
    this.texts["speed"]?.setText(`x${a.speed}`)
      .setColor(this.hudStateColor(a.speed === 2, "#e8c252"));
    this.updateSkillButton("ww", a.wwReadyAt, a.runTime);
    this.updateSkillButton("rally", a.rallyReadyAt, a.runTime);
    this.updateSkillButton("spell", a.spellReadyAt, a.runTime);
  }
}
