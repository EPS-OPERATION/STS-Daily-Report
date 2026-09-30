import dayjs from "dayjs";

export const todayIso = () => dayjs().format("YYYY-MM-DD");

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
