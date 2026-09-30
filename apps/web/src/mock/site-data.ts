// Realistic mock construction data for reference screens.
// Used only where backend data is unavailable; backend remains source of truth
// for contractors (features/contractors calls the real API).

export type ZoneStatus = "active" | "attention" | "blocked" | "idle";

export interface ZoneActivity {
  contractor: string;
  activity: string;
  workers: number;
  progress: number;
  permit?: string;
}

export interface Zone {
  id: string;
  no: string;
  name: string;
  short: string;
  status: ZoneStatus;
  contractorsToday: number;
  workersToday: number;
  today: ZoneActivity[];
  tomorrow: string[];
  // schematic polygon coordinates in a 640x420 viewBox
  polygon: string;
  labelX: number;
  labelY: number;
}

export const ZONES: Zone[] = [
  {
    id: "biomass",
    no: "1",
    name: "Biomass Storage / Transport",
    short: "Biomass",
    status: "active",
    contractorsToday: 2,
    workersToday: 46,
    today: [
      {
        contractor: "ABC Construction",
        activity: "Fuel yard grading",
        workers: 28,
        progress: 72,
        permit: "General Work",
      },
      { contractor: "STS Service", activity: "Conveyor foundation", workers: 18, progress: 55 },
    ],
    tomorrow: ["Fuel yard compaction", "Drainage channel excavation"],
    polygon: "40,60 220,40 250,150 90,180",
    labelX: 140,
    labelY: 115,
  },
  {
    id: "boiler",
    no: "2",
    name: "Furnace & Boiler",
    short: "Boiler",
    status: "active",
    contractorsToday: 2,
    workersToday: 50,
    today: [
      {
        contractor: "ABC Construction",
        activity: "Boiler structure installation",
        workers: 32,
        progress: 65,
        permit: "Work at Height",
      },
      { contractor: "L-Tap", activity: "Electrical installation", workers: 18, progress: 40 },
    ],
    tomorrow: [
      "Boiler structure installation (cont.)",
      "Cable tray installation + QAQC inspection",
      "Scaffold modification",
    ],
    polygon: "280,60 460,50 470,170 290,180",
    labelX: 375,
    labelY: 118,
  },
  {
    id: "turbine",
    no: "3",
    name: "Turbine Generator",
    short: "Turbine",
    status: "attention",
    contractorsToday: 2,
    workersToday: 30,
    today: [
      { contractor: "L-Tap", activity: "Cable tray installation", workers: 18, progress: 52 },
      {
        contractor: "XYZ Engineering",
        activity: "Pedestal concrete curing check",
        workers: 12,
        progress: 80,
        permit: "Hot Work",
      },
    ],
    tomorrow: ["Turbine hall steel delivery", "QAQC pedestal inspection"],
    polygon: "60,210 250,200 260,330 70,340",
    labelX: 160,
    labelY: 272,
  },
  {
    id: "wtt",
    no: "4",
    name: "Flue Gas Treatment / Stack",
    short: "WTT",
    status: "blocked",
    contractorsToday: 1,
    workersToday: 24,
    today: [
      {
        contractor: "XYZ Engineering",
        activity: "Concrete pour in progress",
        workers: 24,
        progress: 35,
        permit: "High Risk: Heavy Lift",
      },
    ],
    tomorrow: ["Concrete pour (cont.) 08:00-18:00", "Safety re-assessment"],
    polygon: "290,210 470,205 480,330 300,340",
    labelX: 385,
    labelY: 272,
  },
  {
    id: "electrical",
    no: "5",
    name: "Air Cooled Condenser",
    short: "Electrical",
    status: "idle",
    contractorsToday: 0,
    workersToday: 0,
    today: [],
    tomorrow: [],
    polygon: "500,60 610,60 610,180 500,180",
    labelX: 555,
    labelY: 118,
  },
  {
    id: "utility",
    no: "6",
    name: "Water Treatment / Utilities",
    short: "Utility",
    status: "idle",
    contractorsToday: 1,
    workersToday: 12,
    today: [{ contractor: "STS Service", activity: "Pipe trench backfill", workers: 12, progress: 60 }],
    tomorrow: ["Concrete pour Zone 6 (inspection required)"],
    polygon: "500,210 610,210 610,340 500,340",
    labelX: 555,
    labelY: 272,
  },
];

export type ReportStatus = "Draft" | "Submitted" | "Pending" | "Reviewed" | "Approved" | "Rejected";

export interface DailyReportRow {
  id: string;
  date: string;
  contractor: string;
  zone: string;
  manpower: number;
  qaqc: number;
  progress: number;
  status: ReportStatus;
}

export const DAILY_REPORTS: DailyReportRow[] = [
  {
    id: "r1",
    date: "28 Sep 2026",
    contractor: "ABC Construction",
    zone: "Boiler",
    manpower: 32,
    qaqc: 4,
    progress: 53,
    status: "Submitted",
  },
  {
    id: "r2",
    date: "28 Sep 2026",
    contractor: "L-Tap",
    zone: "Turbine",
    manpower: 18,
    qaqc: 2,
    progress: 32,
    status: "Pending",
  },
  {
    id: "r3",
    date: "28 Sep 2026",
    contractor: "XYZ Engineering",
    zone: "WTT",
    manpower: 24,
    qaqc: 1,
    progress: 48,
    status: "Reviewed",
  },
  {
    id: "r4",
    date: "28 Sep 2026",
    contractor: "STS Service",
    zone: "Electrical",
    manpower: 16,
    qaqc: 0,
    progress: 22,
    status: "Draft",
  },
  {
    id: "r5",
    date: "27 Sep 2026",
    contractor: "ABC Construction",
    zone: "Utility",
    manpower: 28,
    qaqc: 3,
    progress: 55,
    status: "Submitted",
  },
  {
    id: "r6",
    date: "27 Sep 2026",
    contractor: "L-Tap",
    zone: "Boiler",
    manpower: 20,
    qaqc: 1,
    progress: 41,
    status: "Approved",
  },
  {
    id: "r7",
    date: "27 Sep 2026",
    contractor: "XYZ Engineering",
    zone: "Turbine",
    manpower: 22,
    qaqc: 2,
    progress: 35,
    status: "Pending",
  },
  {
    id: "r8",
    date: "27 Sep 2026",
    contractor: "ABC Construction",
    zone: "Biomass",
    manpower: 30,
    qaqc: 2,
    progress: 61,
    status: "Approved",
  },
  {
    id: "r9",
    date: "26 Sep 2026",
    contractor: "STS Service",
    zone: "Utility",
    manpower: 14,
    qaqc: 1,
    progress: 28,
    status: "Rejected",
  },
  {
    id: "r10",
    date: "26 Sep 2026",
    contractor: "L-Tap",
    zone: "Electrical",
    manpower: 12,
    qaqc: 0,
    progress: 18,
    status: "Reviewed",
  },
];

export interface KpiSet {
  manpower: { value: number; delta: string; spark: number[] };
  contractors: { value: number; sub: string; spark: number[] };
  permits: { value: number; sub: string; spark: number[] };
  qaqc: { value: number; sub: string; spark: number[] };
}

export const KPI_BY_RANGE: Record<"today" | "week" | "month", KpiSet> = {
  today: {
    manpower: { value: 286, delta: "+14 vs yesterday", spark: [240, 252, 248, 261, 258, 272, 286] },
    contractors: { value: 12, sub: "active on site", spark: [9, 10, 10, 11, 11, 12, 12] },
    permits: { value: 18, sub: "3 high risk", spark: [12, 14, 13, 15, 16, 17, 18] },
    qaqc: { value: 7, sub: "2 overdue", spark: [4, 5, 6, 5, 6, 7, 7] },
  },
  week: {
    manpower: { value: 1640, delta: "+86 vs last week", spark: [220, 240, 260, 250, 270, 280, 320] },
    contractors: { value: 14, sub: "worked this week", spark: [10, 11, 12, 12, 13, 14, 14] },
    permits: { value: 64, sub: "9 high risk", spark: [8, 10, 9, 11, 12, 12, 12] },
    qaqc: { value: 31, sub: "5 overdue", spark: [3, 4, 5, 4, 5, 5, 5] },
  },
  month: {
    manpower: { value: 6820, delta: "+410 vs last month", spark: [200, 220, 240, 260, 280, 300, 340] },
    contractors: { value: 16, sub: "engaged this month", spark: [11, 12, 13, 14, 15, 15, 16] },
    permits: { value: 240, sub: "32 high risk", spark: [30, 32, 34, 33, 36, 38, 37] },
    qaqc: { value: 118, sub: "11 overdue", spark: [12, 14, 15, 16, 17, 17, 17] },
  },
};

export interface Highlight {
  id: string;
  tone: "error" | "info" | "warning" | "success";
  title: string;
  lines: string[];
}

export const HIGHLIGHTS: Highlight[] = [
  { id: "h1", tone: "error", title: "Zone 4 - WTT", lines: ["Concrete pour in progress", "08:00 - 18:00"] },
  { id: "h2", tone: "info", title: "Zone 2.1 - Boiler", lines: ["Structure installation", "32 workers"] },
  { id: "h3", tone: "warning", title: "QAQC Inspection", lines: ["3 inspections today", "1 overdue"] },
  { id: "h4", tone: "error", title: "Work Permit", lines: ["3 high risk activities", "5 pending approval"] },
];

export interface TomorrowItem {
  time: string;
  title: string;
  zone: string;
  contractor: string;
  meta: string;
}

export const TOMORROW_PLAN: TomorrowItem[] = [
  {
    time: "08:00",
    title: "Boiler Structure Installation",
    zone: "Zone 2.1",
    contractor: "ABC Construction",
    meta: "18 workers",
  },
  { time: "10:30", title: "Cable Tray Installation", zone: "Zone 4", contractor: "L-Tap", meta: "QAQC inspection" },
  {
    time: "13:00",
    title: "Concrete Pour",
    zone: "Zone 6",
    contractor: "XYZ Construction",
    meta: "Inspection required",
  },
];

export const CONTRACTOR_OPTIONS = ["ABC Construction", "L-Tap", "XYZ Engineering", "STS Service"];
export const ZONE_OPTIONS = ZONES.map((z) => `Zone ${z.no} - ${z.name}`);
