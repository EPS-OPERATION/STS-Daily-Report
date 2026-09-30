import { describe, expect, it } from "bun:test";
import {
  buildZoneTree,
  getActivityZoneDefaultId,
  getActivityZoneOptions,
  getFocusedMapAreas,
  getVisibleConfigurationAreas,
} from "../apps/web/src/features/site-plan/utils/site-plan-map.js";
import { getDraftForZoneId } from "../apps/web/src/features/zone-configuration/hooks/use-zone-configuration-editor.js";
import { getConfigMapClickAction } from "../apps/web/src/features/zone-configuration/utils/map-interaction.js";
import {
  beginVertexInteraction,
  shouldSelectVertexFromClick,
} from "../apps/web/src/features/site-plan/utils/konva-events.js";
import {
  getZoneColorPreview,
  normalizeZoneColor,
} from "../apps/web/src/features/zone-configuration/utils/zone-color.js";

const zones = [
  { id: "z1", code: "1", name: "Biomass", parentId: null },
  { id: "z11", code: "1.1", name: "Storage", parentId: "z1" },
  { id: "z2", code: "2", name: "Furnace", parentId: null },
  { id: "z21", code: "2.1", name: "Boiler", parentId: "z2" },
  { id: "z211", code: "2.1.1", name: "Furnace", parentId: "z21" },
];

describe("Zone Configuration WBS hierarchy", () => {
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

  it("shows root mappings initially and only a focused zone with its direct children", () => {
    const areas = zones.map((zone) => ({ id: zone.id, zone }));

    expect(getVisibleConfigurationAreas(areas, null).map((area) => area.zone.id)).toEqual(["z1", "z2"]);
    expect(getVisibleConfigurationAreas(areas, "z2").map((area) => area.zone.id)).toEqual(["z2", "z21"]);
  });

  it("includes parent context and direct children in fit bounds without assuming containment", () => {
    const areas = zones.map((zone) => ({ id: zone.id, zone }));

    expect(getFocusedMapAreas(areas, "z2").map((area) => area.zone.id)).toEqual(["z2", "z21"]);
  });

  it("lists leaf zones before parent zones without removing parent options", () => {
    expect(getActivityZoneOptions(zones).map((zone) => zone.id)).toEqual(["z11", "z211", "z1", "z2", "z21"]);
    expect(getActivityZoneDefaultId(zones, "z2")).toBe("");
    expect(getActivityZoneDefaultId(zones, "z211")).toBe("z211");
  });

  it("resolves selection by stable zone ID rather than polygon ID", () => {
    const drafts = [
      { key: "polygon-uuid", areaId: "polygon-uuid", zoneId: "z21", points: [], deleted: false, isNew: false },
    ];

    expect(getDraftForZoneId(drafts, "z21")?.key).toBe("polygon-uuid");
    expect(getDraftForZoneId(drafts, "unmapped-zone")).toBeNull();
  });

  it("prioritizes drawing points over existing polygons and vertex edits over selection", () => {
    expect(
      getConfigMapClickAction({
        drawing: true,
        addPointMode: false,
        boundaryEditing: false,
        selectedZoneId: "z21",
        clickedZoneId: "z21",
      }),
    ).toEqual({ type: "add-drawing-point" });
    expect(
      getConfigMapClickAction({
        drawing: false,
        addPointMode: true,
        boundaryEditing: true,
        selectedZoneId: "z21",
        clickedZoneId: "z21",
      }),
    ).toEqual({ type: "add-vertex" });
    expect(
      getConfigMapClickAction({
        drawing: false,
        addPointMode: true,
        boundaryEditing: true,
        selectedZoneId: "z21",
        clickedZoneId: "z22",
      }),
    ).toEqual({ type: "select-zone", zoneId: "z22" });
  });

  it("keeps vertex clicks inside the handle and ignores the click after dragging", () => {
    const event = { cancelBubble: false };
    const dragMoved = { current: false };

    expect(shouldSelectVertexFromClick(event, dragMoved)).toBe(true);
    expect(event.cancelBubble).toBe(true);

    dragMoved.current = true;
    event.cancelBubble = false;
    expect(shouldSelectVertexFromClick(event, dragMoved)).toBe(false);
    expect(event.cancelBubble).toBe(true);
    expect(dragMoved.current).toBe(false);
  });

  it("allows the first tap after a vertex drag to select the handle", () => {
    const touchStart = { cancelBubble: false };
    const dragMoved = { current: true };

    beginVertexInteraction(touchStart, dragMoved);

    expect(touchStart.cancelBubble).toBe(true);
    expect(shouldSelectVertexFromClick({ cancelBubble: false }, dragMoved)).toBe(true);
  });

  it("normalizes valid UI color input and leaves incomplete hex input invalid", () => {
    expect(normalizeZoneColor(" #e76f51 ")).toBe("#E76F51");
    expect(normalizeZoneColor("#fff")).toBeNull();
    expect(normalizeZoneColor("red")).toBeNull();
  });

  it("keeps the last server color as picker preview while Hex input is invalid", () => {
    expect(getZoneColorPreview("#12GG56", "#457B9D")).toBe("#457B9D");
    expect(getZoneColorPreview("#e76f51", "#457B9D")).toBe("#E76F51");
  });
});
