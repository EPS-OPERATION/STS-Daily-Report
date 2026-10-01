import { describe, expect, it } from "bun:test";
import {
  parseNormalizedPoint,
  polygonCenter,
  resolveSitePlanPoints,
} from "../apps/api/src/modules/site-plans/site-plan.geometry.js";
import { savePointsBody } from "../apps/api/src/modules/site-plans/site-plan.schema.js";

describe("site plan points", () => {
  it("accepts normalized coordinates and rejects out-of-range coordinates", () => {
    expect(parseNormalizedPoint({ x: 0.583, y: 0.412 })).toEqual({ x: 0.583, y: 0.412 });
    expect(() => parseNormalizedPoint({ x: -0.01, y: 0.5 })).toThrow();
    expect(() => parseNormalizedPoint({ x: 0.5, y: 1.01 })).toThrow();
    expect(() => parseNormalizedPoint({ x: Number.NaN, y: 0.5 })).toThrow();
  });

  it("derives a stable center from legacy polygon data", () => {
    expect(
      polygonCenter({
        type: "polygon",
        points: [
          { x: 0.2, y: 0.3 },
          { x: 0.8, y: 0.3 },
          { x: 0.8, y: 0.7 },
          { x: 0.2, y: 0.7 },
        ],
      }),
    ).toEqual({ x: 0.5, y: 0.5 });
  });

  it("uses explicit points first, preserves explicit removal, and derives leaf fallbacks", () => {
    const zone = (id: string) => ({
      id,
      code: id,
      name: id,
      parentId: null,
      sortOrder: 0,
      displayColor: "#457B9D",
      defaultDisplayColor: "#457B9D",
    });
    const legacyPolygon = {
      type: "polygon",
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.6, y: 0.2 },
        { x: 0.6, y: 0.6 },
        { x: 0.2, y: 0.6 },
      ],
    };
    const points = resolveSitePlanPoints(
      [
        { zoneId: "explicit", zone: zone("explicit"), x: 0.9, y: 0.8 },
        { zoneId: "removed", zone: zone("removed"), x: null, y: null },
      ],
      [
        { id: "a1", zone: zone("explicit"), geometry: legacyPolygon },
        { id: "a2", zone: zone("removed"), geometry: legacyPolygon },
        { id: "a3", zone: zone("legacy"), geometry: legacyPolygon },
        { id: "a4", zone: zone("parent"), geometry: legacyPolygon },
      ],
      new Set(["parent"]),
    );

    expect(points.map((point) => [point.zoneId, point.x, point.y, point.legacyDerived ?? false])).toEqual([
      ["explicit", 0.9, 0.8, false],
      ["legacy", 0.4, 0.4, true],
    ]);
  });

  it("exposes normalized nullable coordinates in the map point API", () => {
    const locations = savePointsBody.properties.locations;
    expect(locations.items.properties.facilityKey).toBeDefined();
    expect(locations.items.properties.view).toBeDefined();
    expect(locations.items.properties.zoneId).toBeUndefined();
    expect(locations.items.properties.x).toBeDefined();
    expect(locations.items.properties.y).toBeDefined();
  });
});
