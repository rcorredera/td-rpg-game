// ============================================================
// render/menu/homeView.ts — Écran d'accueil du Campement : les
// cinq entrées (Histoire, Failles, Armurerie, Bestiaire, Chroniques)
// en deux rangs de tuiles. Voir ADR-025, ADR-034.
// ============================================================

import type Phaser from "phaser";
import { CONTENT } from "../../content/index";
import { EMBLEM, ICON } from "../icons";
import { ACCENT, TEXT } from "../theme";
import { viewport } from "../viewport";
import { hubLayout, menuZone, uiTile, type HubLayout, type MenuZone, type TileBox } from "../components";
import type { MenuCtx, View } from "./types";

export function buildHome(ctx: MenuCtx): void {
  const p: Phaser.GameObjects.Container = ctx.panel;
  const wonCount: number = ctx.profileSvc.get().chaptersWon.length;
  const total: number = CONTENT.chapters.length;
  const storyDone: boolean = ctx.profileSvc.storyCompleted();
  const entries: {
    icon: string; title: string; sub: string; view: View;
    /** Emblème raster du pack — affiché tel quel, sans teinte. */
    raw?: boolean;
    rift?: boolean;
  }[] = [
    // Sous-titres COURTS : une tuile n'est pas une rangée de liste, la phrase y
    // passe à la ligne et écrase l'icône. On y met l'état, pas la description —
    // le détail appartient à l'écran qu'elle ouvre (ADR-025).
    { icon: EMBLEM.bastion, raw: true, title: "Histoire", sub: wonCount > 0 ? `${wonCount} / ${total} chapitres conquis` : "Chapitre 1 · La Route du Bastion", view: "story" },
    {
      icon: storyDone ? ICON.rift : ICON.locked, title: "Failles infinies",
      sub: storyDone ? "Bientôt" : "Achevez l'Histoire",
      view: "rifts", rift: true,
    },
    { icon: EMBLEM.armory, raw: true, title: "Armurerie", sub: "Arsenal · Forge · Héros", view: "shop" },
    { icon: ICON.bestiary, title: "Bestiaire", sub: `${ctx.profileSvc.get().bestiary.length} / ${Object.keys(CONTENT.enemies).length} découverts`, view: "bestiary" },
    { icon: EMBLEM.chronicles, raw: true, title: "Chroniques", sub: "Vos hauts faits", view: "chronicles" },
  ];
  // Deux rangs de tuiles, disposés d'après la largeur RÉELLE de l'écran (ADR-025).
  // Avant : cinq cartes identiques dans une colonne de 540 unités, quand le paysage
  // mobile en offre ~1 300 — 44 % d'occupation, et aucune hiérarchie pour dire où
  // aller. La disposition est calculée par `hubLayout`, pur et testé, et son
  // ANCRAGE (centre + zone utile) par `menuZone` — les deux le sont désormais.
  const [primary, ...rest] = entries;
  const z: MenuZone = menuZone(viewport());
  const layout: HubLayout = hubLayout(z.cx, z.cy, z.w, z.h, rest.length);

  p.add(uiTile(ctx.scene, layout.primary.x, layout.primary.y, {
    w: layout.primary.w, h: layout.primary.h,
    icon: primary!.icon, rawIcon: primary!.raw, title: primary!.title, sub: primary!.sub,
    primary: true,
    progress: total > 0 ? wonCount / total : 0,
    onSelect: () => ctx.navigate(primary!.view),
  }));

  rest.forEach((e, i) => {
    const box: TileBox = layout.secondary[i]!;
    p.add(uiTile(ctx.scene, box.x, box.y, {
      w: box.w, h: box.h,
      icon: e.icon, rawIcon: e.raw, title: e.title, sub: e.sub,
      titleColor: TEXT.light,
      ribbonTone: e.rift ? "rift" : "normal",
      iconColor: e.rift ? (storyDone ? 0xb07cc6 : ACCENT.locked) : ACCENT.goldSoft,
      accent: e.rift ? ACCENT.dimBorder : ACCENT.gold,
      locked: e.rift && !storyDone,
      onSelect: () => ctx.navigate(e.view),
    }));
  });
}
