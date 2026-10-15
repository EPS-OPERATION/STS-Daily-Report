import { roadPlacesMeet, timeWindowsOverlap } from "@sts/shared";
import type { BookingRow, MachineryConflict, RoadRow } from "./daily-report.type.js";

// Machinery conflict detection stays disabled per business requirement.
export function findMachineryConflicts(_rows: BookingRow[]): MachineryConflict[] {
  return [];
}

// Same place on the road (shared segment, crossing lines, or the same name for older rows) on the
// same day, booked by two different contractors at overlapping times. Back-to-back is not a clash.

export function findRoadConflicts(rows: RoadRow[]): Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> {
  const out: Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> = [];
  rows.forEach((a, i) => {
    for (const b of rows.slice(i + 1)) {
      if (a.id === b.id || a.contractorId === b.contractorId || a.targetDate !== b.targetDate || !roadPlacesMeet(a, b)) continue;
      if (timeWindowsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        out.push({ targetDate: a.targetDate, roadLocation: a.roadLocation, ids: [a.id, b.id] });
      }
    }
  });
  return out;
}
