import { DISCIPLINES, DISCIPLINE_CODES, SITE_EQUIPMENT_TYPES, type Discipline, type WeatherCondition } from "@sts/shared";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { type ComponentType } from "react";
import { type StandardItem } from "@/features/report-standard-items/index.js";
import { type ActivityValues, type MorningFormValues } from "../schemas/daily-report.schema.js";
import type { DailyReport } from "../types/daily-report.types.js";
import { emptyPositions } from "./crew-manpower.js";
import AirOutlinedIcon from "@mui/icons-material/AirOutlined";
import FilterDramaOutlinedIcon from "@mui/icons-material/FilterDramaOutlined";
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import UmbrellaOutlinedIcon from "@mui/icons-material/UmbrellaOutlined";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";

export type CrewValues = MorningFormValues["crews"][Discipline];

export const WEATHER_ICONS: Record<WeatherCondition, ComponentType<SvgIconProps>> = {
  thunderstorm: ThunderstormOutlinedIcon,
  rain: UmbrellaOutlinedIcon,
  hot: WbSunnyOutlinedIcon,
  windy: AirOutlinedIcon,
  normal: FilterDramaOutlinedIcon,
};

// Fixed suggestion list (first 7 shown, rest behind "show more"). Contractors may
// add custom names beyond this list — those ride the same record under their own key.
export const EQUIPMENT_ITEMS = SITE_EQUIPMENT_TYPES.map((e, i) => ({ key: e, label: e, primary: i < 7 }));

export const emptyCounts = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export const disciplineLabel = (d: Discipline) => DISCIPLINES.find((x) => x.code === d)?.label ?? d;

// Normal working hours from the shift window, minus a 1 h lunch break for full days.
export function hoursBetween(start: string, end: string): number {
  const [sh = 0, sm = 0] = start.split(":").map(Number);
  const [eh = 0, em = 0] = end.split(":").map(Number);
  const diff = (eh * 60 + em - (sh * 60 + sm)) / 60;
  if (diff <= 0) return 0;
  return Math.round((diff > 5 ? diff - 1 : diff) * 2) / 2;
}

export function crewDefaults(report: DailyReport | null, d: Discipline, copied = false): CrewValues {
  const crew = report?.crews.find((c) => c.shift === "morning" && c.discipline === d);
  return {
    positions: {
      ...emptyPositions(),
      ...Object.fromEntries((crew?.positions ?? []).map((p) => [p.position, p.headcount])),
    },
    thaiMale: crew?.thaiMale ?? 0,
    thaiFemale: crew?.thaiFemale ?? 0,
    foreignMale: crew?.foreignMale ?? 0,
    foreignFemale: crew?.foreignFemale ?? 0,
    allocations: (report?.allocations ?? [])
      .filter((a) => a.discipline === d)
      .map((a) => ({
        buildingId: a.buildingId,
        headcount: a.headcount,
        workDescription: a.workDescription,
        // A copy keeps who works where; times and plan % are set again for today.
        timed: !copied && Boolean(a.startTime && a.endTime),
        startTime: (!copied && a.startTime) || "08:00",
        endTime: (!copied && a.endTime) || "12:00",
        hasPlan: !copied && a.planPercent !== null,
        planPercent: copied ? 0 : (a.planPercent ?? 0),
      })),
  };
}

export function toDefaults(report: DailyReport | null): MorningFormValues {
  const reported = DISCIPLINE_CODES.filter((d) => report?.crews.some((c) => c.shift === "morning" && c.discipline === d));
  return {
    startTime: report?.startTime ?? "08:00",
    endTime: report?.endTime ?? "17:00",
    workHours: report?.workHours ?? 8,
    disciplines: reported,
    weather: (report?.weather ?? "") as WeatherCondition,
    temperatureC: report?.temperatureC ?? null,
    humidityPct: report?.humidityPct ?? null,
    equipment: {
      ...emptyCounts(SITE_EQUIPMENT_TYPES),
      ...Object.fromEntries((report?.equipment ?? []).map((e) => [e.equipmentType, e.qty])),
    } as Record<string, number>,
    crews: { CE: crewDefaults(report, "CE"), ME: crewDefaults(report, "ME"), EE: crewDefaults(report, "EE") },
    permits: (report?.permits ?? []).map((p) => ({
      permitType: p.permitType,
      otherLabel: p.otherLabel ?? "",
      buildingId: p.buildingId,
      workers: p.workers,
      highRisk: p.highRisk ?? false,
      taskName: p.taskName ?? "",
      supervisorName: p.supervisorName ?? "",
      photoKey: p.photoKey ?? crypto.randomUUID(),
    })),
  };
}

export const newActivity = (headcount: number): ActivityValues => ({
  buildingId: "",
  headcount,
  workDescription: "",
  timed: false,
  startTime: "08:00",
  endTime: "12:00",
  hasPlan: false,
  planPercent: 0,
});

// A saved work item becomes one Today Activity row: where, what and how many. Times and plan % are set per day.
export const activityFromStandard = (i: StandardItem): ActivityValues => ({
  ...newActivity(i.defaultCount),
  buildingId: i.buildingId ?? "",
  workDescription: i.label,
});
