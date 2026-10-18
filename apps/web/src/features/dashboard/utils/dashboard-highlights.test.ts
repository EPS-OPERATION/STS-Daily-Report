import { expect, test } from "bun:test";
import { summarizeDays } from "@/features/daily-requests/utils/day-summary.js";
import { buildHighlights } from "./dashboard-highlights.js";

const road = (id: string, conflict: boolean, code = "A") => ({ id, conflict, contractorCode: code, roadLocation: "Main", startTime: "09:00", endTime: "10:00", purpose: "", targetDate: "2026-03-10" });

test("highlights list road clashes first and only for the selected contractors", () => {
  const requests = { roads: [road("r1", false), road("r2", true), road("r3", true, "B")], permits: [], machinery: [], forecasts: [] };
  const items = buildHighlights({ requests: requests as never, inspections: [], today: "2026-03-10", selectedCodes: new Set(["A"]) });
  expect(items.map((i) => i.id)).toEqual(["road-conflict-r2", "road-r1"]);
  expect(items[0]!.tone).toBe("error");
});

test("no request data means no highlights", () => {
  expect(buildHighlights({ requests: undefined, inspections: [], today: "2026-03-10", selectedCodes: new Set() })).toEqual([]);
});

test("day summary counts per day, flags clashes and sorts by date", () => {
  const days = summarizeDays(
    [{ targetDate: "2026-03-11" }] as never,
    [] as never,
    [{ targetDate: "2026-03-10", conflict: true }, { targetDate: "2026-03-10", conflict: false }] as never,
    [{ inspectionDate: "2026-03-10" }] as never,
  );
  expect(days).toEqual([
    { date: "2026-03-10", machines: 0, equipment: 0, roads: 2, clashes: 1, rfi: 1 },
    { date: "2026-03-11", machines: 1, equipment: 0, roads: 0, clashes: 0, rfi: 0 },
  ]);
});
