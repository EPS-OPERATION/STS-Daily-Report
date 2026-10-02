import { describe, expect, it } from "bun:test";
import {
  getNextPlacementTarget,
  getSiteViewImage,
  getSiteViewPoints,
  markerDraftKey,
  placementProgress,
} from "../apps/web/src/features/site-maps/helpers/site-map-views.js";
import { resolveSitePlanPoints } from "../apps/api/src/modules/site-plans/site-plan.geometry.js";
import type { PlanMapPoint } from "../apps/web/src/features/site-maps/types/site-plan.types.js";

describe("independent image views", () => {
  const zone = {
    id: "boiler",
    code: "2.1",
    name: "Furnace & Boiler",
    parentId: null,
    sortOrder: 0,
    displayColor: "#457B9D",
  };
  const points: PlanMapPoint[] = [
    { zoneId: zone.id, zone, facility: { no: 9, key: "boiler", name: "Boiler" }, view: "overview", x: 0.824, y: 0.415 },
    { zoneId: zone.id, zone, facility: { no: 9, key: "boiler", name: "Boiler" }, view: "top", x: 0.5085, y: 0.44 },
  ];

  it("uses two coordinates for the same Zone identity", () => {
    expect(getSiteViewPoints(points, "overview")[0]).toMatchObject({ zoneId: "boiler", x: 0.824 });
    expect(getSiteViewPoints(points, "top")[0]).toMatchObject({ zoneId: "boiler", x: 0.5085 });
    expect(markerDraftKey("overview", zone.id)).not.toBe(markerDraftKey("top", zone.id));
  });

  it("keeps each actual image's aspect ratio and preserves configured Top backgrounds", () => {
    expect(getSiteViewImage("overview")).toEqual({
      url: "/site-plan/master-layout-map-above.png",
      width: 1513,
      height: 1039,
    });
    expect(getSiteViewImage("top").url).toBe("/site-plan/master-layout-map.png");
    expect(
      getSiteViewImage("top", { objectKey: "layout", url: "https://storage/layout", width: 2000, height: 1000 }),
    ).toEqual({ url: "https://storage/layout", width: 2000, height: 1000 });
  });

  it("never derives Overview coordinates from legacy Top polygons", () => {
    const legacy = [
      {
        id: "area",
        zone,
        geometry: {
          type: "polygon",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
          ],
        },
      },
    ];
    const result = resolveSitePlanPoints(
      [{ zoneId: zone.id, zone, view: "overview", x: null, y: null }],
      legacy,
      new Set(),
    );
    expect(result).toEqual([{ zoneId: zone.id, zone, view: "top", x: 0.5, y: 0.5, legacyDerived: true }]);
  });
});

describe("Save & Next bulk placement", () => {
  const facilities = [
    { key: "a", no: 1, name: "A", zone: { id: "a" } },
    { key: "b", no: 2, name: "B", zone: { id: "b" } },
    { key: "c", no: 3, name: "C", zone: null },
    { key: "d", no: 4, name: "D", zone: { id: "d" } },
  ];
  const placed = new Set(["overview:a", "top:a", "overview:b"]);

  it("prefers the current facility's missing view first", () => {
    expect(getNextPlacementTarget(facilities, (key, view) => placed.has(`${view}:${key}`), "b")).toEqual({
      facilityKey: "b",
      view: "top",
    });
  });

  it("includes unlinked facilities in list order", () => {
    const full = new Set([...placed, "top:b"]);
    expect(getNextPlacementTarget(facilities, (key, view) => full.has(`${view}:${key}`), "b")).toEqual({
      facilityKey: "c",
      view: "overview",
    });
  });

  it("returns null when everything is configured", () => {
    const full = new Set([...placed, "top:b", "overview:c", "top:c", "overview:d", "top:d"]);
    expect(getNextPlacementTarget(facilities, (key, view) => full.has(`${view}:${key}`), "b")).toBeNull();
  });

  it("counts facilities configured in both views", () => {
    expect(placementProgress(facilities, (key, view) => placed.has(`${view}:${key}`))).toEqual({
      done: 1,
      total: 4,
    });
  });
});
