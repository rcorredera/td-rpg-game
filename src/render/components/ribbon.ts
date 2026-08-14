// ============================================================
// render/components/ribbon.ts — Ruban de titre du pack Tiny Swords.
//
// Le pack livre ses rubans dans les MÊMES cinq couleurs que ses boutons. C'est
// ce qui raccroche visuellement les tuiles aux commandes : jusqu'ici les boutons
// portaient l'art du pack et les titres n'étaient que du texte posé.
//
// Bande à TROIS tranches (`planStrip`) : deux embouts en pointe, jamais rognés
// ni étirés, et un corps qui s'allonge sous le libellé.
// ============================================================

import Phaser from "phaser";
import { fitInsets } from "../nineSlicePlan";
import type { Insets } from "../nineSlicePlan";
import {
  ensureUiSkinTextures, uiSkinInsets, uiSkinSafeInsets,
  UI_SKIN_RIBBON, UI_SKIN_RIBBON_BIG, UI_SKIN_RIBBON_OFF, UI_SKIN_RIBBON_RIFT,
} from "../uiSkin";
import type { SafeInsets } from "../uiSkin";

/** Rôle du ruban — la couleur suit le sens, pas le goût. */
export type RibbonTone = "normal" | "rift" | "off";

const KEY: Record<RibbonTone, string> = {
  normal: UI_SKIN_RIBBON,
  rift: UI_SKIN_RIBBON_RIFT,
  off: UI_SKIN_RIBBON_OFF,
};

/**
 * Résout la clé de texture d'un ruban. `big` n'est honoré que pour le ton
 * "normal" — seule variante déclinée en grand (ADR-035, tuile PRINCIPALE
 * uniquement) ; les autres tons retombent sur la petite planche.
 */
export function uiRibbonKey(scene: Phaser.Scene, tone: RibbonTone, big: boolean = false): string {
  if (big && tone === "normal" && scene.textures.exists(UI_SKIN_RIBBON_BIG)) return UI_SKIN_RIBBON_BIG;
  return KEY[tone];
}

/** Le ruban est-il disponible ? (planche chargée et composée) */
export function uiRibbonAvailable(scene: Phaser.Scene): boolean {
  ensureUiSkinTextures(scene);
  return scene.textures.exists(UI_SKIN_RIBBON);
}

/** Hauteur naturelle d'UNE clé de ruban, telle que dessinée. Le texte s'y centre. */
export function uiRibbonHeight(scene: Phaser.Scene, key: string = UI_SKIN_RIBBON): number {
  const t: Phaser.Textures.Texture = scene.textures.get(key);
  return t.key === "__MISSING" ? 0 : t.getSourceImage().height;
}

/** Air laissé entre le libellé et le début de l'arrondi de l'embout. */
const TEXT_AIR: number = 8;

/**
 * Pose un ruban centré sur `x`,`y`, assez large pour loger `textW`.
 *
 * La largeur se dimensionne sur la marge SÛRE (là où le corps plat commence),
 * pas sur la marge de découpe : celle-ci vaut 61 sur une texture de 130, dont
 * l'essentiel est déjà du corps — la réserver donnerait des rubans deux fois trop
 * larges. `maxW` borne l'étalement, `maxH` l'échelle : un ruban à sa taille
 * native mange toute une tuile secondaire.
 */
export function uiRibbon(
  scene: Phaser.Scene, x: number, y: number, textW: number, maxW: number,
  tone: RibbonTone = "normal", maxH = Infinity, big: boolean = false,
): Phaser.GameObjects.NineSlice | null {
  if (!uiRibbonAvailable(scene)) return null;
  const key: string = uiRibbonKey(scene, tone, big);
  const ins: Insets = uiSkinInsets(key);
  const safe: SafeInsets = uiSkinSafeInsets(key);
  const nativeH: number = uiRibbonHeight(scene, key);
  // Réduction PROPORTIONNELLE (`setScale`) et non un étirement vertical : les
  // embouts se déformeraient. Le pack est du pixel art, on ne l'agrandit jamais.
  const k: number = Math.min(1, maxH / nativeH);

  const voulu: number = textW / k + safe.left + safe.right + TEXT_AIR * 2;
  const w: number = Math.min(maxW / k, Math.max(ins.left + ins.right + 4, voulu));
  const fitted: Insets = fitInsets(ins, w, nativeH);
  const n: Phaser.GameObjects.NineSlice = scene.add.nineslice(x, y, key, undefined, w, nativeH, fitted.left, fitted.right, 0, 0);
  if (k < 1) n.setScale(k);
  return n;
}
