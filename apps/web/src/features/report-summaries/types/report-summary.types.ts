import type { PermitType, RequestStatus, WorkloadLevel } from "@sts/shared";
import type { ReportEquipmentRequest, ReportRoadUsage, WeeklyBooking } from "@/features/daily-requests/index.js";

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

export interface PositionMixRow {
  contractorId: string;
  contractorCode: string;
  position: string;
  totalHeadcount?: number;
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
