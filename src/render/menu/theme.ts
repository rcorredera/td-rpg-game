// ============================================================
// render/menu/theme.ts — Constantes de style partagées par les
// écrans du Campement. Voir ADR-034.
// ============================================================

import { FONT_BODY, FONT_DISPLAY } from "../theme/ui";
import { WORLD_W } from "../platform/viewport";

export const TXT: { fontFamily: string } = { fontFamily: FONT_BODY };
export const TITLE: { fontFamily: string } = { fontFamily: FONT_DISPLAY };

/** Centre horizontal du repère logique. Il était écrit en dur (`400` = l'ancien
 *  800/2) à une vingtaine d'endroits et a SURVÉCU au passage du champ de bataille
 *  en 960×540 (ADR-027) : tout l'écran était décalé de 80 unités vers la gauche.
 *  Invisible en paysage mobile — le débord latéral l'absorbe — mais flagrant dès
 *  que la largeur visible vaut celle du monde (desktop 16:10). Ne jamais réécrire
 *  un centre en dur : `hubZone`/`levelGridZone` le dérivent, et un test le garantit. */
export const CX: number = WORLD_W / 2;

export const GOLD: string = "#e8c252";
export const DIM: string = "#a89878";
export const OK: string = "#27ae60";
export const LIGHT: string = "#f0e6d2";
export const SCEAU: string = "#c97ba2";

export const LORE_INTRO: string = [
  "Les hordes du Roi-Charogne ont franchi les marches du Nord.",
  "Village après village, la vallée brûle. Il ne reste qu'une place forte",
  "sur leur route : le Bastion — et vous, Chevalier, pour le tenir.",
  "",
  "Dressez vos tours. Menez la charge. Tenez les remparts.",
].join("\n");
