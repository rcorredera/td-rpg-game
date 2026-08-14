// ============================================================
// render/game/fx.ts — Effets transitoires (sorts, impacts) et
// projectiles en vol. Voir ADR-016, ADR-034.
// ============================================================

import type Phaser from "phaser";
import type { Vec2 } from "../../core/types";
import { TEX } from "../assets";
import { HERO_C } from "../palette";
import { projectilePoint, type ProjectileStyle } from "../projectiles";
import type { FxEffect, ShotFx } from "./types";

/** Pool des effets transitoires (sorts, impacts) et des projectiles en vol.
 *  Purement du rendu : la sim ne sait pas que ces objets existent, elle émet
 *  des `SimEvent` que `GameScene.consumeEvents` traduit en `addShot`/`addEffect`. */
export class FxLayer {
  private fx: FxEffect[] = [];
  private shots: ShotFx[] = [];

  constructor(private scene: Phaser.Scene) {}

  addEffect(e: FxEffect): void { this.fx.push(e); }
  addShot(s: ShotFx): void { this.shots.push(s); }

  /** Flamme/explosion transitoire (sprite flamme Kenney TD #296) : grandit puis s'efface. */
  spawnFlame(x: number, y: number, scale = 0.6): void {
    const f: Phaser.GameObjects.Image = this.scene.add.image(x, y, TEX.td, 296).setScale(scale * 0.4).setDepth(850).setAlpha(0.95);
    this.scene.tweens.add({ targets: f, scale, alpha: 0, duration: 280, ease: "Quad.out", onComplete: () => f.destroy() });
  }

  /** Dessine un projectile en vol selon son style (ADR-016). L'impact est produit
   *  à l'ARRIVÉE, pas au départ : avant, la déflagration apparaissait sur la cible
   *  au moment du tir, ce qui rendait la trajectoire inutile. */
  private drawProjectile(g: Phaser.GameObjects.Graphics, s: ShotFx, now: number): void {
    const st: ProjectileStyle = s.style;
    const t: number = (now - s.start) / Math.max(1, s.until - s.start);
    const from: Vec2 = { x: s.from.x, y: s.from.y - 10 };
    const p: Vec2 = projectilePoint(from, s.to, t, st.arc);

    if (st.trail > 0) {
      const back: Vec2 = projectilePoint(from, s.to, Math.max(0, t - st.trail / 200), st.arc);
      g.lineStyle(2, st.color, 0.45);
      g.lineBetween(back.x, back.y, p.x, p.y);
    }

    if (st.kind === "arrow") {
      const tip: Vec2 = projectilePoint(from, s.to, Math.min(1, t + 0.06), st.arc);
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
      const a: number = st.spin ? now / 60 : 0;
      g.fillStyle(st.color, 1);
      g.fillTriangle(
        p.x + Math.cos(a) * st.size, p.y + Math.sin(a) * st.size,
        p.x + Math.cos(a + 2.1) * st.size, p.y + Math.sin(a + 2.1) * st.size,
        p.x + Math.cos(a + 4.2) * st.size, p.y + Math.sin(a + 4.2) * st.size,
      );
    }

    // Impact : déclenché une seule fois, quand le projectile arrive vraiment.
    if (t >= 1 && !s.hit) {
      s.hit = true;
      this.spawnFlame(s.to.x, s.to.y - 6, st.kind === "boulder" ? 0.55 : 0.3);
    }
  }

  /** Purge les effets/tirs expirés puis redessine ce qui reste. Appelé une fois
   *  par frame par `GameScene.draw()`. */
  draw(g: Phaser.GameObjects.Graphics, now: number): void {
    this.shots = this.shots.filter(s => s.until > now);
    for (const s of this.shots) this.drawProjectile(g, s, now);

    this.fx = this.fx.filter(f => f.until > now);
    for (const f of this.fx) {
      const life: number = f.life ?? 220;
      const t: number = 1 - (f.until - now) / life; // 0 → 1
      const fade: number = 1 - t;
      if (f.kind === "whirl") {
        // Tournoiement : trois bras en spirale qui s'ouvrent en tournant, plus
        // une onde de bord. Un cercle seul ne disait pas « ça tourne ».
        const spin: number = t * 7;
        for (let arm: number = 0; arm < 3; arm++) {
          g.lineStyle(4 - arm, HERO_C.gold, 0.85 * fade);
          g.beginPath();
          const base: number = spin + (arm * Math.PI * 2) / 3;
          for (let step: number = 0; step <= 12; step++) {
            const u: number = step / 12;
            const rr: number = f.radius * t * u;
            const aa: number = base + u * 2.6;
            const px: number = f.pos.x + Math.cos(aa) * rr, py: number = f.pos.y + Math.sin(aa) * rr * 0.72;
            if (step === 0) g.moveTo(px, py); else g.lineTo(px, py);
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
        for (let i: number = 0; i < 6; i++) {
          const a: number = (i / 6) * Math.PI * 2;
          const rr: number = f.radius * t;
          g.fillStyle(HERO_C.gold, 0.7 * fade);
          g.fillCircle(f.pos.x + Math.cos(a) * rr, f.pos.y + Math.sin(a) * rr * 0.65, 3 * fade + 1);
        }
      } else if (f.kind === "arrows") {
        // Pluie de flèches : une volée qui TOMBE vraiment dans la zone, puis se
        // plante. Auparavant, le sort le plus coûteux du jeu ne produisait qu'un
        // cercle, indiscernable d'un tir de catapulte.
        g.lineStyle(2, 0xf0e6d2, 0.35 * fade);
        g.strokeEllipse(f.pos.x, f.pos.y, f.radius * 2, f.radius * 1.15);
        for (let i: number = 0; i < 14; i++) {
          const a: number = (i / 14) * Math.PI * 2 + i;
          const rr: number = f.radius * (0.25 + ((i * 37) % 100) / 130);
          const tx: number = f.pos.x + Math.cos(a) * rr, ty: number = f.pos.y + Math.sin(a) * rr * 0.62;
          const delay: number = ((i * 13) % 40) / 100;          // volée échelonnée
          const p: number = Math.min(1, Math.max(0, (t - delay) / 0.45));
          if (p <= 0) continue;
          const fall: number = (1 - p) * 90;                    // hauteur de chute restante
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
  }
}
