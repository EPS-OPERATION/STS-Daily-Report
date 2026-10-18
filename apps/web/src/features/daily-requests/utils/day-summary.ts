import type { DailyRequests } from "../types/daily-request.types.js";
import type { InspectionRequest } from "@/features/qaqc/index.js";

export interface DaySummary {
  date: string;
  machines: number;
  equipment: number;
  roads: number;
  clashes: number;
  rfi: number;
}

// Per-day request counts for the range overview (one row per day that has any request).
export function summarizeDays(
  machines: DailyRequests["machinery"],
  equipment: DailyRequests["equipmentRequests"],
  roads: DailyRequests["roads"],
  inspections: InspectionRequest[],
): DaySummary[] {
  const byDay = new Map<string, DaySummary>();
  const at = (date: string) => {
    const found = byDay.get(date) ?? { date, machines: 0, equipment: 0, roads: 0, clashes: 0, rfi: 0 };
    byDay.set(date, found);
    return found;
  };
  for (const m of machines) at(m.targetDate).machines += 1;
  for (const e of equipment) at(e.targetDate).equipment += 1;
  for (const r of roads) {
    const day = at(r.targetDate);
    day.roads += 1;
    if (r.conflict) day.clashes += 1;
  }
  for (const i of inspections) at(i.inspectionDate).rfi += 1;
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
