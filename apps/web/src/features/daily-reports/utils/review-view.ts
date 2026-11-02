import type { Discipline, PositionCode } from "@sts/shared";
import dayjs from "dayjs";
import type { DailyReport, ReportAllocation, Shift } from "../types/daily-report.types.js";

/** One crew of one shift for display: a discipline, or `null` for reports saved before crews were split by discipline. */
export interface CrewView {
  discipline: Discipline | null;
  positions: { position: PositionCode; headcount: number }[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
}

export const crewTotal = (c: CrewView) => c.positions.reduce((s, p) => s + p.headcount, 0);

/** The crews of a shift in discipline order; older reports without per-discipline crews give one combined crew. */
export function crewsOf(r: DailyReport, shift: Shift): CrewView[] {
  const rows = r.crews.filter((c) => c.shift === shift);
  if (rows.length) return rows.map((c) => ({ ...c }));
  if (shift === "morning" && r.positions.length) {
    return [{ discipline: null, positions: r.positions, thaiMale: r.thaiMale, thaiFemale: r.thaiFemale, foreignMale: r.foreignMale, foreignFemale: r.foreignFemale }];
  }
  if (shift === "evening" && r.eveningPositions.length) {
    return [{
      discipline: null, positions: r.eveningPositions, thaiMale: r.eveningThaiMale ?? 0, thaiFemale: r.eveningThaiFemale ?? 0,
      foreignMale: r.eveningForeignMale ?? 0, foreignFemale: r.eveningForeignFemale ?? 0,
    }];
  }
  return [];
}

/** Planned work of a crew's discipline (all of it for a combined crew); the evening's extra work is listed apart. */
export const plannedWork = (r: DailyReport, discipline: Discipline | null): ReportAllocation[] =>
  r.allocations.filter((a) => !a.isAdditional && (discipline === null || a.discipline === discipline));

export const additionalWork = (r: DailyReport): ReportAllocation[] => r.allocations.filter((a) => a.isAdditional);

/** "20 ต.ค. 09:32" style stamp for when a shift was sent / last edited. */
export const stamp = (iso: string | null | undefined) => (iso ? dayjs(iso).format("D MMM HH:mm") : "");
