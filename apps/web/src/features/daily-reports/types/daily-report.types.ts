import type {
  AccidentCategory,
  Discipline,
  InspectionResult,
  InspectionType,
  MachineType,
  PermitType,
  PhotoCategory,
  PositionCode,
  Readiness,
  RequestStatus,
  SiteEquipmentType,
  WeatherCondition,
  WorkloadLevel,
} from "@sts/shared";
export type ShiftStatus = "draft" | "submitted";

export type Shift = "morning" | "evening";

// EPS review decision on a submitted report (backend: review_status check).
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewQueueRow {
  id: string;
  contractorId: string;
  contractorCode: string;
  contractorName: string;
  reportDate: string;
  morningStatus: ShiftStatus;
  eveningStatus: ShiftStatus;
  totalHeadcount: number;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
}

export interface ReviewPayload {
  decision: "approved" | "rejected";
  note?: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  sortOrder: number;
}

export interface ReportAllocation {
  id: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  headcount: number;
  workDescription: string;
  planPercent: number;
  actualPercent: number | null;
  countermeasure: string | null;
}

export interface ReportMachinery {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode: string;
  machineType: MachineType;
  unitTag: string | null;
  /** null window = needed all day */
  startTime: string | null;
  endTime: string | null;
  purpose: string | null;
}

export interface ReportEquipmentRequest {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  equipmentType: string;
  qty: number;
  purpose: string | null;
  contractorId: string;
  contractorCode: string;
}

export interface ReportPermit {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode: string;
  permitType: PermitType;
  otherLabel: string | null;
  workers: number;
}

export interface ReportPhoto {
  id: string;
  category: PhotoCategory;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  url: string | null;
}

export interface ReportRoadUsage {
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

export interface ReportMaterial {
  materialName: string;
  qty: number;
  unit: string;
}

export interface MaterialLogRow {
  id: string;
  reportDate: string;
  contractorId: string;
  contractorCode: string;
  contractorName: string;
  materialName: string;
  qty: number;
  unit: string;
}

export interface MaterialsSummary {
  data: MaterialLogRow[];
  summary: { materialName: string; unit: string; entries: number; totalQty: number }[];
  meta: { page: number; pageSize: number; total: number };
}

export interface ReportMachineryConflict {
  targetDate: string;
  machineType: string;
  unitTag: string | null;
  severity: "conflict" | "possible";
  bookingIds: [string, string];
  with: { contractorCode: string; buildingCode: string; startTime: string; endTime: string }[];
}

export interface DailyReport {
  id: string;
  projectId: string;
  contractorId: string;
  reportDate: string;
  startTime: string | null;
  endTime: string | null;
  workHours: number | null;
  disciplines: Discipline[];
  weather: WeatherCondition | null;
  temperatureC: number | null;
  humidityPct: number | null;
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
  totalHeadcount: number;
  manHours: number;
  accidentOccurred: boolean | null;
  accidentNote: string | null;
  accidentCategory: AccidentCategory | null;
  positions: { position: PositionCode; headcount: number }[];
  equipment: { equipmentType: SiteEquipmentType; qty: number }[];
  morningStatus: ShiftStatus;
  morningSubmittedAt: string | null;
  otHours: number | null;
  eveningStatus: ShiftStatus;
  eveningSubmittedAt: string | null;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  signatureName: string | null;
  signedAt: string | null;
  hasSignature: boolean;
  allocations: ReportAllocation[];
  /** Requests this report raised for `requestsForDate` (= reportDate + 1). */
  machinery: ReportMachinery[];
  equipmentRequests: ReportEquipmentRequest[];
  permits: ReportPermit[];
  roadUsage: ReportRoadUsage[];
  /** Materials on site today (evening check-out). */
  materials: ReportMaterial[];
  requestsForDate: string;
  photos: ReportPhoto[];
  machineryConflicts: ReportMachineryConflict[];
  roadConflicts: { roadLocation: string; with: { contractorCode: string; startTime: string; endTime: string; purpose: string }[] }[];
}

// What the contractor requested yesterday evening for today (read-only on the morning form).
export interface PlannedToday {
  machinery: {
    id: string;
    buildingCode: string;
    buildingName: string;
    machineType: string;
    unitTag: string | null;
    startTime: string | null;
    endTime: string | null;
    purpose: string | null;
  }[];
  equipment: ReportEquipmentRequest[];
  permits: { id: string; buildingCode: string; buildingName: string; permitType: PermitType; otherLabel: string | null; workers: number }[];
  roads: ReportRoadUsage[];
  inspections: InspectionRequest[];
}

export interface ReportContractor {
  id: string;
  code: string;
  name: string;
}

export interface CurrentReportResponse {
  data: { contractor: ReportContractor; report: DailyReport | null; plannedToday: PlannedToday };
}

export interface MorningPayload {
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
  allocations: { buildingId: string; headcount: number; workDescription: string; planPercent: number }[];
}

export interface EveningPayload {
  date: string;
  contractorId: string;
  otHours: number;
  accidentOccurred: boolean;
  accidentNote?: string;
  accidentCategory?: AccidentCategory;
  progress: { allocationId: string; actualPercent: number; countermeasure?: string }[];
  signatureName: string;
  signatureData: string;
  machinery: { buildingId: string; machineType: MachineType; unitTag?: string; startTime?: string; endTime?: string; purpose?: string }[];
  equipmentRequests: { buildingId: string; equipmentType: SiteEquipmentType; qty: number; purpose?: string }[];
  permits: { buildingId: string; permitType: PermitType; otherLabel?: string; workers: number }[];
  roadUsage: { buildingId: string; roadLocation: string; startTime: string; endTime: string; purpose: string }[];
  materials: { name: string; qty: number; unit: string }[];
}

// ---- weekly summary ----

export interface WeeklyCell {
  date: string;
  headcount: number;
  contractors: { id: string; code: string; name: string; headcount: number }[];
  permits: { type: PermitType; workers: number }[];
  level: WorkloadLevel;
}

export interface WeeklyBuildingRow {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  weekManDays: number;
  peakHeadcount: number;
  cells: WeeklyCell[];
}

export interface WeeklyBooking {
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
  conflict: "conflict" | "possible" | null;
}

export interface WeeklyConflict {
  targetDate: string;
  machineType: string;
  unitTag: string | null;
  severity: "conflict" | "possible";
  bookingIds: [string, string];
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  days: string[];
  buildings: WeeklyBuildingRow[];
  machinery: WeeklyBooking[];
  conflicts: WeeklyConflict[];
  roads: (ReportRoadUsage & { conflict: boolean })[];
  equipmentRequests: ReportEquipmentRequest[];
  requests: Record<RequestStatus, number>;
  totals: { manDays: number; manHours: number; permitWorkers: number; bookings: number; conflicts: number; possibleConflicts: number; roadConflicts: number };
}

// ---- Daily Request (QAQC inspection) ----

export interface InspectionRequest {
  id: string;
  projectId: string;
  contractorId: string;
  contractorCode: string;
  contractorName: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  reportDate: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectionType: InspectionType;
  workItem: string;
  location: string | null;
  drawingRef: string | null;
  readiness: Readiness;
  status: RequestStatus;
  result: InspectionResult | null;
  epsNote: string | null;
  statusChangedAt: string | null;
  createdAt: string;
}

export interface InspectionRequestFields {
  buildingId: string;
  inspectionDate: string;
  inspectionTime: string;
  inspectionType: InspectionType;
  workItem: string;
  location?: string;
  drawingRef?: string;
  readiness: Readiness;
}

// ---- chart data (weekly meeting page) ----

export interface PositionMixRow {
  contractorId: string;
  contractorCode: string;
  position: string;
  avgPerDay: number;
}

export interface ManpowerTrendPoint {
  weekStart: string;
  weekEnd: string;
  reportedDays: number;
  manDays: number;
  avgDaily: number | null;
}

export interface ManpowerContractorTotals {
  contractorId: string;
  contractorCode: string;
  manDays: number;
  manHours: number;
  reportedDays: number;
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
}

export interface ManpowerSummary {
  from: string;
  to: string;
  contractors: ManpowerContractorTotals[];
  daily: { date: string; contractorCode: string; headcount: number }[];
  byBuilding: { buildingId: string; code: string; name: string; contractors: Record<string, number> }[];
  totals: { manDays: number; manHours: number; reportedDays: number; avgDaily: number };
}

export interface DailyRequests {
  from: string;
  to: string;
  machinery: WeeklyBooking[];
  equipmentRequests: ReportEquipmentRequest[];
  roads: (ReportRoadUsage & { conflict: boolean })[];
}
