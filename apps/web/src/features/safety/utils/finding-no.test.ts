import { expect, test } from "bun:test";
import { findingTitle, findingWeekLabel, isFullWeek, weekNeedsRenumber, weekRangeTitle } from "./finding-no.js";

const f = (weekStart: string, weekNo: number, inspectionDate = weekStart) => ({ weekStart, weekNo, inspectionDate });

test("the Week column reads W43", () => {
  const label = findingWeekLabel([f("2026-10-12", 3), f("2026-10-19", 1)]);
  expect(label(f("2026-10-12", 3))).toBe("W42");
  expect(label(f("2026-10-19", 1))).toBe("W43");
});

test("the year is added only when the list spans ISO years", () => {
  const label = findingWeekLabel([f("2026-12-28", 1), f("2027-01-04", 1)]);
  expect(label(f("2026-12-28", 1))).toBe("2026-W53");
  expect(label(f("2027-01-04", 1))).toBe("2027-W01");
});

test("findingTitle uses the ISO week label", () => {
  expect(findingTitle(f("2026-10-19", 3))).toBe("2026-W43 #3");
});

test("weekRangeTitle names one week or the span of weeks", () => {
  expect(weekRangeTitle("2026-10-19", "2026-10-25")).toBe("Week 2026-W43");
  expect(weekRangeTitle("2026-10-21", "2026-10-23")).toBe("Week 2026-W43");
  expect(weekRangeTitle("2026-10-05", "2026-10-25")).toBe("Weeks 2026-W41 – 2026-W43");
});

test("isFullWeek is true only for Monday–Sunday", () => {
  expect(isFullWeek("2026-10-19", "2026-10-25")).toBe(true);
  expect(isFullWeek("2026-10-20", "2026-10-26")).toBe(false);
  expect(isFullWeek("2026-10-19", "2026-10-23")).toBe(false);
});

test("renumber is needed after a gap or when numbers are out of date order", () => {
  expect(weekNeedsRenumber([f("2026-10-19", 1, "2026-10-19"), f("2026-10-19", 2, "2026-10-21")])).toBe(false);
  expect(weekNeedsRenumber([f("2026-10-19", 1), f("2026-10-19", 3, "2026-10-21")])).toBe(true); // gap
  expect(weekNeedsRenumber([f("2026-10-19", 1, "2026-10-22"), f("2026-10-19", 2, "2026-10-20")])).toBe(true); // out of order
  expect(weekNeedsRenumber([])).toBe(false);
});
