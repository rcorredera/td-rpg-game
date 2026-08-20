// ============================================================
// render/assets/decorTextures.ts — Props de décor, reteints par biome (ADR-062).
//
// Les rochers et buissons viennent du pack Tiny Swords (CC0), en vert-bleu vif.
// Posés tels quels sur les cendres, le givre ou la terre gâtée, ils jureraient
// franchement — le pack a une palette, le jeu en a une autre (ADR-014).
//
// Ils sont donc REMAPPÉS PAR LUMINANCE (`colorRemap.ts`) sur une gamme dérivée
// du sol du biome : la teinte change, le relief du dessin reste. `setTint` ne
// suffirait pas — il multiplie, donc il ne peut qu'assombrir un vert vers un
// vert plus sombre, jamais l'amener au brun d'une terre gâtée.
//
// Une texture par (biome × famille × variante), fabriquée une seule fois et
// gardée dans le cache Phaser. Idempotent, même contrat que `ensureTerrainTextures`.
// ============================================================

import type Phaser from "phaser";
import { biomeFor, type BiomeDef } from "./biomes";
import { cropBuffer, opaqueBBox, type PixelBox, remapBufferByLuma } from "./colorRemap";
import type { PixelBuffer } from "../skin/nineSliceFlatten";
import { decorRamp, type DecorRamp, type PropKind } from "../world/decor";

const SRC: string = "assets/tiny-swords/decor";

/** Variantes disponibles par famille, telles que versionnées dans `public/assets`. */
export const DECOR_VARIANTS: Readonly<Record<PropKind, number>> = { rock: 4, bush: 4 };

/** Côté d'une frame de buisson : les planches du pack en alignent 8 en bande. */
const BUSH_FRAME: number = 128;

/** Clé de la texture SOURCE (couleurs natives du pack), avant reteinte. */
function rawKey(kind: PropKind, variant: number): string {
  return `decor_raw_${kind}_${variant}`;
}

/** Clé de la texture reteinte pour un biome donné. */
export function decorKey(biome: string | undefined, kind: PropKind, variant: number): string {
  return `decor_${biome ?? "meadow"}_${kind}_${variant}`;
}

/** À appeler dans le `preload()` des scènes qui affichent le champ de bataille. */
export function preloadDecor(scene: Phaser.Scene): void {
  for (let i: number = 0; i < DECOR_VARIANTS.rock; i++) {
    scene.load.image(rawKey("rock", i), `${SRC}/rock-0${i + 1}.png`);
  }
  // Les buissons du pack sont ANIMÉS : une planche de 8 frames en bande. On n'en
  // garde que la première — animer une vingtaine de buissons de fond coûterait
  // plus que ça n'apporte, et le décor doit rester en retrait.
  for (let i: number = 0; i < DECOR_VARIANTS.bush; i++) {
    scene.load.spritesheet(rawKey("bush", i), `${SRC}/bush-0${i + 1}.png`, {
      frameWidth: BUSH_FRAME, frameHeight: BUSH_FRAME,
    });
  }
}

/** Pixels de la PREMIÈRE frame d'une texture, en tampon nu. */
function firstFramePixels(scene: Phaser.Scene, key: string, frameSide: number | null): PixelBuffer | null {
  if (!scene.textures.exists(key)) return null;
  const img: HTMLImageElement = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const w: number = frameSide ?? img.width;
  const h: number = frameSide ?? img.height;
  if (w <= 0 || h <= 0) return null;
  const probe: HTMLCanvasElement = document.createElement("canvas");
  probe.width = w;
  probe.height = h;
  const ctx: CanvasRenderingContext2D | null = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  // Découpe la frame à la source : dessiner la planche entière puis lire un coin
  // marcherait, mais lire 1024×128 pour n'en garder que 128 est du gaspillage pur.
  ctx.drawImage(img, 0, 0, w, h, 0, 0, w, h);
  return { w, h, data: ctx.getImageData(0, 0, w, h).data };
}

/**
 * Fabrique les textures de décor du biome. Idempotent : la première scène qui
 * les demande paie, les suivantes retrouvent le cache.
 *
 * Silencieux si les sources manquent (`preloadDecor` non appelé, ou chargement
 * échoué) : un champ sans props reste parfaitement jouable, alors qu'une
 * exception ici ferait écran noir.
 */
export function ensureDecorTextures(scene: Phaser.Scene, biome: string | undefined): void {
  const def: BiomeDef = biomeFor(biome);
  if (def.decor.count <= 0) return;
  const ramp: DecorRamp = decorRamp(def.ground);

  for (const kind of ["rock", "bush"] as const) {
    // Une lande de cendre est à `bushShare: 0` : ne pas fabriquer les buissons
    // qu'elle n'affichera jamais.
    if (kind === "bush" && def.decor.bushShare <= 0) continue;
    if (kind === "rock" && def.decor.bushShare >= 1) continue;

    for (let v: number = 0; v < DECOR_VARIANTS[kind]; v++) {
      const key: string = decorKey(biome, kind, v);
      if (scene.textures.exists(key)) continue;
      const raw: PixelBuffer | null = firstFramePixels(scene, rawKey(kind, v), kind === "bush" ? BUSH_FRAME : null);
      if (!raw) continue;

      remapBufferByLuma(raw, ramp.dark, ramp.light);
      // Recadré sur le contenu opaque : les frames du pack sont largement
      // margées, et `setDisplaySize` étirerait ce vide avec le motif — un
      // buisson paraîtrait deux fois plus petit que demandé.
      const bbox: PixelBox | null = opaqueBBox(raw);
      const buf: PixelBuffer = bbox ? cropBuffer(raw, bbox) : raw;

      const tex: Phaser.Textures.CanvasTexture | null = scene.textures.createCanvas(key, buf.w, buf.h);
      if (!tex) continue;
      const ctx: CanvasRenderingContext2D = tex.getContext();
      const out: ImageData = ctx.createImageData(buf.w, buf.h);
      out.data.set(buf.data);
      ctx.putImageData(out, 0, 0);
      tex.refresh();
    }
  }
}
