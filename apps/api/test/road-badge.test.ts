import { describe, expect, it } from "bun:test";
import { normalizeRoadName, roadBadgeState, roadClashPairs } from "@sts/shared";
import { carryRoadAdjustments, roadSignature, type AdjustedRoadRequest } from "../src/modules/daily-requests/daily-request.road.js";

describe("road badge", () => {
  it("shows the clash until EPS changes the time, then edited (or still clashing)", () => {
    expect(roadBadgeState(false, false)).toBe("none");
    expect(roadBadgeState(true, false)).toBe("clash");
    expect(roadBadgeState(false, true)).toBe("edited");
    expect(roadBadgeState(true, true)).toBe("still_clash");
  });
});

describe("road clash pairs", () => {
  it("reports the shared window of two contractors (ZCE 08-11, LCE 10-12 collide 10-11)", () => {
    const pairs = roadClashPairs([
      { id: "z", contractorId: "ZCE", startTime: "08:00", endTime: "11:00" },
      { id: "l", contractorId: "LCE", startTime: "10:00", endTime: "12:00" },
    ]);
    expect(pairs).toEqual([{ a: "z", b: "l", start: "10:00", end: "11:00" }]);
  });

  it("ignores one contractor's own bookings and back-to-back windows", () => {
    expect(roadClashPairs([
      { id: "a", contractorId: "ZCE", startTime: "08:00", endTime: "11:00" },
      { id: "b", contractorId: "ZCE", startTime: "09:00", endTime: "12:00" },
    ])).toHaveLength(0);
    expect(roadClashPairs([
      { id: "a", contractorId: "ZCE", startTime: "08:00", endTime: "10:00" },
      { id: "b", contractorId: "LCE", startTime: "10:00", endTime: "12:00" },
    ])).toHaveLength(0);
  });
});

describe("road name", () => {
  it("ignores case and spacing, so the same road matches", () => {
    expect(normalizeRoadName("  Road   R2 ")).toBe("road r2");
  });
});

describe("EPS time change across contractor resubmission", () => {
  const boiler = "bld-1";
  const adjusted: AdjustedRoadRequest = {
    buildingId: boiler,
    roadLocation: "Road R2 (Boiler–ACC)",
    startTime: "08:00",
    endTime: "11:00",
    adjustedStartTime: "08:00",
    adjustedEndTime: "10:00",
    adjustedBy: "eps-user",
    adjustedAt: new Date("2026-11-02T10:00:00Z"),
  };

  it("keeps the change when the same request comes back (purpose or spacing may differ)", () => {
    const [carried] = carryRoadAdjustments([adjusted], [
      { buildingId: boiler, roadLocation: "road  r2 (boiler–acc)", startTime: "08:00", endTime: "11:00" },
    ]);
    expect(carried?.adjustedEndTime).toBe("10:00");
    expect(carried?.adjustedBy).toBe("eps-user");
  });

  it("drops the change when the contractor moves the request", () => {
    const [carried] = carryRoadAdjustments([adjusted], [
      { buildingId: boiler, roadLocation: "Road R2 (Boiler–ACC)", startTime: "09:00", endTime: "11:00" },
    ]);
    expect(carried).toBeNull();
  });

  it("matches identical requests in order, so each keeps its own change", () => {
    const second: AdjustedRoadRequest = { ...adjusted, adjustedEndTime: "11:00", adjustedBy: "other" };
    const carried = carryRoadAdjustments([adjusted, second], [
      { buildingId: boiler, roadLocation: "Road R2 (Boiler–ACC)", startTime: "08:00", endTime: "11:00" },
      { buildingId: boiler, roadLocation: "Road R2 (Boiler–ACC)", startTime: "08:00", endTime: "11:00" },
      { buildingId: boiler, roadLocation: "Road R2 (Boiler–ACC)", startTime: "08:00", endTime: "11:00" },
    ]);
    expect(carried.map((c) => c?.adjustedBy)).toEqual(["eps-user", "other", undefined]);
  });

  it("builds the same signature for equivalent requests", () => {
    expect(roadSignature({ buildingId: boiler, roadLocation: " R2 ", startTime: "08:00", endTime: "11:00" }))
      .toBe(roadSignature({ buildingId: boiler, roadLocation: "r2", startTime: "08:00", endTime: "11:00" }));
  });
});
