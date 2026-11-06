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

/** Summary card text for OT in Review dialog (e.g. "OT: 28 คน · ถึง 23:00 (168 คน-ชม.)") */
export function overtimeCardText(r: {
  endTime?: string | null;
  otHours?: number | null;
  overtime?: ReportOvertime[];
}): string {
  const rows = r.overtime ?? [];
  if (rows.length === 0) {
    if (!r.otHours || r.otHours <= 0) return "OT: ไม่มี OT";
    const end = formatOtEndTime(r.endTime, r.otHours);
    const endDesc = end ? `ถึง ${end}` : `${r.otHours} ชม.`;
    return `OT: ${endDesc}`;
  }
  const t = overtimeTotals(rows);
  if (t.workers <= 0 && t.manHours <= 0) return "OT: ไม่มี OT";
  const end = formatOtEndTime(r.endTime, t.maxHours);
  const endDesc = end ? `ถึง ${end}` : `${t.maxHours} ชม.`;
  return `OT: ${t.workers} คน · ${endDesc} (${t.manHours} คน-ชม.)`;
}

/** "Boiler · เทคอนกรีต 6 คน × 2 ชม." per OT row. */
export const overtimeLines = (rows: ReportOvertime[] = []) =>
  rows.map((o) => `${o.buildingCode} · ${o.task} ${o.workers} คน × ${o.hours} ชม.`);

/** Calculates end time formatted as "HH:mm" based on base end time (default "17:00") + OT hours */
export function formatOtEndTime(endTimeStr: string | null | undefined, otHours: number): string | null {
  if (otHours <= 0) return null;
  const base = endTimeStr && /^\d{1,2}:\d{2}$/.test(endTimeStr) ? endTimeStr : "17:00";
  const [hh, mm] = base.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const totalMinutes = hh * 60 + mm + Math.round(otHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

// Submission History OT column: itemised OT gives people + hours per person + total man-hours;
// older reports only have hours per person (no people count).
export function overtimeQueueCell(r: {
  endTime?: string | null;
  otHours?: number | null;
  otWorkers?: number | null;
  otManHours?: number | null;
}): { main: string; sub: string | null } | null {
  const hours = r.otHours ?? 0;
  const workers = r.otWorkers ?? 0;
  const manHours = r.otManHours ?? null;
  if (hours <= 0 && workers <= 0 && !(manHours !== null && manHours > 0)) return null;

  const endTimeStr = formatOtEndTime(r.endTime, hours);

  if (workers > 0) {
    const main = endTimeStr ? `${workers} คน (ถึง ${endTimeStr})` : `${workers} คน (${hours} ชม.)`;
    const hoursLabel =
      manHours !== null && Math.round(workers * hours * 10) / 10 !== manHours ? `สูงสุด ${hours} ชม.` : `${hours} ชม.`;
    const sub = manHours !== null && manHours > 0 ? `${hoursLabel} · ${manHours} คน-ชม.` : `${hours} ชม./คน`;
    return { main, sub };
  }

  const main = `ถึง ${endTimeStr ?? `${hours} ชม.`}`;
  const sub = manHours !== null && manHours > 0 ? `${manHours} คน-ชม.` : `${hours} ชม./คน`;
  return { main, sub };
}
