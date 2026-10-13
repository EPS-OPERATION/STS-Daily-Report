import { describe, expect, it } from "bun:test";
import { findRoadConflicts } from "../src/modules/daily-reports/daily-report.conflicts.js";
import type { RoadRow } from "../src/modules/daily-reports/daily-report.type.js";

const road = (id: string, contractorId: string, roadLocation: string, startTime: string, endTime: string, targetDate = "2026-10-02"): RoadRow => ({
  id, targetDate, buildingId: "b", buildingCode: "B", buildingName: "B", roadLocation, startTime, endTime, requestedStartTime: startTime, requestedEndTime: endTime, adjusted: false, adjustedAt: null, adjustedByName: null, purpose: "x", contractorId, contractorCode: contractorId,
});

describe("road usage clash", () => {
  it("flags two contractors on the same road at overlapping times", () => {
    const c = findRoadConflicts([road("a", "ZCE", "Road R2 (Boiler–ACC)", "08:00", "11:00"), road("b", "LCE", "Road R2 (Boiler–ACC)", "10:00", "13:00")]);
    expect(c.map((x) => x.ids)).toEqual([["a", "b"]]);
  });

  it("ignores case and extra spaces in the road name", () => {
    expect(findRoadConflicts([road("a", "ZCE", "road  r2", "08:00", "11:00"), road("b", "LCE", "Road R2 ", "09:00", "10:00")])).toHaveLength(1);
  });

  it("does not flag back-to-back bookings (end = next start)", () => {
    expect(findRoadConflicts([road("a", "ZCE", "R2", "08:00", "10:00"), road("b", "LCE", "R2", "10:00", "12:00")])).toHaveLength(0);
  });

  it("does not flag one contractor's own bookings, other roads or other days", () => {
    expect(findRoadConflicts([road("a", "ZCE", "R2", "08:00", "11:00"), road("b", "ZCE", "R2", "09:00", "12:00")])).toHaveLength(0);
    expect(findRoadConflicts([road("a", "ZCE", "R2", "08:00", "11:00"), road("b", "LCE", "R3", "09:00", "12:00")])).toHaveLength(0);
    expect(findRoadConflicts([road("a", "ZCE", "R2", "08:00", "11:00"), road("b", "LCE", "R2", "09:00", "12:00", "2026-10-03")])).toHaveLength(0);
  });
});
