import { describe, expect, it } from "bun:test";
import { aggregateZoneState, summarizeZone } from "../apps/web/src/features/site-plan/utils/zone-status.js";
import {
  getActivityFocusAreas,
  getBlankMapClickAction,
  getZoneMapInteraction,
  getVisibleMapAreas,
  getZoneSubtreeActivities,
} from "../apps/web/src/features/site-plan/utils/site-plan-map.js";
import type { PlanActivity } from "../apps/web/src/features/site-plan/types/site-plan.types.js";

const areas = [
  { zone: { id: "1", code: "1", name: "Biomass", parentId: null, sortOrder: 1 } },
  { zone: { id: "2", code: "2", name: "Furnace", parentId: null, sortOrder: 2 } },
  { zone: { id: "2.1", code: "2.1", name: "Boiler", parentId: "2", sortOrder: 3 } },
  { zone: { id: "2.2", code: "2.2", name: "Tank", parentId: "2", sortOrder: 4 } },
];

function activity(id: string, status: PlanActivity["status"], manpower: number): PlanActivity {
  return {
    id,
    projectId: "project",
    workDate: "2026-09-30",
    title: id,
    description: null,
    status,
    manpower,
    progressPercent: 50,
    startTime: null,
    endTime: null,
    zone: { id: "2.1", code: "2.1", name: "Boiler" },
    contractor: { id, code: id, name: id },
  };
}

describe("Site Activity map data", () => {
  it("shows parents in overview and only the focused parent's children", () => {
    expect(getVisibleMapAreas(areas, null).map((area) => area.zone.code)).toEqual(["1", "2"]);
    expect(getVisibleMapAreas(areas, "2").map((area) => area.zone.code)).toEqual(["2.1", "2.2"]);
  });

  it("routes parents to focus and leaf zones to activity inspection", () => {
    const zones = areas.map((area) => area.zone);

    expect(getZoneMapInteraction("2", zones)).toBe("focus");
    expect(getZoneMapInteraction("2.1", zones)).toBe("inspect");
    expect(getZoneMapInteraction("1", zones)).toBe("inspect");
  });

  it("fits mapped children first and falls back to parent geometry only when none are mapped", () => {
    expect(getActivityFocusAreas(areas, "2").map((area) => area.zone.code)).toEqual(["2.1", "2.2"]);
    expect(getActivityFocusAreas(areas, "1").map((area) => area.zone.code)).toEqual(["1"]);
  });

  it("clears a selected child before returning from focused parent to overview", () => {
    expect(getBlankMapClickAction("2.1", "2")).toBe("clear-selection");
    expect(getBlankMapClickAction(null, "2")).toBe("back-to-overview");
    expect(getBlankMapClickAction(null, null)).toBe("none");
    expect(getBlankMapClickAction("1", null)).toBe("clear-selection");
  });

  it("preserves Zone 2's three contractors and 38 workers with attention priority", () => {
    const activities = [
      activity("CTR-001", "active", 18),
      activity("CTR-002", "attention", 8),
      activity("CTR-003", "active", 12),
    ];
    const treeActivities = getZoneSubtreeActivities(
      "2",
      areas.map((area) => area.zone),
      new Map([["2.1", activities]]),
    );
    expect(aggregateZoneState(treeActivities)).toBe("attention");
    expect(summarizeZone(treeActivities)).toEqual({ activityCount: 3, contractorCount: 3, workers: 38 });
  });

  it("uses blocked before attention, active, completed, and idle", () => {
    expect(
      aggregateZoneState([
        activity("completed", "completed", 0),
        activity("active", "active", 0),
        activity("attention", "attention", 0),
        activity("blocked", "blocked", 0),
      ]),
    ).toBe("blocked");
    expect(aggregateZoneState([])).toBe("idle");
  });
});
