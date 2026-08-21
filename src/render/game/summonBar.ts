// ============================================================
// render/game/summonBar.ts — Barre d'invocation du bac à sable (ADR-066).
//
// Le bac à sable enchaînait des vagues fixes : pour voir une créature donnée il
// fallait passer toutes celles d'avant. Ici, une vignette par créature — un tap
// en fait apparaître UNE. On regarde ce qu'on veut, quand on veut, autant de
// fois qu'on veut.
//
// N'existe QUE dans le bac à sable. Le HUD du jeu n'a pas à porter un outil
// d'atelier, et cette barre ne connaît rien du run : elle appelle une commande
// de simulation (`spawnOneEnemy`) et n'écrit jamais dans `RunState` (ADR-001).
// ============================================================

import type Phaser from "phaser";
import { CURSOR_POINT, FONT_BODY } from "../theme/ui";
import { scaleFont, touchSize, viewport } from "../platform/viewport";
import type { Viewport } from "../platform/viewport";
import { enemyView, fitSquare, portraitFrame } from "../assets/sprites";
import type { SpriteFit, SpriteRef } from "../assets/sprites";
import { ACCENT, TEXT } from "../theme/theme";

/** Ce qu'une vignette doit savoir afficher et déclencher. */
export interface SummonEntry {
  defId: string;
  name: string;
}

/**
 * Barre d'invocation, ancrée SOUS le bandeau de titre et non au bas de l'écran :
 * la barre d'actions du run y est déjà, et deux rangées de boutons en bas se
 * disputeraient le pouce (ADR-011).
 */
export class SummonBar {
  private container: Phaser.GameObjects.Container | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  destroy(): void {
    this.container?.destroy(true);
    this.container = null;
  }

  /** (Re)construit la barre. `onSummon` reçoit le `defId` choisi. */
  build(entries: readonly SummonEntry[], onSummon: (defId: string) => void): void {
    this.destroy();
    const v: Viewport = viewport();
    const c: Phaser.GameObjects.Container = this.scene.add.container(0, 0).setDepth(1000);
    this.container = c;

    const cell: number = touchSize(46);
    const gap: number = 4;
    const perRow: number = Math.max(1, Math.floor((v.width - 20) / (cell + gap)));
    const top: number = Math.max(v.safeTop, 0) + touchSize(32) + 16;

    entries.forEach((e, i) => {
      const col: number = i % perRow;
      const row: number = Math.floor(i / perRow);
      // Rangée CENTRÉE sur la largeur réelle : une rangée incomplète (la
      // dernière) doit rester sous les autres, pas collée à gauche.
      const inRow: number = Math.min(perRow, entries.length - row * perRow);
      const rowW: number = inRow * cell + (inRow - 1) * gap;
      const x: number = v.left + (v.width - rowW) / 2 + col * (cell + gap) + cell / 2;
      const y: number = top + row * (cell + gap) + cell / 2;

      const plate: Phaser.GameObjects.Rectangle = this.scene.add.rectangle(x, y, cell, cell, 0x1b1510, 0.72)
        .setStrokeStyle(1, ACCENT.gold, 0.35)
        .setInteractive({ cursor: CURSOR_POINT });
      plate.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();      // sans quoi le tap poserait aussi une tour
        onSummon(e.defId);
      });
      c.add(plate);

      const ref: SpriteRef = enemyView(e.defId);
      const frame: number | undefined = portraitFrame(e.defId);
      const img: Phaser.GameObjects.Image = frame === undefined
        ? this.scene.add.image(x, y, ref.key)
        : this.scene.add.image(x, y, ref.key, frame);
      // Proportions natives (`fitSquare`, ADR-046) : une planche de marche a des
      // cases plus hautes que larges, un carré forcé écraserait la créature.
      const fit: SpriteFit = fitSquare(img.width, img.height, cell - 8);
      img.setDisplaySize(fit.w, fit.h);
      c.add(img);
    });

    const hint: Phaser.GameObjects.Text = this.scene.add.text(
      v.left + v.width / 2, top - 6, "Bac à sable · touchez une créature pour l'invoquer",
      { fontSize: `${scaleFont(11)}px`, color: TEXT.dim, fontFamily: FONT_BODY },
    ).setOrigin(0.5, 1);
    c.add(hint);
  }
}
