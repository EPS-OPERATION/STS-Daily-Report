import type {
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
  startTime: string;
  endTime: string;
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
  machinery: MachineryInput[];
  permits: PermitInput[];
}

export interface EveningProgressInput {
  allocationId: string;
  actualPercent: number;
  countermeasure?: string;
}

export interface EveningInput {
  otHours: number;
  accidentOccurred: boolean;
  accidentNote?: string;
  progress: EveningProgressInput[];
  signatureName: string;
  signatureData: string;
}

export interface PhotoUploadInput {
  category: PhotoCategory;
  file: File;
}

// Booking row used for conflict detection (same shape for submit-time and weekly checks).
export interface BookingRow {
  id: string;
  reportDate: string;
  machineType: string;
  unitTag: string | null;
  startTime: string;
  endTime: string;
  contractorId: string;
  contractorCode: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
}

export type ConflictSeverity = "conflict" | "possible";

export interface MachineryConflict {
  reportDate: string;
  machineType: string;
  unitTag: string | null;
  severity: ConflictSeverity;
  bookingIds: [string, string];
}
