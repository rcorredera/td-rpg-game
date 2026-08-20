// ============================================================
// render/game/slotMenu.ts — Menu contextuel d'un slot (construire /
// améliorer / spécialiser / vendre). Voir ADR-011, ADR-024, ADR-034.
// ============================================================

import Phaser from "phaser";
import { CONTENT } from "../../content/index";
import { playSfx } from "../platform/audio";
import {
  buildTower, sellRefundFor, sellTower, specializeTower, specOf, upgradeTower,
} from "../../core/sim";
import type {
  PlayableChapter, RunState, TowerDef, TowerLevelStats, TowerSpecDef, TowerState, Vec2,
} from "../../core/types";
import { CURSOR_POINT, FONT_BODY, UI_TINT } from "../theme/ui";
import { viewport } from "../platform/viewport";
import type { Viewport } from "../platform/viewport";
import { decorativeEdgeVisible, uiPanel } from "../components";
import { uiSkinInset, UI_SKIN_PANEL } from "../skin/uiSkin";
import { C } from "./constants";
import type { SlotMenuEntry } from "./types";

/** Largeur rendue d'un texte, via un `Text` jetable — sert à dimensionner un
 *  conteneur sur son contenu réel plutôt que sur une valeur en dur. */
function measureTextWidth(scene: Phaser.Scene, txt: string, px: number): number {
  const t: Phaser.GameObjects.Text = scene.add.text(0, 0, txt, { fontSize: `${px}px`, fontFamily: FONT_BODY });
  const w: number = t.width;
  t.destroy();
  return w;
}

/** Entrées du slot : construction (vide) ou amélioration/spécialisation/vente
 *  (occupé). `close` est appelé après toute action, mutation de sim ou non. */
function buildEntries(
  scene: Phaser.Scene, run: RunState, slotIdx: number, existing: TowerState | undefined, unlocks: string[], close: () => void,
): SlotMenuEntry[] {
  if (!existing) {
    // cb null = entrée désactivée (or insuffisant) : grisée, coût en rouge.
    // sub/sub2 = lignes secondaires (pitch, stats).
    return Object.values(CONTENT.towers)
      .filter(t => !t.requiresUnlock || unlocks.includes(t.requiresUnlock))
      .map(t => {
        const cost: number = t.costs[0]!;
        const lv1: TowerLevelStats = t.levels[0]!;
        const afford: boolean = run.gold >= cost;
        const role: string = t.splashRadius > 0 ? "zone" : "monocible";
        const extra: string = t.groundOnly ? " · ignore les volants" : t.slow ? " · ralentit" : " · vise tout";
        return {
          label: `${t.name} (${cost} ◆)`,
          sub: `⚔ ${lv1.damage}  ⊙ ${lv1.range}  ${lv1.fireRate}/s · ${role}${extra}`,
          color: afford ? C.uiText : "#e74c3c",
          cb: afford ? () => { buildTower(run, CONTENT, slotIdx, t.id, unlocks); playSfx(scene, "purchase"); close(); } : null,
        };
      });
  }

  const entries: SlotMenuEntry[] = [];
  const def: TowerDef = CONTENT.towers[existing.defId]!;
  if (existing.level < def.levels.length) {
    const cost: number = def.costs[existing.level]!;
    const cur: TowerLevelStats = def.levels[existing.level - 1]!, next: TowerLevelStats = def.levels[existing.level]!;
    const afford: boolean = run.gold >= cost;
    entries.push({
      label: `Améliorer niv.${existing.level + 1} (${cost} ◆)`,
      sub: `⚔ ${cur.damage}→${next.damage}  ⊙ ${cur.range}→${next.range}  ${cur.fireRate}→${next.fireRate}/s`,
      color: afford ? C.uiText : "#e74c3c",
      cb: afford ? () => { upgradeTower(run, CONTENT, slotIdx); playSfx(scene, "purchase"); close(); } : null,
    });
  } else if (!existing.specId && def.specs?.length && !run.canSpecialize) {
    // Rang 4 verrouillé à la méta : le dire, plutôt que d'afficher des options
    // que le clic ignorerait en silence (ADR-024).
    entries.push({
      label: "★ Spécialisations verrouillées",
      sub: "À débloquer à l'Armurerie : « Doctrines de siège ».",
      color: "#8a8577",
      cb: null,
    });
  } else if (!existing.specId && def.specs?.length) {
    // Niveau 4 : choix de spécialisation (exclusif et définitif), avec deltas de stats
    const cur: TowerLevelStats = def.levels[def.levels.length - 1]!;
    for (const sp of def.specs) {
      const afford: boolean = run.gold >= sp.cost;
      const stats: string = sp.aura
        ? `aura ⊙ ${sp.aura.radius} · vitesse ennemie ×${sp.aura.slowFactor}`
        : `⚔ ${cur.damage}→${sp.stats.damage}${sp.multishot ? `×${sp.multishot}` : ""}  ⊙ ${cur.range}→${sp.stats.range}  ${cur.fireRate}→${sp.stats.fireRate}/s`;
      entries.push({
        label: `★ ${sp.name} (${sp.cost} ◆)`,
        sub: sp.desc,
        sub2: stats,
        color: afford ? "#e8c252" : "#e74c3c",
        cb: afford ? () => { specializeTower(run, CONTENT, slotIdx, sp.id); playSfx(scene, "purchase"); close(); } : null,
      });
    }
  } else {
    const spec: TowerSpecDef | undefined = specOf(CONTENT, existing);
    entries.push({ label: spec ? `★ ${spec.name}` : "Niveau max", color: "#27ae60", cb: () => close() });
  }
  // Vente : rembourse un % de l'investissement (GDD §Tours)
  const refund: number = sellRefundFor(CONTENT, existing.defId, existing.level, existing.specId);
  entries.push({
    label: `Vendre (+${refund} ◆)`,
    color: "#e8a87c",
    cb: () => { sellTower(run, CONTENT, slotIdx); playSfx(scene, "purchase"); close(); },
  });
  return entries;
}

/** Construit le menu contextuel d'un slot, ancré dans les bords sûrs de l'écran
 *  courant (pas du cadre 800×600). `close` ferme le menu (appelé par toute
 *  action, mutation de sim ou non — cf. `GameScene.closeMenu`). */
export function buildSlotMenu(
  scene: Phaser.Scene, run: RunState, ch: PlayableChapter, unlocks: string[],
  slotIdx: number, close: () => void,
): Phaser.GameObjects.Container {
  const slot: Vec2 = ch.map.slots[slotIdx]!;
  const existing: TowerState | undefined = run.towers.find(t => t.slotIndex === slotIdx);
  // Le menu reste dans les bords sûrs de l'écran courant, pas du cadre 800×600.
  const v: Viewport = viewport();
  const menu: Phaser.GameObjects.Container = scene.add.container(
    Phaser.Math.Clamp(slot.x, v.safeLeft + 125, v.safeRight - 125),
    Math.max(v.safeTop + 70, slot.y - 70),
  );
  const entries: SlotMenuEntry[] = buildEntries(scene, run, slotIdx, existing, unlocks, close);

  // Largeur DÉRIVÉE du contenu : à 230 en dur, la ligne descriptive la plus
  // longue mesurait 275 unités et débordait des deux côtés du panneau. Le défaut
  // préexistait, mais un panneau au cadre ouvragé ne pardonne plus le débord.
  const menuW: number = Math.ceil(Math.max(230, ...entries.flatMap(e => [
    measureTextWidth(scene, e.label, 14),
    ...(e.sub ? [measureTextWidth(scene, e.sub, 11)] : []),
    ...(e.sub2 ? [measureTextWidth(scene, e.sub2, 11)] : []),
  ])) + 2 * uiSkinInset(UI_SKIN_PANEL) + 10);
  const half: number = menuW / 2;

  let yOff: number = 0;
  for (const e of entries) {
    const enabled: boolean = e.cb !== null;
    // Hauteurs relevées pour l'habillage ouvragé : ses marges valent 22, donc
    // une rangée de 44 n'est QUE du cadre et le texte se pose sur l'ornement.
    // Au passage, 30 était sous le plancher tactile (ADR-011) pour une cible
    // qu'on vise au doigt en pleine partie.
    const hgt: number = e.sub2 ? 78 : e.sub ? 64 : 48;
    const cy: number = yOff + hgt / 2;
    const bg: Phaser.GameObjects.NineSlice = uiPanel(scene, 0, cy, menuW, hgt, enabled ? UI_TINT.panel : UI_TINT.panelDim, enabled ? 1 : 0.8);
    menu.add(bg);
    // Liseré tracé à la main : il doublait le cadre du panneau ouvragé du pack,
    // exactement comme celui de `uiFramedPanel` (ADR-029). L'état « indisponible »
    // reste porté par la teinte éteinte et l'opacité du panneau.
    if (decorativeEdgeVisible(scene)) {
      const edge: Phaser.GameObjects.Graphics = scene.add.graphics();
      edge.lineStyle(1, enabled ? 0xc9a227 : 0x6b5a3e, 0.9);
      edge.strokeRoundedRect(-half, yOff, menuW, hgt, 8);
      menu.add(edge);
    }
    const labelY: number = e.sub2 ? cy - 22 : e.sub ? cy - 11 : cy;
    const txt: Phaser.GameObjects.Text = scene.add.text(0, labelY, e.label, {
      fontSize: "14px", color: e.color ?? C.uiText, fontFamily: FONT_BODY,
    }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75);
    menu.add(txt);
    if (e.sub) {
      menu.add(scene.add.text(0, e.sub2 ? cy - 2 : cy + 11, e.sub, {
        fontSize: "11px", color: "#a89878", fontFamily: FONT_BODY,
      }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75));
    }
    if (e.sub2) {
      menu.add(scene.add.text(0, cy + 20, e.sub2, {
        fontSize: "11px", color: "#f0e6d2", fontFamily: FONT_BODY,
      }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.75));
    }
    if (enabled) {
      const zone: Phaser.GameObjects.Zone = scene.add.zone(0, cy, menuW, hgt).setInteractive({ cursor: CURSOR_POINT });
      zone.on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation(); e.cb!();
      });
      menu.add(zone);
    }
    yOff += hgt + 4;
  }
  // Au-dessus des entités/overlay (900) mais sous les modales (confirmQuit 3000).
  menu.setDepth(2000);
  return menu;
}
