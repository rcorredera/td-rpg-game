// ============================================================
// render/game/entities.ts — Placement et overlays des tours, des
// ennemis et du héros (sprites Tiny + Graphics). Voir ADR-016,
// ADR-017, ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CONTENT } from "../../content/index";
import { specOf } from "../../core/sim";
import type { EnemyDef, EnemyState, HeroState, TowerDef, TowerLevelStats, TowerSpecDef, TowerState, Vec2 } from "../../core/types";
import { flyPose, idlePose, walkPose } from "../assets/animation";
import type { UnitPose } from "../assets/animation";
import { ENEMY_SIZE_FALLBACK, enemyView, fitSquare } from "../assets/sprites";
import type { SpriteFit } from "../assets/sprites";
import { HERO_C, SIGNAL } from "../theme/palette";
import { STATUS } from "../theme/theme";
import { C } from "./constants";
import type { FacingState } from "./types";

/** Durée du recul d'une tour après un tir, en ms murs (pas la sim). */
const RECOIL_MS: number = 160;

/**
 * Ancrage HISTORIQUE des sprites d'unité : le pivot tombait à 62 % de la hauteur,
 * donc au milieu du corps — l'écrasement et l'inclinaison pivotaient dans le vide
 * et la créature se soulevait tout entière.
 *
 * Les unités sont désormais ancrées par les PIEDS (ADR-064). Cette valeur est
 * conservée comme RÉFÉRENCE DE POSITION : elle dit où se trouvait le bas du
 * sprite, et permet donc de changer de pivot sans déplacer une seule unité à
 * l'écran. La supprimer ferait remonter tout le bestiaire d'un tiers de sa
 * hauteur.
 */
const LEGACY_ORIGIN_Y: number = 0.62;

/** État de rendu des entités du champ de bataille : direction du regard (par uid)
 *  et recul des tours au tir (par slotIndex). Persiste tout le run — reconstruit
 *  seulement par `GameScene.init` (nouveau run), jamais par `relayout`. */
export class BattlefieldEntities {
  private facing = new Map<number, FacingState>();
  private towerRecoil = new Map<number, number>();
  /** Sommet RÉEL du sprite affiché cette frame (unités monde), par uid. Les
   *  overlays (barre de PV, couronne) l'utilisent pour se caler au-dessus de
   *  la tête — cf. `enemyTopY`. */
  private enemyTop = new Map<number, number>();

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
    // Proportions natives conservées (`fitSquare`, ADR-046) : les tours en SVG
    // maison sont carrées, mais un socle importé (IA/CraftPix) peut ne pas l'être.
    const { w: fitW, h: fitH } = fitSquare(s.frame.width, s.frame.height, size);
    s.setOrigin(0.5, 0.86)
      .setDisplaySize(fitW * (1 + 0.06 * k), fitH * squash)
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
      // Aura de blizzard : un simple cercle fixe se lisait à peine et ne
      // rendait rien de la tempête continue promise par le nom — deux anneaux
      // qui respirent + des flocons qui orbitent au bord, même langage que le
      // statut "gelé" d'un ennemi (plus haut, `drawEnemyOverlay`).
      if (spec.aura) {
        const rad: number = spec.aura.radius;
        const breathe: number = Math.sin(now / 900);
        g.fillStyle(C.frost, 0.05 + 0.02 * breathe);
        g.fillCircle(x, y, rad);
        g.lineStyle(1.5, C.frost, 0.32 + 0.08 * breathe);
        g.strokeCircle(x, y, rad);
        g.lineStyle(1, C.frost, 0.18);
        g.strokeCircle(x, y, rad * (0.9 + 0.03 * breathe));
        const flakes: number = 8;
        for (let i: number = 0; i < flakes; i++) {
          const a: number = now / 2600 + (i / flakes) * Math.PI * 2 + t.slotIndex * 0.7;
          const fx: number = x + Math.cos(a) * rad;
          const fy: number = y + Math.sin(a) * rad * 0.55; // aplati, cohérent avec la vue du plateau
          const tw: number = 2.6 + Math.sin(now / 240 + i * 1.7) * 0.9;
          g.fillStyle(0xffffff, 0.85);
          g.fillTriangle(fx, fy - tw, fx - tw * 0.85, fy + tw * 0.65, fx + tw * 0.85, fy + tw * 0.65);
        }
      }
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
   *  (voir `LEGACY_ORIGIN_Y` en tête de fichier pour l'ancrage)
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

    const face: number = this.facingOf(e.uid, e.pos.x);
    const size: number = this.enemySize(e);
    // Proportions natives conservées (`fitSquare`, ADR-046) : un sprite importé
    // rogné à sa silhouette (chauve-souris large, gobelin haut) ne fait pas ~1:1
    // comme le skin SVG maison — un carré forcé l'écrasait ou l'étirait.
    const { w: fitW, h: fitH } = fitSquare(s.frame.width, s.frame.height, size);
    // Ancrage par les PIEDS (ADR-064). L'écrasement et l'inclinaison pivotent
    // alors sur le point d'appui : le sommet du corps travaille, la base reste
    // plantée. Avec l'ancrage précédent (0,62, au milieu du corps) la créature
    // se soulevait tout entière et paraissait sautiller sur place.
    // Le décalage reproduit EXACTEMENT le rectangle qu'occupait cet ancrage,
    // pour ne pas déplacer toutes les unités du jeu au passage.
    const ground: number = (def.flying ? e.pos.y - 14 : e.pos.y) + (1 - LEGACY_ORIGIN_Y) * fitH + pose.dy;
    s.setOrigin(0.5, 1)
      .setDisplaySize(fitW * pose.scaleX, fitH * pose.scaleY)
      .setRotation(pose.tilt * face)
      .setFlipX(face < 0);
    s.setPosition(Math.round(e.pos.x + pose.dx), Math.round(ground));
    s.setDepth(100 + e.pos.y); // tri en profondeur par position verticale
    // Boss : reteinté or chaud (le registre n'a pas de sprite dédié).
    if (this.isBoss(e)) s.setTint(0xffd98a);
    // Sommet RÉEL du sprite CETTE frame (ADR-047) : la barre de PV s'y accroche,
    // et les sprites rognés à leur silhouette n'ont pas la tête au même ratio de
    // hauteur pour tous. Ancré aux pieds, le sommet se lit directement.
    this.enemyTop.set(e.uid, ground - fitH * pose.scaleY);
  }

  /** Overlay d'ennemi (gfx) : barre de PV, anneaux de statut, couronne de boss. */
  drawEnemyOverlay(g: Phaser.GameObjects.Graphics, e: EnemyState, runTime: number, now: number): void {
    const boss: boolean = this.isBoss(e);
    const r: number = this.enemySize(e) * 0.5;  // rayon visuel du sprite (cale anneaux/barre)
    const x: number = e.pos.x, y: number = e.pos.y - r * 0.4;
    // Sommet RÉEL du sprite affiché cette frame (`placeEnemy`, ADR-047) — pas
    // une estimation via `r` : les sprites importés n'ont plus une tête au
    // même ratio de hauteur pour tous, une barre calée sur `r` tombait
    // parfois EN PLEINE TÊTE au lieu d'au-dessus. Repli sur `y - r` si l'overlay
    // se dessine avant le premier placement (ne devrait pas arriver en jeu).
    const top: number = this.enemyTop.get(e.uid) ?? (y - r);

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
      const cy: number = top - 7;
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
    const barW: number = r * 1.5, barH: number = boss ? 6 : 5, barY: number = top - (boss ? 16 : 11);
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

    // Proportions natives conservées (`fitSquare`, ADR-046) : le héros généré
    // par IA (ADR-045) n'est pas exactement carré.
    const heroFit: SpriteFit = fitSquare(heroSprite.frame.width, heroSprite.frame.height, 58);
    heroSprite.setFlipX(face < 0).setDisplaySize(heroFit.w, heroFit.h)
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

    // Barre PV — calée sur le HAUT RÉEL du sprite (origin 0.62, hauteur `fitSquare`
    // variable selon le ratio natif du héros IA), pas un décalage fixe qui suppose
    // une hauteur de 58 : sinon la barre plonge dans la tête pour un portrait plus
    // large que haut (ADR-046/047, même correctif que pour les ennemis).
    const pct: number = h.hp / h.maxHp;
    const heroTop: number = y - 0.62 * heroFit.h;
    const by: number = heroTop - 8;
    g.fillStyle(C.hpBack, 0.85); g.fillRoundedRect(x - 16, by, 32, 5, 2);
    if (pct > 0.04) { g.fillStyle(STATUS.hpGood); g.fillRoundedRect(x - 16, by, 32 * pct, 5, 2); }
  }
}
