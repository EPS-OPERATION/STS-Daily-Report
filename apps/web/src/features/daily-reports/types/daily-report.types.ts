import type { AccidentCategory, CoordinationPoint, Discipline, MachineType, PermitType, PhotoCategory, PositionCode, WeatherCondition } from "@sts/shared";
import type { ReportMachinery } from "@/features/daily-requests/index.js";
import type { ReportEquipmentRequest } from "@/features/daily-requests/index.js";
import type { ReportPermit } from "@/features/daily-requests/index.js";
import type { ReportRoadUsage } from "@/features/daily-requests/index.js";
import type { ReportForecast } from "@/features/daily-requests/index.js";
import type { ReportMachineryConflict } from "@/features/daily-requests/index.js";
import type { PermitPayload } from "@/features/daily-requests/index.js";
import type { InspectionRequest } from "@/features/qaqc/index.js";

export type ShiftStatus = "draft" | "submitted";

export type Shift = "morning" | "evening";

// EPS review decision on a submitted report (backend: review_status check).
export type ReviewStatus = "pending" | "approved" | "rejected";

// Submission history row: one per contractor × day, including days with no report at all.
export interface ReviewQueueRow {
  /** null when the contractor sent nothing that day. */
  id: string | null;
  hasReport: boolean;
  contractorId: string;
  contractorCode: string;
  contractorName: string;
  reportDate: string;
  morningStatus: ShiftStatus;
  eveningStatus: ShiftStatus;
  /** Morning headcount (nationality split total). */
  totalHeadcount: number;
  eveningHeadcount: number;
  morningSubmittedAt?: string | null;
  morningUpdatedAt?: string | null;
  eveningSubmittedAt?: string | null;
  eveningUpdatedAt?: string | null;
  updatedAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  workHours?: number | null;
  otHours?: number | null;
}

export interface ReviewPayload {
  decision: "approved" | "rejected";
  note?: string;
}

export interface ReportAllocation {
  id: string;
  discipline: Discipline;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  headcount: number;
  workDescription: string;
  /** Optional HH:mm window; null = all day. */
  startTime: string | null;
  endTime: string | null;
  /** Share of the crew's working time spent here (man-days = headcount × dayShare). */
  dayShare: number;
  /** Optional plan; null = no plan stated (actual % only). */
  planPercent: number | null;
  actualPercent: number | null;
  countermeasure: string | null;
}

// One discipline's crew for one shift: people by position + nationality/sex split.
export interface ReportCrew {
  shift: "morning" | "evening";
  discipline: Discipline;
  positions: { position: PositionCode; headcount: number }[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
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

// Tomorrow Forecast Activity (paper form R003): planned work for targetDate (= report date + 1).
/** One itemised OT row of the evening report (where, what, how many people, how long). */
export interface ReportOvertime {
  id: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  task: string;
  workers: number;
  hours: number;
}

export interface ReportMaterial {
  materialName: string;
  qty: number;
  unit: string;
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
  /** (morning + afternoon) / 2, or the one half sent — see dayManpower in @sts/shared. */
  manDays: number;
  manHours: number;
  accidentOccurred: boolean | null;
  accidentNote: string | null;
  accidentCategory: AccidentCategory | null;
  positions: { position: PositionCode; headcount: number }[];
  /** Afternoon crew by position (differs from the morning crew); empty until the evening is sent. */
  eveningPositions: { position: PositionCode; headcount: number }[];
  eveningHeadcount: number;
  /** Per-discipline breakdown of both shifts; positions / totals are their sum. */
  crews: ReportCrew[];
  eveningThaiMale: number | null;
  eveningThaiFemale: number | null;
  eveningForeignMale: number | null;
  eveningForeignFemale: number | null;
  equipment: { equipmentType: string; qty: number }[];
  morningStatus: ShiftStatus;
  morningSubmittedAt: string | null;
  morningUpdatedAt?: string | null;
  otHours: number | null;
  eveningStatus: ShiftStatus;
  eveningSubmittedAt: string | null;
  eveningUpdatedAt?: string | null;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  signatureName: string | null;
  signedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  hasSignature: boolean;
  allocations: ReportAllocation[];
  /** Requests this report raised for `requestsForDate` (= reportDate + 1). */
  machinery: ReportMachinery[];
  equipmentRequests: ReportEquipmentRequest[];
  permits: ReportPermit[];
  roadUsage: ReportRoadUsage[];
  /** Materials on site today (evening Daily Request). */
  materials: ReportMaterial[];
  /** Tomorrow Forecast Activities raised in this report's afternoon (for requestsForDate). */
  forecasts: ReportForecast[];
  /** Itemised OT (empty on reports sent before OT was itemised — then only otHours). */
  overtime?: ReportOvertime[];
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
  weather: WeatherCondition;
  temperatureC?: number;
  humidityPct?: number;
  equipment: { equipmentType: string; qty: number }[];
  permits?: PermitPayload[];
  crews: (CrewPayload & {
    allocations: {
      buildingId: string;
      headcount: number;
      workDescription: string;
      startTime?: string;
      endTime?: string;
      planPercent?: number;
    }[];
  })[];
}

export interface CrewPayload {
  discipline: Discipline;
  positions: { position: PositionCode; headcount: number }[];
  thaiMale: number;
  thaiFemale: number;
  foreignMale: number;
  foreignFemale: number;
}

export interface EveningPayload {
  date: string;
  contractorId: string;
  otHours: number;
  overtime: { buildingId: string; task: string; workers: number; hours: number }[];
  accidentOccurred: boolean;
  accidentNote?: string;
  accidentCategory?: AccidentCategory;
  crews: CrewPayload[];
  progress: { allocationId: string; actualPercent: number; countermeasure?: string }[];
  signatureName: string;
  signatureData?: string;
  machinery: { buildingId: string; machineType: MachineType; unitTag?: string; startTime?: string; endTime?: string; purpose?: string }[];
  equipmentRequests: { buildingId: string; equipmentType: string; qty: number; purpose?: string }[];
  permits?: PermitPayload[];
  roadUsage: { buildingId?: string | null; roadLocation: string; startTime: string; endTime: string; purpose: string; segmentIds?: string[]; route?: CoordinationPoint[] | null }[];
  materials: { name: string; qty: number; unit: string }[];
  forecasts: { buildingId: string; description: string }[];
}

// ---- weekly summary ----

// Everything the printed "Daily Request & Report" sheet needs (GET /daily-reports/:id/print).
export interface PrintReport extends DailyReport {
  signatureData: string | null;
  projectName: string;
  contractorCode: string;
  contractorName: string;
  /** Permits this contractor asked for (yesterday evening) to be used on reportDate. */
  permitsToday: PlannedToday["permits"];
  inspections: InspectionRequest[];
  safetyRecord: { accidents: number; daysSinceLastAccident: number; lastAccidentDate: string | null };
}
