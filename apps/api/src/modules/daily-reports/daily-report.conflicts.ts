import { timeWindowsOverlap } from "@sts/shared";
import type { BookingRow, MachineryConflict, RoadRow } from "./daily-report.type.js";

// Machinery conflict detection stays disabled per business requirement.
export function findMachineryConflicts(_rows: BookingRow[]): MachineryConflict[] {
  return [];
}

// Same road on the same day — name compared ignoring case and spacing — booked by two different
// contractors at overlapping times. One contractor's own back-to-back bookings are not a clash.
const roadKey = (r: RoadRow) => `${r.targetDate}|${r.roadLocation.trim().toLowerCase().replace(/\s+/g, " ")}`;

export function findRoadConflicts(rows: RoadRow[]): Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> {
  const out: Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> = [];
  rows.forEach((a, i) => {
    for (const b of rows.slice(i + 1)) {
      if (a.id === b.id || a.contractorId === b.contractorId || roadKey(a) !== roadKey(b)) continue;
      if (timeWindowsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        out.push({ targetDate: a.targetDate, roadLocation: a.roadLocation, ids: [a.id, b.id] });
      }
    }
  });
  return out;
}
