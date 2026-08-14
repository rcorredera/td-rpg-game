// ============================================================
// render/components/tabBar.ts — Barre d'onglets (remplace les boucles
// uiButton dupliquées dans MenuScene pour la Boutique et le Bestiaire).
// ============================================================

import Phaser from "phaser";
import { uiButton } from "./button";

export interface UiTab<T extends string> {
  id: T;
  label: string;
}

export interface UiTabBarOpts {
  w?: number;
  h?: number;
  gap?: number;
  fontSize?: number;
}

export interface TabPosition<T extends string> { id: T; x: number }

/** Pure — centre N onglets de largeur w+gap autour de x. Exportée pour test unitaire. */
export function layoutTabs<T extends string>(
  tabs: readonly UiTab<T>[], x: number, w: number, gap: number,
): TabPosition<T>[] {
  const step: number = w + gap;
  const totalW: number = tabs.length * w + (tabs.length - 1) * gap;
  const start: number = x - totalW / 2 + w / 2;
  return tabs.map((t, i) => ({ id: t.id, x: start + i * step }));
}

export function uiTabBar<T extends string>(
  scene: Phaser.Scene, x: number, y: number,
  tabs: readonly UiTab<T>[], activeId: T, onSelect: (id: T) => void, opts: UiTabBarOpts = {},
): Phaser.GameObjects.Container {
  const w: number = opts.w ?? 130;
  const h: number = opts.h ?? 32;
  const gap: number = opts.gap ?? 20;
  const container: Phaser.GameObjects.Container = scene.add.container(0, 0);
  const positions: TabPosition<T>[] = layoutTabs(tabs, x, w, gap);
  tabs.forEach((t, i) => {
    const active: boolean = t.id === activeId;
    container.add(uiButton(scene, positions[i]!.x, y, t.label, { w, h, gold: active, fontSize: opts.fontSize ?? 15 },
      () => onSelect(t.id)).container);
  });
  return container;
}
