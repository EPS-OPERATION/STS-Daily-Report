import type { BookingRow, MachineryConflict, RoadRow } from "./daily-report.type.js";

// Rule base for conflict detection has been disabled per user/business requirement.
// Requests for machinery and road usage are no longer flagged or marked as conflicting.
export function findMachineryConflicts(_rows: BookingRow[]): MachineryConflict[] {
  return [];
}

export function findRoadConflicts(_rows: RoadRow[]): Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> {
  return [];
}
