import { dayManpower } from "./allocation-time.js";

export const round1 = (n: number) => Math.round(n * 10) / 10;

// Normal hours per person for NMH when only the afternoon report was sent (it does not ask for hours):
// the site day 08:00–17:00. Such days are flagged as estimated where totals are shown.
export const STANDARD_WORK_HOURS = 8;

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Monday of the ISO week containing isoDate (calendar math in UTC, no TZ shift).
export function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(isoDate, -dow);
}

// ISO 8601 week of isoDate (Mon–Sun; week 1 holds the year's first Thursday). `year` can differ from the
// calendar year around New Year, e.g. 2026-12-31 → 2026-W53, 2027-01-01 → 2026-W53.
export function isoWeekOf(isoDate: string): { year: number; week: number } {
  const thursday = new Date(`${addDays(mondayOf(isoDate), 3)}T00:00:00Z`);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((thursday.getTime() - jan1) / 86_400_000);
  return { year, week: Math.floor(dayOfYear / 7) + 1 };
}

// "2026-W43" — label for the ISO week containing isoDate.
export function isoWeekLabel(isoDate: string): string {
  const { year, week } = isoWeekOf(isoDate);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// Man-day / NMH of one contractor-day from whichever halves were sent (rule in dayManpower).
export function attendanceOf(r: {
  morningStatus: string;
  eveningStatus: string;
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  eveningThaiMale: number | null;
  eveningThaiFemale: number | null;
  eveningForeignMale: number | null;
  eveningForeignFemale: number | null;
  workHours: number | null;
  otHours: number | null;
  otManHours?: number | null;
}) {
  const morning = r.morningStatus === "submitted" ? r.thaiMale + r.thaiFemale + r.foreignMale + r.foreignFemale : null;
  const evening =
    r.eveningStatus === "submitted" && r.eveningThaiMale !== null
      ? r.eveningThaiMale + (r.eveningThaiFemale ?? 0) + (r.eveningForeignMale ?? 0) + (r.eveningForeignFemale ?? 0)
      : null;
  const workHours = r.workHours ?? (morning === null && evening !== null ? STANDARD_WORK_HOURS : null);
  return dayManpower({ morning, evening, workHours, otHours: r.otHours, otManHours: r.otManHours });
}
