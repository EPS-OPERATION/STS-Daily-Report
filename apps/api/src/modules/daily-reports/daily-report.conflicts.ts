import { timeWindowsOverlap } from "@sts/shared";
import type { BookingRow, MachineryConflict } from "./daily-report.type.js";

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
    const key = `${r.reportDate}|${r.machineType}`;
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
        if (!timeWindowsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;
        conflicts.push({
          reportDate: a.reportDate,
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
