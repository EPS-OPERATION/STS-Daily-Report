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

// Summary card wording: says what the numbers are (people on OT, and their total man-hours).
export function overtimeCardText(r: { otHours: number | null; overtime?: ReportOvertime[] }): string {
  const rows = r.overtime ?? [];
  if (rows.length === 0) return r.otHours ? `OT สูงสุด ${r.otHours} ชม./คน` : "ไม่มี OT";
  const t = overtimeTotals(rows);
  return `OT ${rows.length} งาน · ${t.workers} คน · ${t.manHours} คน-ชม.`;
}

/** "Boiler · เทคอนกรีต 6 คน × 2 ชม." per OT row. */
export const overtimeLines = (rows: ReportOvertime[] = []) =>
  rows.map((o) => `${o.buildingCode} · ${o.task} ${o.workers} คน × ${o.hours} ชม.`);

// Submission History OT column: itemised OT gives people + hours per person + total man-hours;
// older reports only have hours per person (no people count).
export function overtimeQueueCell(r: {
  otHours?: number | null;
  otWorkers?: number | null;
  otManHours?: number | null;
}): { main: string; sub: string | null } | null {
  const hours = r.otHours ?? 0;
  const workers = r.otWorkers ?? 0;
  const manHours = r.otManHours ?? null;
  if (hours <= 0 && workers <= 0 && !(manHours !== null && manHours > 0)) return null;
  if (manHours !== null && manHours > 0) {
    return {
      main: `${manHours} คน-ชม.`,
      sub: workers > 0 ? `${workers} คน${hours > 0 ? ` · สูงสุด ${hours} ชม./คน` : ""}` : "ไม่ระบุจำนวนคน",
    };
  }
  return { main: `${hours} ชม./คน`, sub: workers > 0 ? `${workers} คน` : "ไม่ระบุจำนวนคน" };
}
