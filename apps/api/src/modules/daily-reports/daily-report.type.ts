import type {
  AccidentCategory,
  Discipline,
  MachineType,
  PermitType,
  PhotoCategory,
  PositionCode,
  SiteEquipmentType,
  WeatherCondition,
} from "@sts/shared";

export interface AllocationInput {
  buildingId: string;
  headcount: number;
  workDescription: string;
  planPercent: number;
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
  equipmentType: SiteEquipmentType;
  qty: number;
  purpose?: string;
}

export interface PermitInput {
  buildingId: string;
  permitType: PermitType;
  otherLabel?: string;
  workers: number;
}

export interface MorningInput {
  date: string;
  contractorId: string;
  startTime: string;
  endTime: string;
  workHours: number;
  disciplines: Discipline[];
  weather: WeatherCondition;
  temperatureC?: number;
  humidityPct?: number;
  positions: { position: PositionCode; headcount: number }[];
  equipment: { equipmentType: SiteEquipmentType; qty: number }[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  allocations: AllocationInput[];
}

export interface RoadUsageInput {
  buildingId: string;
  roadLocation: string;
  startTime: string;
  endTime: string;
  purpose: string;
}

// Materials on site today (evening check-out): free-text name + qty + unit.
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

// Evening check-out for `date`; machinery / permits / roadUsage are requests for date + 1.
export interface EveningInput {
  date: string;
  contractorId: string;
  otHours: number;
  accidentOccurred: boolean;
  accidentNote?: string;
  accidentCategory?: AccidentCategory;
  progress: EveningProgressInput[];
  signatureName: string;
  signatureData: string;
  machinery: MachineryInput[];
  equipmentRequests: EquipmentRequestInput[];
  permits: PermitInput[];
  roadUsage: RoadUsageInput[];
  materials: MaterialInput[];
}

export interface PhotoUploadInput {
  category: PhotoCategory;
  file: File;
}

// EPS review decision on a submitted report (approved, or rejected with a note
// the contractor must address — mirrors the inspection pass/fail rule).
export type ReviewDecision = "approved" | "rejected";

export interface ReviewInput {
  decision: ReviewDecision;
  note?: string;
}

// Booking row used for conflict detection (same shape for submit-time and weekly checks).
export interface BookingRow {
  id: string;
  targetDate: string;
  machineType: string;
  unitTag: string | null;
  startTime: string | null;
  endTime: string | null;
  purpose: string | null;
  contractorId: string;
  contractorCode: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
}

export type ConflictSeverity = "conflict" | "possible";

export interface RoadRow {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  roadLocation: string;
  startTime: string;
  endTime: string;
  purpose: string;
  contractorId: string;
  contractorCode: string;
}

export interface MachineryConflict {
  targetDate: string;
  machineType: string;
  unitTag: string | null;
  severity: ConflictSeverity;
  bookingIds: [string, string];
}
