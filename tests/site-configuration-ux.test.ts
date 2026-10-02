import { expect, test } from "bun:test";
import {
  appendDisplayOrder,
  markerPoints,
  placementFacility,
} from "../apps/web/src/features/site-configuration/helpers/editor-state.js";
import { updateMarkerDraft } from "../apps/web/src/features/site-maps/helpers/facility-map-state.js";

test("configuration appends new resources without asking for order", () => {
  expect(appendDisplayOrder([])).toBe(1);
  expect(appendDisplayOrder([{ sortOrder: 2 }, { sortOrder: 7 }, { sortOrder: 1 }])).toBe(8);
});
test("placement distinguishes selection from a new point and requires an active Facility/image", () => {
  const points = new Map([["acc", { x: 0.2, y: 0.3 }]]);
  expect(placementFacility("boiler", true, true, points)).toBe("boiler");
  expect(placementFacility("acc", true, true, points)).toBeNull();
  expect(placementFacility("boiler", false, true, points)).toBeNull();
  expect(placementFacility("boiler", true, false, points)).toBeNull();
});
test("preview includes additions/moves/removals and returning to saved position is clean", () => {
  const saved = [{ facilityId: "acc", x: 0.2, y: 0.3 }];
  expect(markerPoints(saved, { acc: { x: 0.4, y: 0.5 }, boiler: { x: 0.6, y: 0.7 } }).get("acc")).toEqual({
    x: 0.4,
    y: 0.5,
  });
  expect(markerPoints(saved, { acc: null }).has("acc")).toBe(false);
  expect(markerPoints(saved, {}).get("acc")).toEqual({ x: 0.2, y: 0.3 });
  expect(updateMarkerDraft({ acc: { x: 0.4, y: 0.5 } }, saved, "acc", { x: 0.2, y: 0.3 })).toEqual({});
});
