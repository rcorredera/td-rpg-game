import { describe, expect, it } from "vitest";
import { layoutTabs } from "./tabBar";
import type { TabPosition } from "./tabBar";

describe("layoutTabs (tabBar.ts)", () => {
  it("centre 2 onglets autour de x", () => {
    const positions: TabPosition<string>[] = layoutTabs([{ id: "a", label: "A" }, { id: "b", label: "B" }], 400, 120, 20);
    expect(positions).toEqual([{ id: "a", x: 330 }, { id: "b", x: 470 }]);
  });

  it("centre 3 onglets autour de x", () => {
    const positions: TabPosition<string>[] = layoutTabs(
      [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }],
      400, 120, 20,
    );
    expect(positions.map(p => p.x)).toEqual([260, 400, 540]);
  });

  it("un seul onglet reste centré sur x", () => {
    const positions: TabPosition<string>[] = layoutTabs([{ id: "a", label: "A" }], 400, 120, 20);
    expect(positions).toEqual([{ id: "a", x: 400 }]);
  });
});
