// Contractor daily report vocabulary shared by api (validation) and web (forms/labels).
// Framework-free: plain consts + helpers only.

// 16 physical buildings (drawing set STSBPP-EB-C-023 + 3D site model). Used for
// allocation instead of WBS codes. `code` is stable and stored in the database.
export const BUILDINGS = [
  { code: "BMS", name: "Biomass Storage", nameTh: "อาคารเก็บชีวมวล" },
  { code: "BMT", name: "Biomass Transport", nameTh: "สายพานลำเลียงชีวมวล" },
  { code: "BLR", name: "Boiler", nameTh: "หม้อไอน้ำ" },
  { code: "BAB", name: "Bottom Ash Bunker", nameTh: "บ่อพักขี้เถ้าหนัก" },
  { code: "FAS", name: "Fly Ash Silo", nameTh: "ไซโลขี้เถ้าลอย" },
  { code: "DOT", name: "Diesel Oil Tank", nameTh: "ถังน้ำมันดีเซล" },
  { code: "FGT", name: "FGT", nameTh: "บำบัดก๊าซเสีย (Flue Gas Treatment)" },
  { code: "STK", name: "Stack", nameTh: "ปล่องควัน" },
  { code: "TG", name: "TG Building", nameTh: "อาคารกังหันและเครื่องกำเนิดไฟฟ้า" },
  { code: "TR", name: "TR", nameTh: "หม้อแปลงไฟฟ้า (Transformer)" },
  { code: "ACC", name: "ACC", nameTh: "หอควบแน่นระบายความร้อนด้วยอากาศ" },
  { code: "CMP", name: "Compressor Room", nameTh: "ห้องเครื่องอัดอากาศ" },
  { code: "CT", name: "Auxiliary Cooling Tower", nameTh: "หอหล่อเย็นเสริม" },
  { code: "WTP", name: "Water Treatment Plant (WTP)", nameTh: "โรงบำบัดน้ำ" },
  { code: "WTK", name: "Water Tank and Pump House", nameTh: "ถังเก็บน้ำและโรงสูบน้ำ" },
  { code: "RWP", name: "Raw Water Pond and Pump", nameTh: "บ่อน้ำดิบและเครื่องสูบ" },
] as const;

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

// NMH (Number of Man-Hours) for one report = headcount × (normal hours + OT).
export function manHours(headcount: number, workHours: number | null, otHours: number | null): number {
  return headcount * ((workHours ?? 0) + (otHours ?? 0));
}
