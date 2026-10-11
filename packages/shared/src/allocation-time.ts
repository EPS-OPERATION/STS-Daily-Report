import { timeToMinutes } from "./daily-report.js";

// Today Activity rows: people placed in a building, all day (no times) or for an optional
// HH:mm window — crews that move building between morning and afternoon split one person
// over several rows. Shared by the web form and the API so both apply the same rule.
export interface TimedActivity {
  headcount: number;
  startTime?: string | null;
  endTime?: string | null;
}

export interface PlacementPeak {
  /** Most people placed at the same moment. */
  placed: number;
  from: string;
  to: string;
}

const toHhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

function windowOf(row: TimedActivity, dayStart: number, dayEnd: number): [number, number] {
  return row.startTime && row.endTime ? [timeToMinutes(row.startTime), timeToMinutes(row.endTime)] : [dayStart, dayEnd];
}

// Splits the working day at every row boundary and counts people placed in each slice.
function slices(rows: TimedActivity[], dayStartHhmm: string, dayEndHhmm: string) {
  const dayStart = timeToMinutes(dayStartHhmm);
  const dayEnd = timeToMinutes(dayEndHhmm);
  const windows = rows.map((r) => windowOf(r, dayStart, dayEnd));
  // Rows outside the shift (e.g. OT after 17:00) widen the day instead of being ignored.
  const edges = [...new Set([dayStart, dayEnd, ...windows.flat()])].sort((a, b) => a - b);
  const out: { from: number; to: number; placed: number; rows: number[] }[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i]!;
    const to = edges[i + 1]!;
    const inSlice = windows.flatMap(([s, e], idx) => (s <= from && e >= to ? [idx] : []));
    out.push({ from, to, placed: inSlice.reduce((sum, idx) => sum + rows[idx]!.headcount, 0), rows: inSlice });
  }
  return out;
}

// The most people placed at the same moment. Only more than the crew is impossible (one person
// cannot be in two buildings at once); fewer is fine — not everyone has to be assigned and
// activities need not cover the whole day.
export function allocationPeak(rows: TimedActivity[], dayStart: string, dayEnd: string): PlacementPeak {
  const top = slices(rows, dayStart, dayEnd).reduce<{ from: number; to: number; placed: number } | null>(
    (best, p) => (best === null || p.placed > best.placed ? p : best),
    null,
  );
  return top ? { placed: top.placed, from: toHhmm(top.from), to: toHhmm(top.to) } : { placed: 0, from: dayStart, to: dayEnd };
}

// Share of the crew's working time each row represents (0..1), so a building's man-days count
// only the hours people were there. Breaks (nobody placed) do not count as working time.
export function allocationDayShares(rows: TimedActivity[], dayStart: string, dayEnd: string): number[] {
  const parts = slices(rows, dayStart, dayEnd).filter((p) => p.placed > 0);
  const worked = parts.reduce((sum, p) => sum + (p.to - p.from), 0);
  if (worked === 0) return rows.map(() => 1);
  return rows.map((_, idx) => {
    const minutes = parts.filter((p) => p.rows.includes(idx)).reduce((sum, p) => sum + (p.to - p.from), 0);
    return Math.round((minutes / worked) * 1000) / 1000;
  });
}

// ---- man-day / man-hour (NMH) ---------------------------------------------------

export interface DayAttendance {
  /** People in the morning report; null when no morning report was sent. */
  morning: number | null;
  /** People in the afternoon report; null when no afternoon report was sent. */
  evening: number | null;
  /** Normal working hours per person (excl. OT). */
  workHours: number | null;
  /** OT hours per person — worked after the afternoon, so by the afternoon crew. */
  otHours: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Man-day = average attendance of the two halves of the day: someone who leaves at lunch or
// arrives after it counts ½. With only one half reported, that half stands for the day.
// NMH = man-days × normal hours + afternoon crew × OT hours.
export function dayManpower(a: DayAttendance): { manDays: number; manHours: number } {
  const manDays = a.morning !== null && a.evening !== null ? (a.morning + a.evening) / 2 : (a.morning ?? a.evening ?? 0);
  const otCrew = a.evening ?? a.morning ?? 0;
  return {
    manDays: round1(manDays),
    manHours: round1(manDays * (a.workHours ?? 0) + otCrew * (a.otHours ?? 0)),
  };
}
