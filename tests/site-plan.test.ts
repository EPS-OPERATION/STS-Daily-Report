import { describe, expect, it } from "bun:test";
import {
  aggregateZoneState,
  sortActivitiesByPriority,
  summarizeZone,
} from "../apps/web/src/features/site-maps/helpers/zone-status.js";
import {
  getBlankMapClickAction,
  getZoneMapInteraction,
  getZoneSubtreeActivities,
} from "../apps/web/src/features/site-maps/helpers/site-plan-map.js";
import type { PlanActivity } from "../apps/web/src/features/site-maps/types/site-plan.types.js";

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
    zonePart: null,
    contractor: { id, code: id, name: id },
  };
}

describe("Site Activity map data", () => {
  it("routes parents to focus and leaf zones to activity inspection", () => {
    const zones = areas.map((area) => area.zone);

    expect(getZoneMapInteraction("2", zones)).toBe("focus");
    expect(getZoneMapInteraction("2.1", zones)).toBe("inspect");
    expect(getZoneMapInteraction("1", zones)).toBe("inspect");
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

  it("sorts facility activities by urgency, then start time", () => {
    const activities = [
      { ...activity("late-active", "active", 0), startTime: "13:00" },
      { ...activity("completed", "completed", 0), startTime: "08:00" },
      { ...activity("attention", "attention", 0), startTime: "10:00" },
      { ...activity("blocked", "blocked", 0), startTime: "14:00" },
      { ...activity("early-active", "active", 0), startTime: "09:00" },
    ];
    expect(sortActivitiesByPriority(activities).map((item) => item.id)).toEqual([
      "blocked",
      "attention",
      "early-active",
      "late-active",
      "completed",
    ]);
  });
});
