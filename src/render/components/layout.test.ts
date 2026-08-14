import { describe, expect, it } from "vitest";
import { layoutCursor } from "./layout";
import type { LayoutCursor } from "./layout";

describe("layoutCursor (layout.ts)", () => {
  it("centre le premier élément sur startY + height/2", () => {
    const c: LayoutCursor = layoutCursor(100);
    expect(c.next(76)).toBe(138);
  });

  it("empile le suivant après height + gap (gap par défaut 8)", () => {
    const c: LayoutCursor = layoutCursor(100);
    c.next(76);
    expect(c.next(76)).toBe(222); // 100+76+8 -> +38
  });

  it("respecte un gap explicite différent", () => {
    const c: LayoutCursor = layoutCursor(0);
    c.next(50, 20);
    expect(c.next(50)).toBe(95); // (0+50+20) + 25
  });

  it("expose le Y courant (bas du dernier élément) après chaque next()", () => {
    const c: LayoutCursor = layoutCursor(0);
    c.next(76);
    expect(c.y).toBe(84); // 76 + gap par défaut 8
  });
});
