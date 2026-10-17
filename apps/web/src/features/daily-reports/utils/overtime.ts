import { overtimeTotals } from "@sts/shared";
import type { ReportOvertime } from "../types/daily-report.types.js";

// One-line OT text for summaries and the printed report. Itemised rows give people and man-hours;
// reports sent before OT was itemised only have hours per person.
export function overtimeSummary(r: { otHours: number | null; overtime?: ReportOvertime[] }): string {
  const rows = r.overtime ?? [];
  if (rows.length === 0) return r.otHours ? `OT ${r.otHours} ชม./คน` : "ไม่มี OT";
  const t = overtimeTotals(rows);
  return `OT ${t.workers} คน · ${t.manHours} คน-ชม.`;
}

/** "Boiler · เทคอนกรีต 6 คน × 2 ชม." per OT row. */
export const overtimeLines = (rows: ReportOvertime[] = []) =>
  rows.map((o) => `${o.buildingCode} · ${o.task} ${o.workers} คน × ${o.hours} ชม.`);
