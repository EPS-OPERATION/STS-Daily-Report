import { timeWindowsOverlap } from "@sts/shared";
import type { BookingRow, MachineryConflict, RoadRow } from "./daily-report.type.js";

// A booking without a time window occupies the machine for the whole day.
const DAY_START = "00:00";
const DAY_END = "23:59";

function normalizeTag(tag: string | null): string {
  return (tag ?? "").trim().toUpperCase();
}

// Two bookings clash when they share date + machine type and their time windows
// overlap. Same unit tag (or both tagged identically) = "conflict"; if either side
// has no unit tag we cannot tell whether it is the same unit = "possible".
// Different explicit tags never clash.
export function findMachineryConflicts(rows: BookingRow[]): MachineryConflict[] {
  const conflicts: MachineryConflict[] = [];
  const groups = new Map<string, BookingRow[]>();
  for (const r of rows) {
    const key = `${r.targetDate}|${r.machineType}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        const ta = normalizeTag(a.unitTag);
        const tb = normalizeTag(b.unitTag);
        if (ta && tb && ta !== tb) continue;
        if (!timeWindowsOverlap(a.startTime ?? DAY_START, a.endTime ?? DAY_END, b.startTime ?? DAY_START, b.endTime ?? DAY_END)) continue;
        conflicts.push({
          targetDate: a.targetDate,
          machineType: a.machineType,
          unitTag: ta || tb || null,
          severity: ta && tb ? "conflict" : "possible",
          bookingIds: [a.id, b.id],
        });
      }
    }
  }
  return conflicts;
}

// Same road/lane (case/space-insensitive) booked by two requests with overlapping hours.
export function findRoadConflicts(rows: RoadRow[]): Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");
  const out: Array<{ targetDate: string; roadLocation: string; ids: [string, string] }> = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i]!;
      const b = rows[j]!;
      if (a.targetDate !== b.targetDate || norm(a.roadLocation) !== norm(b.roadLocation)) continue;
      if (!timeWindowsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
      out.push({ targetDate: a.targetDate, roadLocation: a.roadLocation, ids: [a.id, b.id] });
    }
  }
  return out;
}
