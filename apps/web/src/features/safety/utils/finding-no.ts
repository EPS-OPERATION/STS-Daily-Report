import { addDays, isoWeekLabel, isoWeekOf, mondayOf } from "@sts/shared";

interface NumberedFinding {
  weekStart: string;
  weekNo: number;
  inspectionDate: string;
}

// Line-walk numbers restart at 1 every ISO week (Mon–Sun), so lists show two columns: Week | No.
// The Week column reads "W43" (with the year, "2026-W53", only when the list spans several ISO years).
export function findingWeekLabel(rows: Pick<NumberedFinding, "weekStart">[]): (f: Pick<NumberedFinding, "weekStart">) => string {
  const years = new Set(rows.map((r) => isoWeekOf(r.weekStart).year));
  return (f) => {
    const { year, week } = isoWeekOf(f.weekStart);
    return `${years.size > 1 ? `${year}-` : ""}W${String(week).padStart(2, "0")}`;
  };
}

// «Week 2026-W43» / «Weeks 2026-W41 – 2026-W43» for the weeks a date range touches (PDF title).
export function weekRangeTitle(from: string, to: string): string {
  return mondayOf(from) === mondayOf(to) ? `Week ${isoWeekLabel(from)}` : `Weeks ${isoWeekLabel(from)} – ${isoWeekLabel(to)}`;
}

// Full label of one finding for titles and prompts: "2026-W43 #3".
export const findingTitle = (f: Pick<NumberedFinding, "weekStart" | "weekNo">) => `${isoWeekLabel(f.weekStart)} #${f.weekNo}`;

// True when the range is exactly one Monday–Sunday week (the unit of the weekly report).
export const isFullWeek = (from: string, to: string) => from === mondayOf(from) && to === addDays(from, 6);

// The week's numbers are not 1..N in inspection-date order (a gap after a delete / date move, or a
// finding entered out of date order) — what «Renumber week» tidies up.
export function weekNeedsRenumber(rows: NumberedFinding[]): boolean {
  const byWeek = new Map<string, NumberedFinding[]>();
  for (const r of rows) byWeek.set(r.weekStart, [...(byWeek.get(r.weekStart) ?? []), r]);
  return [...byWeek.values()].some((list) => {
    const byNo = [...list].sort((a, b) => a.weekNo - b.weekNo);
    return byNo.some((r, i) => r.weekNo !== i + 1 || (i > 0 && byNo[i - 1]!.inspectionDate > r.inspectionDate));
  });
}
