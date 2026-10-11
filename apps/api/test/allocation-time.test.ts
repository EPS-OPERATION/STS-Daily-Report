import { describe, expect, it } from "bun:test";
import { allocationDayShares, allocationPeak } from "@sts/shared";

const day = ["08:00", "17:00"] as const;

describe("Today Activity peak (most people placed at the same moment)", () => {
  it("adds all-day rows together", () => {
    expect(allocationPeak([{ headcount: 6 }, { headcount: 4 }], ...day).placed).toBe(10);
  });

  it("counts a crew that moves at lunch once, not twice", () => {
    const rows = [
      { headcount: 10, startTime: "08:00", endTime: "12:00" },
      { headcount: 10, startTime: "13:00", endTime: "17:00" },
    ];
    expect(allocationPeak(rows, ...day).placed).toBe(10);
  });

  it("finds the overlap where the same people are counted twice", () => {
    const rows = [
      { headcount: 10, startTime: "08:00", endTime: "13:00" },
      { headcount: 10, startTime: "12:00", endTime: "17:00" },
    ];
    expect(allocationPeak(rows, ...day)).toEqual({ placed: 20, from: "12:00", to: "13:00" });
  });

  it("allows part of the crew to be unassigned (peak below the crew is fine)", () => {
    expect(allocationPeak([{ headcount: 6, startTime: "08:00", endTime: "12:00" }], ...day).placed).toBe(6);
  });

  it("is zero with no activities", () => {
    expect(allocationPeak([], ...day).placed).toBe(0);
  });
});

describe("man-day share per row", () => {
  it("is 1 for all-day rows", () => {
    expect(allocationDayShares([{ headcount: 6 }, { headcount: 4 }], ...day)).toEqual([1, 1]);
  });

  it("splits a moved crew by hours worked, ignoring the lunch break", () => {
    const rows = [
      { headcount: 10, startTime: "08:00", endTime: "12:00" },
      { headcount: 10, startTime: "13:00", endTime: "17:00" },
    ];
    expect(allocationDayShares(rows, ...day)).toEqual([0.5, 0.5]);
  });
});

import { dayManpower } from "@sts/shared";

describe("man-day and man-hour (NMH)", () => {
  it("uses the morning crew when no afternoon count was sent", () => {
    expect(dayManpower({ morning: 20, evening: null, workHours: 8, otHours: 0 })).toEqual({ manDays: 20, manHours: 160 });
  });

  it("averages morning and afternoon: two people who left at lunch count as one man-day", () => {
    expect(dayManpower({ morning: 20, evening: 18, workHours: 8, otHours: 0 })).toEqual({ manDays: 19, manHours: 152 });
  });

  it("charges OT to the afternoon crew only", () => {
    // 19 man-days × 8 h + 18 people × 2 h OT
    expect(dayManpower({ morning: 20, evening: 18, workHours: 8, otHours: 2 })).toEqual({ manDays: 19, manHours: 188 });
  });

  it("uses the afternoon crew when only the afternoon report was sent", () => {
    expect(dayManpower({ morning: null, evening: 12, workHours: 8, otHours: 1 })).toEqual({ manDays: 12, manHours: 108 });
  });

  it("is zero when nothing was sent", () => {
    expect(dayManpower({ morning: null, evening: null, workHours: null, otHours: null })).toEqual({ manDays: 0, manHours: 0 });
  });
});
