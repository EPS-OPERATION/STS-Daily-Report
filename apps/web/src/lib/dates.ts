import dayjs from "dayjs";

type DateLike = Parameters<typeof dayjs>[0];

// One place for the formats the app prints; no argument = now.
export const toIsoDate = (d?: DateLike) => dayjs(d).format("YYYY-MM-DD");
export const clockTime = (d?: DateLike) => dayjs(d).format("HH:mm");
export const shortDate = (d?: DateLike) => dayjs(d).format("D MMM YYYY");

export const todayIso = () => toIsoDate();

// Monday of the week containing `iso` (Mon–Sun weeks, local calendar).
export function mondayOf(iso: string): string {
  const d = dayjs(iso);
  const offset = (d.day() + 6) % 7;
  return d.subtract(offset, "day").format("YYYY-MM-DD");
}

export function addDaysIso(iso: string, days: number): string {
  return dayjs(iso).add(days, "day").format("YYYY-MM-DD");
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// Thai display with Buddhist-era year: 2026-09-30 → "30 ก.ย. 2569". Storage stays ISO/CE.
export function formatThaiDate(iso: string): string {
  const d = dayjs(iso);
  return `${d.date()} ${TH_MONTHS[d.month()]} ${d.year() + 543}`;
}

// Machine bookings may have no window (= all day).
export function timeWindowLabel(start: string | null, end: string | null): string {
  return start && end ? `${start}–${end}` : "ทั้งวัน";
}
