// ============================================================
// render/assets/frames.ts — Découpage des planches de marche (ADR-065).
//
// Une créature ANIMÉE est livrée en une seule image contenant les poses de son
// cycle, côte à côte, toutes calées sur une même ligne de sol (`artprep`). Il
// reste à dire à Phaser où sont les cases.
//
// Pourquoi pas `load.spritesheet` ? Il exige la largeur de case AU CHARGEMENT,
// donc avant de connaître l'image. Il faudrait alors inscrire cette largeur dans
// le registre — une donnée DÉRIVÉE du fichier, qui se périmerait à la première
// régénération de planche. On charge donc l'image normalement et on la découpe
// une fois connue : la largeur de case se déduit du nombre de poses.
//
// Idempotent entre scènes (cache Phaser), même contrat que `ensureTerrainTextures`.
// ============================================================

import type Phaser from "phaser";
import { animatedSprites } from "./sprites";

/**
 * Découpe les planches de marche en cases. Silencieux si une texture manque :
 * un sprite qui garde sa frame unique reste parfaitement jouable, alors qu'une
 * exception ici ferait écran noir.
 */
export function ensureSpriteFrames(scene: Phaser.Scene): void {
  for (const [key, count] of animatedSprites()) {
    if (!scene.textures.exists(key)) continue;
    const tex: Phaser.Textures.Texture = scene.textures.get(key);
    // Déjà découpée : la frame `1` n'existe que si on est passé par ici.
    if (tex.has("1")) continue;
    const src: HTMLImageElement | HTMLCanvasElement = tex.getSourceImage() as HTMLImageElement;
    const cellW: number = Math.floor(src.width / count);
    if (cellW <= 0) continue;
    for (let i: number = 0; i < count; i++) {
      tex.add(i, 0, i * cellW, 0, cellW, src.height);
    }
  }
}
