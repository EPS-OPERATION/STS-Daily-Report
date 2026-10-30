import type { AccidentCategory, CoordinationPoint, Discipline, MachineType, PermitType, PhotoCategory, PositionCode, WeatherCondition } from "@sts/shared";

// One Today Activity row: all day, or for an optional HH:mm window when the crew moves building.
export interface AllocationInput {
  buildingId: string;
  headcount: number;
  workDescription: string;
  startTime?: string;
  endTime?: string;
  /** Optional — without a plan the evening reports actual % only. */
  planPercent?: number;
}

export interface MachineryInput {
  buildingId: string;
  machineType: MachineType;
  unitTag?: string;
  // Optional window; omitted = needed all day.
  startTime?: string;
  endTime?: string;
  purpose?: string;
}

export interface EquipmentRequestInput {
  buildingId: string;
  // Free text (SITE_EQUIPMENT_TYPES is the suggestion list only).
  equipmentType: string;
  qty: number;
  purpose?: string;
}

export interface PermitInput {
  buildingId: string;
  permitType: PermitType;
  otherLabel?: string;
  workers: number;
  /** Contractor's own assessment; when true taskName + supervisorName (EPS) are required. */
  highRisk?: boolean;
  taskName?: string;
  supervisorName?: string;
  /** Stable id of the form card; its site photos point to it. */
  photoKey?: string;
}

// One discipline's crew: people by position plus the nationality/sex split of the same people.
export interface CrewInput {
  discipline: Discipline;
  positions: { position: PositionCode; headcount: number }[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
}

// Morning adds where that crew works (building allocation with plan %).
export interface MorningCrewInput extends CrewInput {
  allocations: AllocationInput[];
}

export interface MorningInput {
  date: string;
  contractorId: string;
  startTime: string;
  endTime: string;
  workHours: number;
  weather: WeatherCondition;
  temperatureC?: number;
  humidityPct?: number;
  equipment: { equipmentType: string; qty: number }[];
  // One crew per discipline that worked today (CE / ME / EE); the report is their sum.
  crews: MorningCrewInput[];
  permits?: PermitInput[];
  // Owner (EPS) manpower only. Regular contractor reports keep OT on the evening Daily Request.
  otHours?: number | null;
}

export interface RoadUsageInput {
  buildingId?: string | null;
  roadLocation: string;
  startTime: string;
  endTime: string;
  purpose: string;
  segmentIds?: string[];
  route?: CoordinationPoint[] | null;
}

// Materials on site today (evening Daily Request): free-text name + qty + unit.
export interface MaterialInput {
  name: string;
  qty: number;
  unit: string;
}

export interface EveningProgressInput {
  allocationId: string;
  actualPercent: number;
  countermeasure?: string;
}

export interface OvertimeInput {
  buildingId: string;
  task: string;
  workers: number;
  hours: number;
}

export interface AdditionalAllocationInput {
  buildingId: string;
  discipline: Discipline;
  headcount: number;
  workDescription: string;
  actualPercent: number;
  startTime?: string;
  endTime?: string;
}

// Evening Daily Request for `date`; machinery / permits / roadUsage are requests for date + 1.
export interface EveningInput {
  date: string;
  contractorId: string;
  otHours: number;
  /** Itemised OT (building, task, people, hours). Absent from older clients. */
  overtime?: OvertimeInput[];
  accidentOccurred: boolean;
  accidentNote?: string;
  accidentCategory?: AccidentCategory;
  // Afternoon crews per discipline (differ from the morning crews).
  crews: CrewInput[];
  progress: EveningProgressInput[];
  /** Additional / unplanned work done beyond the morning plan */
  additionalAllocations?: AdditionalAllocationInput[];
  signatureName: string;
  machinery: MachineryInput[];
  equipmentRequests: EquipmentRequestInput[];
  permits?: PermitInput[];
  roadUsage: RoadUsageInput[];
  materials: MaterialInput[];
  // Tomorrow Forecast Activities: planned work for date + 1 (description + area).
  forecasts: { buildingId: string; description: string }[];
}

export interface PhotoUploadInput {
  category: PhotoCategory;
  file: File;
  permitKey?: string;
}

// EPS review decision on a submitted report (approved, or rejected with a note
// the contractor must address — mirrors the inspection pass/fail rule).
export type ReviewDecision = "approved" | "rejected";

export interface ReviewInput {
  decision: ReviewDecision;
  note?: string;
}
