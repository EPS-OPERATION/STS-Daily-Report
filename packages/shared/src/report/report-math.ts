import { dayManpower } from "./allocation-time.js";

export const round1 = (n: number) => Math.round(n * 10) / 10;

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
  return dayManpower({ morning, evening, workHours: r.workHours, otHours: r.otHours, otManHours: r.otManHours });
}
