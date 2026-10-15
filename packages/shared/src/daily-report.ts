import { routeDistance, type CoordinationPoint } from "./coordination.js";
// Contractor daily report vocabulary shared by api (validation) and web (forms/labels).
// Framework-free: plain consts + helpers only.

// 15 facilities in the order EPS uses on site (requirements deck v2, Oct 2026). Used for
// allocation instead of WBS codes. `code` is stable and stored in the database.
// Biomass Storage (BMS) was dropped from the list; the seed marks it inactive instead of
// deleting it so historical rows keep their foreign key.
export const BUILDINGS = [
  { code: "RWP", name: "Raw Water Pond and Pump", nameTh: "บ่อน้ำดิบและเครื่องสูบ" },
  { code: "WTK", name: "Water Tank and Pump House", nameTh: "ถังเก็บน้ำและโรงสูบน้ำ" },
  { code: "WTP", name: "Water Treatment Plant", nameTh: "โรงบำบัดน้ำ" },
  { code: "CT", name: "Auxiliary Cooling Tower", nameTh: "หอหล่อเย็นเสริม" },
  { code: "CMP", name: "Compressor Room", nameTh: "ห้องเครื่องอัดอากาศ" },
  { code: "ACC", name: "ACC", nameTh: "หอควบแน่นระบายความร้อนด้วยอากาศ" },
  { code: "TG", name: "TG Building", nameTh: "อาคารกังหันและเครื่องกำเนิดไฟฟ้า" },
  { code: "TR", name: "TR", nameTh: "หม้อแปลงไฟฟ้า (Transformer)" },
  { code: "BLR", name: "Boiler", nameTh: "หม้อไอน้ำ" },
  { code: "BMT", name: "Biomass Transport", nameTh: "สายพานลำเลียงชีวมวล" },
  { code: "BAB", name: "Bottom Ash Bunker", nameTh: "บ่อพักขี้เถ้าหนัก" },
  { code: "FAS", name: "Fly Ash Silo", nameTh: "ไซโลขี้เถ้าลอย" },
  { code: "DOT", name: "Diesel Oil Tank", nameTh: "ถังน้ำมันดีเซล" },
  { code: "FGT", name: "FGT", nameTh: "บำบัดก๊าซเสีย (Flue Gas Treatment)" },
  { code: "STK", name: "Stack", nameTh: "ปล่องควัน" },
] as const;

export const RETIRED_BUILDING_CODES = ["BMS"] as const;

export type BuildingCode = (typeof BUILDINGS)[number]["code"];

export const PERMIT_TYPES = [
  { code: "hot_work", label: "Hot Work", labelTh: "งานที่ก่อให้เกิดความร้อน/ประกายไฟ" },
  { code: "height", label: "Work at Height", labelTh: "งานบนที่สูง" },
  { code: "lifting", label: "Lifting", labelTh: "งานยก" },
  { code: "loto", label: "LOTO", labelTh: "ตัดแยกพลังงาน (Lockout/Tagout)" },
  { code: "confined_space", label: "Confined Space", labelTh: "งานในที่อับอากาศ" },
  { code: "live_electrical", label: "Live Electrical", labelTh: "งานไฟฟ้ามีกระแส" },
  { code: "other", label: "Other", labelTh: "อื่นๆ" },
] as const;

export type PermitType = (typeof PERMIT_TYPES)[number]["code"];
export const PERMIT_TYPE_CODES = PERMIT_TYPES.map((p) => p.code) as PermitType[];

// Bookable machinery / vehicles. Free-text is not allowed so bookings can be compared.
export const MACHINE_TYPES = [
  "Mobile Crane 25T",
  "Mobile Crane 50T",
  "Crawler Crane",
  "Boom Truck",
  "Hiab",
  "Boom Lift",
  "Scissor Lift",
  "Forklift",
  "Backhoe",
  "Dump Truck",
  "Water Truck",
  "Trailer",
  "Concrete Pump",
  "Compactor",
  "Pile Driver",
] as const;

export type MachineType = (typeof MACHINE_TYPES)[number];

// Machines / tools present on site today with a quantity (EPS form "Machine type + Qty").
// Separate from MACHINE_TYPES: this counts equipment, bookings reserve a unit for a time window.
// Suggestion list only — contractors may add custom names beyond this list (stored as free text).
export const SITE_EQUIPMENT_TYPES = [
  "Welding Machine",
  "Hand Tool Equipment",
  "Hiab",
  "Forklift",
  "Backhoe",
  "Dump Truck",
  "Mobile Crane",
  "Boom Truck",
  "Pile Driver",
  "Water Truck",
  "Compactor",
  "Boom Lift",
  "Trailer",
  "Concrete Pump",
] as const;

export type SiteEquipmentType = (typeof SITE_EQUIPMENT_TYPES)[number];

// Manpower by position (primary headcount). `common` rows are shown first in the form.
export const POSITIONS = [
  { code: "worker", label: "Worker", labelTh: "คนงาน", common: true },
  { code: "foreman", label: "Foreman", labelTh: "โฟร์แมน", common: true },
  { code: "engineer", label: "Engineer", labelTh: "วิศวกร", common: true },
  { code: "safety_officer", label: "Safety Officer", labelTh: "จป.", common: true },
  { code: "welder", label: "Welder", labelTh: "ช่างเชื่อม", common: true },
  { code: "site_manager", label: "Site Manager", labelTh: "ผู้จัดการโครงการ", common: true },
  { code: "supervisor", label: "Supervisor", labelTh: "หัวหน้างาน", common: false },
  { code: "surveyor", label: "Surveyor", labelTh: "ช่างสำรวจ", common: false },
  { code: "qaqc", label: "QA/QC", labelTh: "QA/QC", common: false },
  { code: "crane_operator", label: "Crane Operator", labelTh: "พนักงานขับเครน", common: false },
  { code: "driver", label: "Driver", labelTh: "พนักงานขับรถ", common: false },
  { code: "fire_watch", label: "Fire Watch", labelTh: "ผู้เฝ้าระวังไฟ", common: false },
  { code: "store_controller", label: "Store Controller", labelTh: "สโตร์", common: false },
  { code: "admin", label: "Admin", labelTh: "ธุรการ", common: false },
  { code: "maid", label: "Maid", labelTh: "แม่บ้าน", common: false },
  { code: "other", label: "Other", labelTh: "อื่นๆ", common: false },
] as const;

export type PositionCode = (typeof POSITIONS)[number]["code"];
export const POSITION_CODES = POSITIONS.map((p) => p.code) as PositionCode[];

export const DISCIPLINES = [
  { code: "CE", label: "CE โยธา" },
  { code: "ME", label: "ME เครื่องกล" },
  { code: "EE", label: "EE ไฟฟ้า" },
] as const;
export type Discipline = (typeof DISCIPLINES)[number]["code"];
export const DISCIPLINE_CODES = DISCIPLINES.map((d) => d.code) as Discipline[];

// Weather affects stop-work rules (rain/wind) and explains missed progress.
export const WEATHER_CONDITIONS = [
  { code: "thunderstorm", label: "ฟ้าคะนอง" },
  { code: "rain", label: "ฝนตก" },
  { code: "hot", label: "แดดแรง" },
  { code: "windy", label: "ลมแรง" },
  { code: "normal", label: "ปกติ" },
] as const;
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number]["code"];
export const WEATHER_CODES = WEATHER_CONDITIONS.map((w) => w.code) as WeatherCondition[];

// Daily Request = contractor asks EPS QAQC to inspect a piece of work.
export const INSPECTION_TYPES = [
  { code: "rebar", label: "Rebar" },
  { code: "formwork", label: "Formwork" },
  { code: "concrete", label: "Concrete Pour" },
  { code: "welding", label: "Welding" },
  { code: "bolt_torque", label: "Bolt Torque" },
  { code: "steel_erection", label: "Steel Erection" },
  { code: "piping", label: "Piping / Pressure Test" },
  { code: "electrical", label: "Electrical / Cable" },
  { code: "painting", label: "Painting / Coating" },
  { code: "survey", label: "Survey / Setting-out" },
  { code: "other", label: "Other" },
] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number]["code"];
export const INSPECTION_TYPE_CODES = INSPECTION_TYPES.map((t) => t.code) as InspectionType[];

export const READINESS = [
  { code: "ready", label: "Ready", labelTh: "พร้อมตรวจ" },
  { code: "preparing", label: "Preparing", labelTh: "กำลังเตรียม" },
  { code: "not_ready", label: "Not Ready", labelTh: "ยังไม่พร้อม" },
] as const;
export type Readiness = (typeof READINESS)[number]["code"];
export const READINESS_CODES = READINESS.map((r) => r.code) as Readiness[];

// Kanban. draft = saved before the morning report is sent; submitting the morning
// shift promotes that day's drafts to requested. EPS moves the rest.
export const REQUEST_STATUSES = ["draft", "requested", "confirmed", "inspected", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

// Allowed EPS transitions (contractor only creates / edits / deletes draft+requested).
export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  draft: [],
  requested: ["confirmed"],
  confirmed: ["inspected", "requested"],
  inspected: ["closed"],
  closed: [],
};

export const INSPECTION_RESULTS = ["pass", "fail"] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];

export const PHOTO_CATEGORIES = ["progress", "safety"] as const;
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

export type ShiftStatus = "draft" | "submitted";

// Labour density per building-day. Headcount OR contractor count can raise the level
// (three crews in one building is congested even with few people).
export const WORKLOAD_THRESHOLDS = {
  medium: { headcount: 20, contractors: 3 },
  high: { headcount: 40, contractors: 4 },
} as const;

export type WorkloadLevel = "none" | "low" | "medium" | "high";

export function workloadLevel(headcount: number, contractorCount: number): WorkloadLevel {
  if (headcount <= 0) return "none";
  const { medium, high } = WORKLOAD_THRESHOLDS;
  if (headcount >= high.headcount || contractorCount >= high.contractors) return "high";
  if (headcount >= medium.headcount || contractorCount >= medium.contractors) return "medium";
  return "low";
}

// "HH:MM" → minutes since midnight. Caller validates format first.
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// Half-open windows [start, end) overlap test.
export function timeWindowsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Road names are free text: "Road R2" and " road  r2 " name the same road.
export function normalizeRoadName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface RoadBooking {
  id: string;
  contractorId: string;
  startTime: string;
  endTime: string;
}

// Pairs of bookings on one road by different contractors whose windows overlap, the rule behind the
// server's clash flag. start/end is the shared window: the time the two actually collide.
export function roadClashPairs(bookings: RoadBooking[]): { a: string; b: string; start: string; end: string }[] {
  const pairs: { a: string; b: string; start: string; end: string }[] = [];
  bookings.forEach((x, i) => {
    for (const y of bookings.slice(i + 1)) {
      if (x.contractorId === y.contractorId || !timeWindowsOverlap(x.startTime, x.endTime, y.startTime, y.endTime)) continue;
      pairs.push({
        a: x.id,
        b: y.id,
        start: minutesToTime(Math.max(timeToMinutes(x.startTime), timeToMinutes(y.startTime))),
        end: minutesToTime(Math.min(timeToMinutes(x.endTime), timeToMinutes(y.endTime))),
      });
    }
  });
  return pairs;
}

export type RoadBadge = "clash" | "edited" | "still_clash" | "none";

// The badge: a clash with another contractor, and/or an EPS time change.
export function roadBadgeState(clash: boolean, adjusted: boolean): RoadBadge {
  if (clash) return adjusted ? "still_clash" : "clash";
  return adjusted ? "edited" : "none";
}

// NMH (Number of Man-Hours) for one report = headcount × (normal hours + OT).
export function manHours(headcount: number, workHours: number | null, otHours: number | null): number {
  return headcount * ((workHours ?? 0) + (otHours ?? 0));
}

// ---- Safety ----------------------------------------------------------------

// EPS weekly safety statistic categories (contractor picks one when an accident occurred).
export const ACCIDENT_CATEGORIES = [
  { code: "lti", label: "Loss Time Injury", labelTh: "บาดเจ็บถึงขั้นหยุดงาน (LTI)" },
  { code: "non_lti", label: "Non-Loss Time Injury", labelTh: "บาดเจ็บไม่ถึงขั้นหยุดงาน" },
  { code: "property_damage", label: "Property Damage", labelTh: "ทรัพย์สินเสียหาย" },
  { code: "near_miss", label: "Near miss accident", labelTh: "เกือบเกิดอุบัติเหตุ (Near miss)" },
  { code: "emergency", label: "Emergency (Fire, Explosion)", labelTh: "เหตุฉุกเฉิน (ไฟไหม้ ระเบิด)" },
] as const;
export type AccidentCategory = (typeof ACCIDENT_CATEGORIES)[number]["code"];
export const ACCIDENT_CATEGORY_CODES = ACCIDENT_CATEGORIES.map((c) => c.code) as AccidentCategory[];
// Injuries reset the "days without an accident" counter.
export const INJURY_CATEGORIES: AccidentCategory[] = ["lti", "non_lti"];

// Line walk finding (EPS safety inspection).
export const FINDING_TYPES = [
  { code: "unsafe_act", label: "Unsafe Act.", labelTh: "การกระทำที่ไม่ปลอดภัย" },
  { code: "unsafe_condition", label: "Unsafe con.", labelTh: "สภาพที่ไม่ปลอดภัย" },
] as const;
export type FindingType = (typeof FINDING_TYPES)[number]["code"];
export const FINDING_TYPE_CODES = FINDING_TYPES.map((t) => t.code) as FindingType[];

export const FINDING_STATUSES = ["open", "done"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

// Contractors may edit a sent report until 12:00 site time (Thailand, UTC+7, no DST) on
// the day after the report date. After that the day is closed for edits.
export const EDIT_CUTOFF_HOUR = 12;
const SITE_UTC_OFFSET = "+07:00";

export function editDeadline(reportDate: string): Date {
  const next = new Date(`${reportDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const day = next.toISOString().slice(0, 10);
  return new Date(`${day}T${String(EDIT_CUTOFF_HOUR).padStart(2, "0")}:00:00${SITE_UTC_OFFSET}`);
}

export function canEditReport(reportDate: string, now: Date = new Date()): boolean {
  return now.getTime() < editDeadline(reportDate).getTime();
}

// Entries a contractor saves once and picks again (report-standard-items module). Same key = same entry.
export const STANDARD_ITEM_KINDS = ["activity", "equipment", "permit"] as const;
export type StandardItemKind = (typeof STANDARD_ITEM_KINDS)[number];

export function standardItemKey(i: { kind: StandardItemKind; buildingId: string | null; permitType: string | null; label: string }): string {
  return [i.kind, i.buildingId ?? "", i.permitType ?? "", i.label.trim().toLowerCase()].join("|");
}

// Where a road request is: register segments and/or a drawn line; older rows only have a name.
export interface RoadPlace {
  roadLocation: string;
  segmentIds?: string[] | null;
  route?: CoordinationPoint[] | null;
}
// Two drawn lines closer than this share of the drawing are on the same stretch of road.
export const ROAD_ROUTE_NEAR = 0.006;

// Same place on the road: shared register segment; else lines that cross or run together; else the
// same road name (requests made before routes existed). Time and contractor are checked by the caller.
export function roadPlacesMeet(a: RoadPlace, b: RoadPlace): boolean {
  const sa = a.segmentIds ?? [], sb = b.segmentIds ?? [];
  if (sa.length && sb.length) return sa.some((id) => sb.includes(id));
  if (a.route && a.route.length >= 2 && b.route && b.route.length >= 2) return routeDistance(a.route, b.route, 1, 1) <= ROAD_ROUTE_NEAR;
  const name = normalizeRoadName(a.roadLocation);
  return name !== "" && name === normalizeRoadName(b.roadLocation);
}
