import { describe, expect, it } from "bun:test";
import {
  buildZoneTree,
  getActivityZoneDefaultId,
  getActivityZoneOptions,
  getZoneDescendantIds,
  getZoneDescendantPoints,
  getZoneMapInteraction,
} from "../apps/web/src/features/site-maps/helpers/site-plan-map.js";

const zones = [
  { id: "z1", code: "1", name: "Biomass", parentId: null },
  { id: "z11", code: "1.1", name: "Storage", parentId: "z1" },
  { id: "z2", code: "2", name: "Furnace", parentId: null },
  { id: "z21", code: "2.1", name: "Boiler", parentId: "z2" },
  { id: "z211", code: "2.1.1", name: "Furnace Part", parentId: "z21" },
];

describe("Site Plan WBS navigation", () => {
  it("builds a generic tree from parent IDs", () => {
    expect(
      buildZoneTree(zones).map(({ zone, children }) => ({
        id: zone.id,
        children: children.map((child) => ({
          id: child.zone.id,
          children: child.children.map((grandchild) => grandchild.zone.id),
        })),
      })),
    ).toEqual([
      { id: "z1", children: [{ id: "z11", children: [] }] },
      { id: "z2", children: [{ id: "z21", children: ["z211"] }] },
    ]);
  });

  it("finds descendants and focuses only their available map points", () => {
    const points = [
      { zoneId: "z11", x: 0.2, y: 0.3 },
      { zoneId: "z21", x: 0.7, y: 0.3 },
      { zoneId: "z211", x: 0.8, y: 0.4 },
    ];
    expect([...getZoneDescendantIds("z2", zones)]).toEqual(["z21", "z211"]);
    expect(getZoneDescendantPoints("z2", zones, points).map((point) => point.zoneId)).toEqual(["z21", "z211"]);
    expect(getZoneMapInteraction("z2", zones)).toBe("focus");
    expect(getZoneMapInteraction("z21", zones)).toBe("focus");
    expect(getZoneMapInteraction("z211", zones)).toBe("inspect");
  });

  it("lists physical Zones before parent groups and does not preselect a group", () => {
    expect(getActivityZoneOptions(zones).map((zone) => zone.id)).toEqual(["z11", "z211", "z1", "z2", "z21"]);
    expect(getActivityZoneDefaultId(zones, "z2")).toBe("");
    expect(getActivityZoneDefaultId(zones, "z211")).toBe("z211");
  });
});
