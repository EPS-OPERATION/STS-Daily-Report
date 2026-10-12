import { describe, expect, it } from "bun:test";
import { coordinationDateValid, coordinationGeometryError, coordinationRectangleValid, coordinationToday, type CoordinationGeometry } from "@sts/shared";

const polygon = (points: number[][]): CoordinationGeometry => ({ type: "polygon", points: points.map(([x, y]) => ({ x: x!, y: y! })) });
describe("Coordination geometry and calendar semantics", () => {
  it("accepts a concave work area and rejects crossing, duplicate and degenerate edges", () => {
    expect(coordinationGeometryError(polygon([[0.1, 0.1], [0.5, 0.1], [0.5, 0.3], [0.3, 0.2], [0.1, 0.3]]))).toBeNull();
    expect(coordinationGeometryError(polygon([[0.1, 0.1], [0.5, 0.5], [0.1, 0.5], [0.5, 0.1]]))).not.toBeNull();
    expect(coordinationGeometryError(polygon([[0.1, 0.1], [0.1, 0.1], [0.5, 0.5]]))).not.toBeNull();
    expect(coordinationGeometryError(polygon([[0.1, 0.1], [0.2, 0.2], [0.3, 0.3]]))).not.toBeNull();
    expect(coordinationGeometryError(polygon([[0.1, 0.1], [1.1, 0.1], [0.1, 0.5]]))).not.toBeNull();
  });
  it("validates a rotated rectangle in image pixel space, not stretched normalized space", () => {
    const width = 6542, height = 4951;
    const rotation = Math.PI / 4;
    const points = [[0, 0], [600, 0], [600, 300], [0, 300]].map(([x, y]) => ({
      x: (2500 + x! * Math.cos(rotation) - y! * Math.sin(rotation)) / width,
      y: (2000 + x! * Math.sin(rotation) + y! * Math.cos(rotation)) / height,
    }));
    expect(coordinationRectangleValid(points, width, height)).toBe(true);
    expect(coordinationRectangleValid(points, 1, 1)).toBe(false);
    expect(coordinationGeometryError({ type: "polygon", points })).toBeNull();
    expect(coordinationRectangleValid(polygon([[0.1, 0.1], [0.5, 0.1], [0.4, 0.3], [0.1, 0.3]]).points, width, height)).toBe(false);
  });
  it("uses the Thailand calendar day and rejects impossible dates", () => {
    expect(coordinationToday(new Date("2026-10-11T18:00:00Z"))).toBe("2026-10-12");
    expect(coordinationToday(new Date("2026-10-11T16:59:00Z"))).toBe("2026-10-11");
    expect(coordinationDateValid("2026-02-30")).toBe(false);
    expect(coordinationDateValid("2028-02-29")).toBe(true);
    expect(coordinationDateValid("2026-10-12")).toBe(true);
  });
});
