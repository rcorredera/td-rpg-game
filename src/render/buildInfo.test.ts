import { describe, expect, it } from "vitest";
import { buildLabel } from "./buildInfo";

describe("buildLabel", () => {
  it("préfixe l'identifiant fourni", () => {
    expect(buildLabel("a1b2c3d")).toBe("build a1b2c3d");
  });

  it("accepte le repli \"dev\" (git indisponible)", () => {
    expect(buildLabel("dev")).toBe("build dev");
  });
});
