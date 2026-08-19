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
import type { Insets } from "../nineSlicePlan";
import {
  ensureUiSkinTextures, uiSkinFlattenStrip, uiSkinInsets,
  UI_SKIN_RIBBON, UI_SKIN_RIBBON_BIG, UI_SKIN_RIBBON_OFF, UI_SKIN_RIBBON_RIFT,
} from "../uiSkin";

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

/** Air laissé entre le libellé et le début de l'arrondi de l'embout. Généreux :
 *  à 8, le texte touchait quasiment le bord du corps plat sur la tuile
 *  principale (mesuré : ~2 px de marge réelle une fois `safe` et `k` appliqués). */
const TEXT_AIR: number = 20;

/**
 * Pose un ruban centré sur `x`,`y`, assez large pour loger `textW`.
 *
 * La largeur se dimensionne sur les marges de DÉCOUPE (`ins.left`/`ins.right`,
 * la largeur exacte des embouts dans la texture aplatie) et non sur une marge
 * « sûre » mesurée par couleur : `ts_ribbon_big` porte un motif tissé avec des
 * reflets clairs, et un reflet à l'intérieur même de l'embout peut ressembler
 * à la couleur du corps — le scan de `uiSkinSafeInsets` s'arrêtait alors bien
 * avant le vrai bord de l'embout, produisant un ruban trop étroit où le texte
 * débordait sur les ailes (constaté sur la tuile Histoire). Les marges de
 * découpe, elles, sont GÉOMÉTRIQUEMENT exactes : `uiSkinFlattenStrip` dessine
 * l'embout sur exactement `ins.left`/`ins.right` px, jamais moins — le corps
 * étiré (`w - ins.left - ins.right`) est donc garanti d'être au moins aussi
 * large que `textW` + air, quel que soit le motif de la planche.
 * `maxW` borne l'étalement, `maxH` l'échelle : un ruban à sa taille native
 * mange toute une tuile secondaire.
 */
export function uiRibbon(
  scene: Phaser.Scene, x: number, y: number, textW: number, maxW: number,
  tone: RibbonTone = "normal", maxH = Infinity, big: boolean = false,
): Phaser.GameObjects.Image | null {
  if (!uiRibbonAvailable(scene)) return null;
  const key: string = uiRibbonKey(scene, tone, big);
  const nativeH: number = uiRibbonHeight(scene, key);
  // Réduction PROPORTIONNELLE en unités FINALES — le pack est du pixel art, on
  // ne l'agrandit jamais (k borné à 1).
  const k: number = Math.min(1, maxH / nativeH);
  const ins: Insets = uiSkinInsets(key);
  const h: number = nativeH * k;

  const caps: number = (ins.left + ins.right) * k;
  const voulu: number = caps + textW + TEXT_AIR * k * 2;
  const w: number = Math.min(maxW, Math.max(caps + 4, voulu));
  // Aplati sur canvas plutôt que posé en NineSlice : cf. `uiSkinFlattenStrip`,
  // qui documente la couture observée sous la caméra à zoom fractionnaire de
  // la vue (ADR-010) et pourquoi un NineSlice n'est plus fiable ici.
  const flatKey: string = uiSkinFlattenStrip(scene, key, w, h);
  return scene.add.image(x, y, flatKey);
}
