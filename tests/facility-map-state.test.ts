import { describe, expect, it } from "bun:test";
import {
  defaultMapView,
  defaultSiteMap,
  emptyFacilitySelection,
  markerDraftRows,
  selectFacility,
  switchMapView,
  switchSiteMap,
  updateMarkerDraft,
} from "../apps/web/src/features/site-maps/helpers/facility-map-state.js";

describe("Facility selection and per-View marker drafts", () => {
  it("chooses active defaults and supports arbitrary dynamic Views", () => {
    expect(
      defaultSiteMap([
        { id: "archived", isActive: false, isDefault: true },
        { id: "map", isActive: true, isDefault: false },
      ]),
    ).toBe("map");
    const views = [
      { id: "drone", key: "drone", name: "Drone", sortOrder: 0, isActive: true },
      { id: "overview", key: "overview", name: "Overview", sortOrder: 1, isActive: true },
    ];
    expect(defaultMapView(views)).toBe("overview");
    expect(defaultMapView(views.map((view) => ({ ...view, isActive: view.id === "drone" })))).toBe("drone");
  });
  it("retains the same Facility/Part across Maps and Views even without a marker", () => {
    const state = {
      ...emptyFacilitySelection,
      selectedFacilityId: "facility-acc",
      selectedFacilityPartId: "part-c1",
      selectedMapViewId: "overview",
    };
    const next = switchMapView(switchSiteMap(state, "second-map"), "unplaced-view");
    expect(next.selectedFacilityId).toBe("facility-acc");
    expect(next.selectedFacilityPartId).toBe("part-c1");
    expect(selectFacility(next, "facility-tr").selectedFacilityPartId).toBeNull();
    expect(selectFacility(next, null).selectedFacilityId).toBeNull();
  });
  it("saves only marker changes and removes a placement without deleting Facility identity", () => {
    const saved = [{ facilityId: "acc", x: 0.2, y: 0.3 }];
    expect(updateMarkerDraft({}, saved, "acc", { x: 0.2, y: 0.3 })).toEqual({});
    const moved = updateMarkerDraft({}, saved, "acc", { x: 0.7, y: 0.6 });
    expect(markerDraftRows(moved)).toEqual([{ facilityId: "acc", x: 0.7, y: 0.6 }]);
    expect(markerDraftRows(updateMarkerDraft(moved, saved, "acc", null))).toEqual([
      { facilityId: "acc", x: null, y: null },
    ]);
    expect(updateMarkerDraft({}, [], "tr", null)).toEqual({});
  });
});
