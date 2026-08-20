// ============================================================
// render/game/terrain.ts — Décor statique du champ de bataille
// (prairie, chemins, cadre, Bastion) et son rendu par-frame
// (portails, jauge de PV, marqueurs de slot). Voir ADR-034.
// ============================================================

import type Phaser from "phaser";
import type { PlayableChapter, RunState, Vec2, WaveDef } from "../../core/types";
import type { Insets } from "../skin/nineSlicePlan";
import type { Viewport } from "../platform/viewport";
import { viewport } from "../platform/viewport";
import { ensureBackdropTextures, TEX_VIGNETTE } from "../assets/backdrop";
import { drawDirtPath, ensureTerrainTextures, grassTextureKey } from "../assets/terrain";
import { PATH_WIDTH, roundedPath } from "../world/path";
import { GROUND } from "../theme/palette";
import { tileFor } from "../assets/sprites";
import { castleAnchor, castleBarBox, CASTLE_HALF } from "../world/castle";
import type { CastleBarBox, Point } from "../world/castle";
import { keepView } from "../assets/sprites";
import { ensureUiSkinTextures, uiSkinInsets, UI_SKIN_BAR } from "../skin/uiSkin";
import { C, GAME_H, GAME_W } from "./constants";

/** Tracé VISUEL d'un chemin. La sim suit les segments droits (ADR-001) : l'arrondi
 *  reste donc borné à une demi-largeur de route, pour qu'une unité pile sur son
 *  chemin logique n'apparaisse jamais à côté de sa route. */
export function drawPath(wps: readonly Vec2[]): Vec2[] {
  return roundedPath(wps, PATH_WIDTH / 2);
}

function strokePath(g: Phaser.GameObjects.Graphics, p: Vec2[]): void {
  g.beginPath(); g.moveTo(p[0]!.x, p[0]!.y);
  for (let i: number = 1; i < p.length; i++) g.lineTo(p[i]!.x, p[i]!.y);
  g.strokePath();
}

/** Délimite le champ de bataille. L'écran déborde de la zone de jeu (ADR-010) :
 *  sans repère, la carte a l'air de flotter au milieu d'un terrain jouable qui ne
 *  l'est pas. Le débord est donc assombri et la zone cernée d'un liseré — cohérent
 *  avec le fait que le héros ne peut pas en sortir (`moveHero`).
 *  Ajouté au container de terrain : détruit et reconstruit avec lui au resize. */
function buildBattlefieldFrame(scene: Phaser.Scene, cont: Phaser.GameObjects.Container): void {
  const v: Viewport = viewport();

  // Vignette sur la zone de jeu : concentre le regard au centre et évite l'aplat
  // uniforme d'herbe d'un bord à l'autre (ADR-014).
  ensureBackdropTextures(scene);
  if (scene.textures.exists(TEX_VIGNETTE)) {
    cont.add(scene.add.image(GAME_W / 2, GAME_H / 2, TEX_VIGNETTE)
      .setDisplaySize(GAME_W, GAME_H).setAlpha(0.55));
  }

  const g: Phaser.GameObjects.Graphics = scene.add.graphics();
  g.fillStyle(0x0d0906, 0.55);
  if (v.top < 0) g.fillRect(v.left, v.top, v.width, -v.top);
  if (v.bottom > GAME_H) g.fillRect(v.left, GAME_H, v.width, v.bottom - GAME_H);
  if (v.left < 0) g.fillRect(v.left, 0, -v.left, GAME_H);
  if (v.right > GAME_W) g.fillRect(GAME_W, 0, v.right - GAME_W, GAME_H);
  g.lineStyle(3, 0xc9a227, 0.45);
  g.strokeRect(0, 0, GAME_W, GAME_H);
  cont.add(g);
}

export interface TerrainBuild {
  container: Phaser.GameObjects.Container;
  slotMarkers: Phaser.GameObjects.Image[];
}

/** Prairie dessinée + chemins de terre. Reconstruit par chapitre (create/relayout). */
export function buildTerrain(scene: Phaser.Scene, ch: PlayableChapter): TerrainBuild {
  const cont: Phaser.GameObjects.Container = scene.add.container(0, 0).setDepth(-10);
  const v: Viewport = viewport();

  // Sol généré (ADR-016) : nuances, touffes et grain, dans une gamme désaturée
  // qui laisse les unités ressortir. Remplace la tuile d'herbe fluo du pack.
  // Sol et route suivent le biome du chapitre (ADR-023) : « Le Col du Gel »
  // s'affichait sur la même prairie verte que tous les autres.
  const biome: string | undefined = ch.biome;
  ensureTerrainTextures(scene, biome);
  const grassKey: string = grassTextureKey(biome);
  if (scene.textures.exists(grassKey)) {
    cont.add(scene.add.tileSprite(v.left, v.top, v.width, v.height, grassKey).setOrigin(0, 0));
  } else {
    cont.add(scene.add.rectangle(v.left, v.top, v.width, v.height, GROUND.grass).setOrigin(0, 0));
  }

  // Chemins : un seul tracé continu, bordé. L'ancien estampage d'une tuile tous
  // les 16 px laissait des bosses régulières bien visibles.
  const roads: Phaser.GameObjects.Graphics = scene.add.graphics();
  for (const p of ch.map.paths) {
    if (p.portal) continue; // les Failles n'apparaissent que lorsqu'elles sont actives (drawPortals)
    drawDirtPath(roads, drawPath(p.waypoints), biome);
  }
  cont.add(roads);

  buildBattlefieldFrame(scene, cont);

  // Emplacements de tour : dalle de pierre, bien plus grande qu'avant — les
  // unités et les tours ont grandi, les repères de construction devaient suivre.
  const slotMarkers: Phaser.GameObjects.Image[] = ch.map.slots.map(s =>
    scene.add.image(s.x, s.y, tileFor("pad").key).setDisplaySize(64, 64).setDepth(50),
  );

  return { container: cont, slotMarkers };
}

export interface CastleBuild {
  container: Phaser.GameObjects.Container;
  castleBar: Phaser.GameObjects.NineSlice | null;
}

/** Le Bastion en bout de chemin : l'objectif à défendre, volontairement le plus
 *  gros élément de la carte (ADR-016). */
export function buildCastle(scene: Phaser.Scene, ch: PlayableChapter): CastleBuild {
  const main: Vec2[] = ch.map.paths[0]!.waypoints;
  const end: Vec2 = main[main.length - 1]!;
  const cont: Phaser.GameObjects.Container = scene.add.container(0, 0).setDepth(100 + end.y);
  // Ancrage RAMENÉ dans le champ (les chemins finissent au bord droit) et
  // calculé une seule fois, dans `render/world/castle.ts` : la jauge de PV et le test
  // d'emplacements en dépendent aussi, et deux des trois copies avaient divergé.
  const a: Point = castleAnchor(end);
  cont.add(scene.add.ellipse(a.x, a.y + 36, 110, 30, 0x1e2a17, 0.3));
  cont.add(scene.add.image(a.x, a.y, keepView().key).setDisplaySize(CASTLE_HALF * 2, CASTLE_HALF * 2));

  // Jauge de PV : châsse du pack (embouts dorés, gorge sombre), posée une fois.
  // Seul le remplissage est retracé à chaque image (drawCastleBar).
  ensureUiSkinTextures(scene);
  let castleBar: Phaser.GameObjects.NineSlice | null = null;
  if (scene.textures.exists(UI_SKIN_BAR)) {
    const b: CastleBarBox = castleBarBox(end);
    const bi: Insets = uiSkinInsets(UI_SKIN_BAR);
    castleBar = scene.add.nineslice(
      b.x + b.w / 2, b.y + b.h / 2, UI_SKIN_BAR, undefined, b.w, b.h,
      bi.left, bi.right, 0, 0,
    );
    cont.add(castleBar);
  }
  return { container: cont, castleBar };
}

/** Remplissage de la jauge de PV du Bastion : la châsse, elle, est posée une fois
 *  par `buildCastle`, ici on ne dessine que ce qui change. Le rectangle vient de
 *  `castleBarBox`, donc du MÊME ancrage que le sprite — auparavant calé sur
 *  `end.x - 62` quand le sprite l'est sur `min(end.x, W - 62)`, soit 26 unités
 *  de décalage dès qu'un chapitre ne finit pas contre le bord droit. */
export function drawCastleBar(
  g: Phaser.GameObjects.Graphics, castleBar: Phaser.GameObjects.NineSlice | null,
  end: Vec2, hpPct: number, hitFlash: boolean,
): void {
  const pct: number = Math.max(0, hpPct);
  // Le rectangle vient de la CHÂSSE RÉELLE quand elle existe : sa hauteur est
  // celle de l'art, que `castleBarBox` — pur, sans accès aux textures — ne peut
  // pas connaître. La déduire de nouveau ici aurait recréé la divergence qu'on
  // vient de supprimer.
  const b: CastleBarBox = castleBar
    ? { x: castleBar.x - castleBar.width / 2, y: castleBar.y - castleBar.height / 2, w: castleBar.width, h: castleBar.height }
    : castleBarBox(end);
  // Le remplissage se pose DANS la gorge : en retrait des embouts et du liseré.
  const padX: number = castleBar ? uiSkinInsets(UI_SKIN_BAR).left : 1;
  const padY: number = castleBar ? Math.round(b.h * 0.28) : 1;
  const ix: number = b.x + padX, iy: number = b.y + padY;
  const iw: number = b.w - padX * 2, ih: number = b.h - padY * 2;
  const skinned: boolean = castleBar !== null;
  const color: number = pct > 0.55 ? 0x27ae60 : pct > 0.25 ? 0xe8c252 : 0xc0392b;
  // Le flash se pose D'ABORD : la jauge (fond + remplissage + liseré) se dessine
  // par-dessus, sinon elle disparaît sous le rectangle rouge.
  if (hitFlash) { g.fillStyle(0xc0392b, 0.35); g.fillRect(end.x - 34, end.y - 24, 100, 64); }
  if (!skinned) { g.fillStyle(C.hpBack, 0.9); g.fillRoundedRect(b.x, b.y, b.w, b.h, 4); }
  if (pct > 0.03) { g.fillStyle(color); g.fillRect(ix, iy, iw * pct, ih); }
  if (!skinned || hitFlash) {
    g.lineStyle(1, hitFlash ? 0xc0392b : 0xc9a227, hitFlash ? 1 : 0.6);
    g.strokeRoundedRect(b.x, b.y, b.w, b.h, 4);
  }
}

/** Slots vides : marqueur masqué dès qu'une tour occupe le slot, sinon anneau
 *  doré pulsé + croix « + » pour signaler « construire ici ». */
export function drawSlotMarkers(
  g: Phaser.GameObjects.Graphics, slotMarkers: Phaser.GameObjects.Image[], slots: readonly Vec2[],
  occupied: (i: number) => boolean, selectedSlot: number, now: number,
): void {
  for (let i: number = 0; i < slots.length; i++) {
    const isOccupied: boolean = occupied(i);
    slotMarkers[i]?.setVisible(!isOccupied);
    if (isOccupied) continue;
    const s: Vec2 = slots[i]!;
    const sel: boolean = i === selectedSlot;
    const pulse: number = Math.sin(now / 350 + i) * 1.5;
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
}

function pathInUse(run: RunState, pathIdx: number): boolean {
  return run.pendingSpawns.some(p => p.pathIndex === pathIdx)
    || run.enemies.some(e => e.alive && e.pathIndex === pathIdx);
}

function nextWaveUsesPath(ch: PlayableChapter, run: RunState, pathIdx: number): boolean {
  const wave: WaveDef | undefined = ch.waves[run.waveIndex + 1];
  return !!wave?.spawns.some(sp => (sp.pathIndex ?? 0) === pathIdx);
}

/** Chemins de Faille (portails) : dynamiques, n'apparaissent que lorsqu'ils sont
 *  actifs ou annoncés pour la vague suivante (GDD §Portails). Renvoie s'il faut
 *  afficher l'annonce de Faille dans le HUD. */
export function drawPortals(g: Phaser.GameObjects.Graphics, ch: PlayableChapter, run: RunState, now: number): boolean {
  ch.map.paths.forEach((p, i) => {
    if (!p.portal) return;
    const active: boolean = pathInUse(run, i);
    const announced: boolean = run.phase === "building" && nextWaveUsesPath(ch, run, i);
    if (!active && !announced) return;
    const alpha: number = active ? 1 : 0.35;
    // Même tracé que les routes permanentes : une Faille dessinée à angles vifs
    // au milieu de chemins adoucis se lit comme un élément d'un autre jeu.
    const lane: Vec2[] = drawPath(p.waypoints);
    g.lineStyle(36, C.portal, 0.25 * alpha); strokePath(g, lane);
    g.lineStyle(30, C.path, 0.7 * alpha); strokePath(g, lane);
    // Vortex à l'entrée du portail
    const o: Vec2 = p.waypoints[0]!;
    const pulse: number = 3 * Math.sin(now / 150);
    g.lineStyle(4, C.portal, alpha); g.strokeCircle(o.x, o.y, 22 + pulse);
    g.lineStyle(2, C.portal, 0.6 * alpha); g.strokeCircle(o.x, o.y, 13 - pulse / 2);
  });
  return run.phase === "building" && ch.map.paths.some((p, i) => p.portal && nextWaveUsesPath(ch, run, i));
}
