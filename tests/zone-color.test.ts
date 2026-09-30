import { describe, expect, it } from "bun:test";
import { normalizeZoneColor } from "../apps/api/src/modules/zones/zone.color.js";

describe("zone identity colors", () => {
  it("stores canonical uppercase six-digit hex colors", () => {
    expect(normalizeZoneColor(" #e76f51 ")).toBe("#E76F51");
  });

  it("rejects non-hex and non-six-digit CSS values", () => {
    for (const value of ["red", "#fff", "#12345678", "rgb(1,2,3)", "#12GG56"]) {
      expect(() => normalizeZoneColor(value)).toThrow();
    }
  });
});
