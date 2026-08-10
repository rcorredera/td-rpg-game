import { describe, expect, it } from "vitest";
import { ACCENT, TEXT, UI_TINT } from "../theme";
import { rowColors } from "./listRow";

describe("rowColors (listRow.ts)", () => {
  it("normal : bordure or, fond panneau, titre clair", () => {
    expect(rowColors("normal")).toEqual({ border: ACCENT.gold, fill: UI_TINT.panel, titleColor: TEXT.light });
  });

  it("locked : bordure et fond assombris, titre estompé", () => {
    expect(rowColors("locked")).toEqual({ border: ACCENT.locked, fill: ACCENT.lockedFill, titleColor: TEXT.dim });
  });

  it("unaffordable : cadre grisé mais titre lisible (le coût, pas le titre, porte le rouge)", () => {
    expect(rowColors("unaffordable")).toEqual({ border: ACCENT.dimBorder, fill: UI_TINT.panel, titleColor: TEXT.light });
  });

  it("done : bordure de victoire", () => {
    expect(rowColors("done")).toEqual({ border: ACCENT.won, fill: UI_TINT.panel, titleColor: TEXT.light });
  });
});
