// ============================================================
// render/game/entities.ts — Placement et overlays des tours, des
// ennemis et du héros (sprites Tiny + Graphics). Voir ADR-016,
// ADR-017, ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CONTENT } from "../../content/index";
import { specOf } from "../../core/sim";
import type { EnemyDef, EnemyState, HeroState, TowerDef, TowerLevelStats, TowerSpecDef, TowerState, Vec2 } from "../../core/types";
import { flyPose, idlePose, walkPose } from "../animation";
import type { UnitPose } from "../animation";
import { ENEMY_SIZE_FALLBACK, enemyView, fitSquare } from "../sprites";
import { HERO_C, SIGNAL } from "../palette";
import { STATUS } from "../theme";
import { C } from "./constants";
import type { FacingState } from "./types";

/** Durée du recul d'une tour après un tir, en ms murs (pas la sim). */
const RECOIL_MS: number = 160;

/** État de rendu des entités du champ de bataille : direction du regard (par uid)
 *  et recul des tours au tir (par slotIndex). Persiste tout le run — reconstruit
 *  seulement par `GameScene.init` (nouveau run), jamais par `relayout`. */
export class BattlefieldEntities {
  private facing = new Map<number, FacingState>();
  private towerRecoil = new Map<number, number>();

  /** Recul de la tour au départ du coup : l'animation de tir part de l'arme,
   *  pas seulement du projectile. */
  recordShot(slotIndex: number, now: number): void {
    this.towerRecoil.set(slotIndex, now);
  }

  // ---------- Tours (sprites composés + overlays) ----------

  /** Positionne une pièce de tour sur son slot. `size` en unités logiques (ADR-016).
   *  Applique le recul de tir : brève compression verticale qui donne du poids au
   *  coup, sans jamais toucher la sim. */
  placeTowerPart(s: Phaser.GameObjects.Sprite, t: TowerState, slot: Vec2, now: number, dy: number, size: number): void {
    const firedAt: number | undefined = this.towerRecoil.get(t.slotIndex);
    const age: number = firedAt === undefined ? Infinity : now - firedAt;
    // 1 → 0 sur la durée du recul ; squash vertical + léger enfoncement.
    const k: number = age < RECOIL_MS ? 1 - age / RECOIL_MS : 0;
    const squash: number = 1 - 0.12 * k;
    s.setOrigin(0.5, 0.86)
      .setDisplaySize(size * (1 + 0.06 * k), size * squash)
      .setPosition(slot.x, slot.y + dy + 4 * k)
      .setDepth(100 + slot.y + (dy < 0 ? 1 : 0));
  }

  /** Overlay de tour (gfx) : ralliement, pips de niveau, étoile/aura de spec, portée à la sélection. */
  drawTowerOverlay(
    g: Phaser.GameObjects.Graphics, t: TowerState, slot: Vec2,
    selectedSlot: number, runTime: number, now: number,
  ): void {
    const def: TowerDef = CONTENT.towers[t.defId]!;
    const x: number = slot.x, y: number = slot.y;

    // Tour ralliée : socle de lumière au sol, étincelles montantes et bannière
    // qui claque. L'ancien anneau + deux chevrons se lisait à peine (ADR-016).
    if (runTime < t.rallyUntil) {
      const pulse: number = Math.sin(now / 150);
      // Halo au sol : ancre l'effet sur la tour plutôt que de flotter autour.
      g.fillStyle(HERO_C.gold, 0.14 + 0.05 * pulse);
      g.fillEllipse(x, y + 6, 62 + pulse * 5, 24 + pulse * 2);
      g.lineStyle(2, HERO_C.gold, 0.75);
      g.strokeEllipse(x, y + 6, 62 + pulse * 5, 24 + pulse * 2);
      // Étincelles ascendantes, échelonnées pour un flux continu.
      for (let i: number = 0; i < 5; i++) {
        const ph: number = ((now / 620) + i * 0.2 + t.slotIndex * 0.13) % 1;
        const sx: number = x + Math.sin(i * 2.3 + ph * 3) * 17;
        const sy: number = y + 4 - ph * 52;
        g.fillStyle(i % 2 ? 0xfff0c0 : HERO_C.gold, 0.9 * (1 - ph));
        g.fillCircle(sx, sy, 2.6 * (1 - ph) + 0.8);
      }
      // Chevron unique, plus lisible que deux qui se chevauchaient.
      const rise: number = ((now / 70) % 22);
      const cy: number = y - 40 - rise;
      g.lineStyle(3, HERO_C.gold, Math.max(0, 1 - rise / 22));
      g.lineBetween(x - 7, cy + 6, x, cy - 3);
      g.lineBetween(x + 7, cy + 6, x, cy - 3);
    }

    // Pips de niveau sur la face avant — étoile dorée si spécialisée
    for (let lv: number = 0; lv < t.level; lv++) { g.fillStyle(0xe8c252); g.fillCircle(x - 8 + lv * 8, y + 1, 2.5); }
    const spec: TowerSpecDef | undefined = specOf(CONTENT, t);
    if (spec) {
      const sy: number = y - 32 + Math.sin(now / 300) * 1.5;
      g.fillStyle(0xe8c252);
      g.fillTriangle(x - 5, sy + 2, x + 5, sy + 2, x, sy - 6);
      g.fillTriangle(x - 5, sy - 2, x + 5, sy - 2, x, sy + 6);
      // Aura de blizzard visible en continu
      if (spec.aura) { g.lineStyle(1, C.frost, 0.35); g.strokeCircle(x, y, spec.aura.radius); }
    }

    // Sélection : portée actuelle (blanc) + portée du niveau suivant (pointillés dorés)
    if (t.slotIndex === selectedSlot) {
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
  enemySize(e: EnemyState): number {
    // La taille vit dans le registre de skin (ADR-005/022), plus dans une cascade
    // de ternaires ici : à dix créatures elle devenait illisible, et un changement
    // de skin doit pouvoir revoir toute la hiérarchie d'un seul endroit.
    const base: number = enemyView(e.defId).size ?? ENEMY_SIZE_FALLBACK;
    return this.isBoss(e) ? base * 1.45 : base;
  }

  isBoss(e: EnemyState): boolean {
    return e.maxHp > CONTENT.enemies[e.defId]!.hp * 1.8;
  }

  /** Position/scale/flip/teinte du sprite d'ennemi (appelé chaque frame par SpriteLayer). */
  placeEnemy(s: Phaser.GameObjects.Sprite, e: EnemyState, now: number): void {
    const def: EnemyDef = CONTENT.enemies[e.defId]!;
    // Animation procédurale (ADR-017) : marche, vol ou respiration selon l'état.
    // Le déphasage par uid évite qu'une horde entière bouge au même rythme.
    const phase: number = (e.uid % 17) / 17;
    const weight: number = Math.min(1, def.hp / 260);   // la brute pèse, le gobelin sautille
    const pose: UnitPose = def.flying
      ? flyPose(now, phase)
      : e.blocked
        ? idlePose(now, phase)
        : walkPose(now, phase, def.speed / 55, weight);

    const y: number = (def.flying ? e.pos.y - 14 : e.pos.y) + pose.dy;
    const face: number = this.facingOf(e.uid, e.pos.x);
    const size: number = this.enemySize(e);
    // Proportions natives conservées (`fitSquare`, ADR-046) : un sprite importé
    // rogné à sa silhouette (chauve-souris large, gobelin haut) ne fait pas ~1:1
    // comme le skin SVG maison — un carré forcé l'écrasait ou l'étirait.
    const { w: fitW, h: fitH } = fitSquare(s.frame.width, s.frame.height, size);
    s.setOrigin(0.5, 0.62)
      .setDisplaySize(fitW * pose.scaleX, fitH * pose.scaleY)
      .setRotation(pose.tilt * face)
      .setFlipX(face < 0);
    s.setPosition(Math.round(e.pos.x), Math.round(y));
    s.setDepth(100 + e.pos.y); // tri en profondeur par position verticale
    // Boss : reteinté or chaud (le registre n'a pas de sprite dédié).
    if (this.isBoss(e)) s.setTint(0xffd98a);
  }

  /** Overlay d'ennemi (gfx) : barre de PV, anneaux de statut, couronne de boss. */
  drawEnemyOverlay(g: Phaser.GameObjects.Graphics, e: EnemyState, runTime: number, now: number): void {
    const boss: boolean = this.isBoss(e);
    const r: number = this.enemySize(e) * 0.5;  // rayon visuel du sprite (cale anneaux/barre)
    const x: number = e.pos.x, y: number = e.pos.y - r * 0.4;

    // Gelé : cristaux de givre qui orbitent lentement + halo froid. Un anneau bleu
    // seul ne se distinguait pas d'un anneau de brûlure (ADR-016).
    if (runTime < e.slowUntil) {
      const spin: number = now / 900 + e.uid;
      g.fillStyle(SIGNAL.slow, 0.22);
      g.fillEllipse(x, y + r * 0.5, r * 1.9, r * 0.7);
      for (let i: number = 0; i < 5; i++) {
        const a: number = spin + (i / 5) * Math.PI * 2;
        const px: number = x + Math.cos(a) * (r + 4), py: number = y + Math.sin(a) * (r + 4) * 0.55;
        const s: number = 3.2 + Math.sin(now / 260 + i) * 0.8;
        g.fillStyle(SIGNAL.slow, 0.95);
        g.fillTriangle(px, py - s, px - s * 0.9, py + s * 0.7, px + s * 0.9, py + s * 0.7);
      }
    }
    // En feu : langues de flamme montantes, jamais un anneau.
    if (runTime < e.burnUntil) {
      for (let i: number = 0; i < 4; i++) {
        const ph: number = (now / 260 + i * 0.27 + e.uid * 0.11) % 1;
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

  drawHero(g: Phaser.GameObjects.Graphics, h: HeroState, heroSprite: Phaser.GameObjects.Sprite, foe: EnemyState | undefined, now: number): void {
    heroSprite.setVisible(h.alive);
    if (!h.alive) return;
    const moving: boolean = Math.hypot(h.target.x - h.pos.x, h.target.y - h.pos.y) > 2;
    const bob: number = moving ? Math.sin(now / 110) * 1.5 : 0;
    const x: number = h.pos.x, y: number = h.pos.y + bob;
    const face: number = foe ? (foe.pos.x >= x ? 1 : -1) : this.facingOf(-1, x);

    // --- Cycle de frappe -------------------------------------------------
    // Le combat était un simple cercle blanc clignotant. Ici un vrai cycle :
    // armé (recul) → frappe (bond en avant) → récupération, avec un arc de lame
    // qui balaie l'ennemi. Piloté par l'horloge murale, jamais par la sim.
    const SWING_MS: number = 520;
    const k: number = foe ? (now % SWING_MS) / SWING_MS : 0; // 0→1
    // Courbe d'attaque : recul lent (0→0,55) puis détente sèche (0,55→0,75).
    const wind: number = k < 0.55 ? -(k / 0.55) * 3.5 : k < 0.75 ? (k - 0.55) / 0.2 * 11 - 3.5 : (1 - (k - 0.75) / 0.25) * 7.5;
    const lunge: number = foe ? wind : 0;
    const tilt: number = foe ? (k < 0.55 ? -0.12 * (k / 0.55) : 0.22 * (1 - (k - 0.55) / 0.45)) : 0;

    heroSprite.setFlipX(face < 0).setDisplaySize(58, 58)
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
          const sa: number = i * 1.6 + now / 200;
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
}
