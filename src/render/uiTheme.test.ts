import { describe, expect, it } from "vitest";
import { DEFAULT_UI_THEME, UI_THEMES, resolveUiTheme } from "./uiTheme";
import { C, STATUS } from "./theme";

/** Luminance perçue (0..1) — sert à juger contraste et clarté. */
function luminance(rgb: number): number {
  const r = ((rgb >> 16) & 0xff) / 255, g = ((rgb >> 8) & 0xff) / 255, b = (rgb & 0xff) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const fromCss = (css: string) => parseInt(css.replace("#", ""), 16);

describe("thèmes d'interface", () => {
  it("résout un thème par paramètre d'URL, avec repli sûr", () => {
    // Outil de comparaison, pas option de jeu : une valeur inconnue ne doit jamais
    // laisser l'écran sans palette.
    expect(resolveUiTheme("?theme=arcane").id).toBe("arcane");
    expect(resolveUiTheme("?theme=NOCTURNE").id).toBe("nocturne");
    expect(resolveUiTheme("?theme=nexistepas").id).toBe(DEFAULT_UI_THEME);
    expect(resolveUiTheme("").id).toBe(DEFAULT_UI_THEME);
  });

  it("garde un fond sombre dans chaque thème", () => {
    // Le texte clair et les accents dorés du jeu supposent un fond sombre ; un
    // thème clair casserait toute la lisibilité sans qu'aucun écran ne le signale.
    for (const t of Object.values(UI_THEMES)) {
      expect(luminance(t.backdrop), `thème « ${t.id} »`).toBeLessThan(0.2);
    }
  });

  it("laisse un contraste net entre le texte courant et les panneaux", () => {
    // C'est la lisibilité qui décide, pas le goût : un thème n'est acceptable que
    // si son texte reste franchement plus clair que le panneau qui le porte.
    for (const t of Object.values(UI_THEMES)) {
      const gap = luminance(fromCss(t.textLight)) - luminance(t.panel);
      expect(gap, `thème « ${t.id} » : contraste texte/panneau`).toBeGreaterThan(0.45);
      const dimGap = luminance(fromCss(t.textDim)) - luminance(t.panel);
      expect(dimGap, `thème « ${t.id} » : contraste texte secondaire`).toBeGreaterThan(0.15);
    }
  });

  it("distingue le panneau actif du panneau inactif", () => {
    // Sans écart, l'état « verrouillé » ne se lit plus.
    for (const t of Object.values(UI_THEMES)) {
      expect(luminance(t.panel), `thème « ${t.id} »`).toBeGreaterThan(luminance(t.panelDim));
    }
  });

  it("ne touche jamais aux couleurs du champ de bataille", () => {
    // GARDE-FOU DE PORTÉE : un thème habille les MENUS. Les familles d'ennemis, le
    // terrain et les barres de vie se jugent séparément — les lier ferait changer
    // le jeu en changeant l'habillage des menus (ADR-026).
    expect(C.grass).toBe(0x4a6741);
    expect(C.archer).toBe(0x3e6b8c);
    expect(STATUS.hpGood).toBe(0x27ae60);
  });

  it("propose plusieurs directions réellement différentes", () => {
    // Deux thèmes trop proches ne servent à rien : on doit pouvoir trancher à l'œil.
    const backdrops = new Set(Object.values(UI_THEMES).map(t => t.backdrop));
    expect(backdrops.size).toBe(Object.keys(UI_THEMES).length);
  });
});
