import { DISCIPLINES, type Discipline } from "@sts/shared";
import { type EveningFormValues } from "../schemas/daily-report.schema.js";
import type { DailyReport } from "../types/daily-report.types.js";
import { type SectionMap } from "../utils/form-sections.js";
import { emptyPositions } from "./crew-manpower.js";

export type EveningCrew = EveningFormValues["crews"][Discipline];

export const disciplineLabel = (d: Discipline) => DISCIPLINES.find((x) => x.code === d)?.label ?? d;

// Afternoon crew of one discipline: the saved evening values, else the morning crew to edit.
export function crewDefaults(report: DailyReport | null, d: Discipline): EveningCrew {
  const crew =
    report?.crews.find((c) => c.shift === "evening" && c.discipline === d) ??
    report?.crews.find((c) => c.shift === "morning" && c.discipline === d);
  return {
    positions: {
      ...emptyPositions(),
      ...Object.fromEntries((crew?.positions ?? []).map((p) => [p.position, p.headcount])),
    },
    thaiMale: crew?.thaiMale ?? 0,
    thaiFemale: crew?.thaiFemale ?? 0,
    foreignMale: crew?.foreignMale ?? 0,
    foreignFemale: crew?.foreignFemale ?? 0,
  };
}

// Evening Daily Request (tomorrow's plan and requests). Independent of the morning shift: without a morning report there
// is simply no plan to report actuals against. Also where tomorrow's requests are made.
// Sections in screen order with the fields each one holds (first one with an error gets the scroll).
export const SECTIONS: SectionMap = [
  ["sec-safety", ["accidentOccurred", "accidentNote", "accidentCategory"]],
  ["sec-ot", ["overtime"]],
  ["sec-crew", ["disciplines", "crews"]],
  ["sec-progress", ["progress"]],
  ["sec-tomorrow", ["forecasts", "machinery", "equipmentRequests", "permits", "roadUsage", "materials"]],
  ["sec-sign", ["signatureName", "signatureData"]],
];
