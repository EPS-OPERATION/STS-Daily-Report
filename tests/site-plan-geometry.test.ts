import { describe, expect, it } from "bun:test";
import { parseGeometry } from "../apps/api/src/modules/site-plans/site-plan.geometry.js";
import { mapToNormalized, normalizedToMap } from "../apps/web/src/features/site-maps/helpers/coordinates.js";

describe("normalized Site Plan geometry", () => {
  it("accepts a polygon within the normalized coordinate range", () => {
    const geometry = {
      type: "polygon",
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.8, y: 0.2 },
        { x: 0.6, y: 0.9 },
      ],
    };
    expect(parseGeometry(geometry)).toEqual(geometry);
  });

  it("rejects malformed and out-of-bounds polygons", () => {
    expect(() =>
      parseGeometry({
        type: "polygon",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseGeometry({
        type: "polygon",
        points: [
          { x: -0.01, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseGeometry({
        type: "polygon",
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: Number.NaN },
        ],
      }),
    ).toThrow();
  });

  it("round-trips normalized coordinates without storing viewport pixels", () => {
    const point = { x: 0.25, y: 0.31 };
    expect(mapToNormalized(normalizedToMap(point, 1586, 992), 1586, 992)).toEqual(point);
    expect(mapToNormalized({ x: -10, y: 1200 }, 1586, 992)).toEqual({ x: 0, y: 1 });
  });
});
