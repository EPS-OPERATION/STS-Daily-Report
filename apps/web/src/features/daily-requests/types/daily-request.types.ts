import type { CoordinationPoint, MachineType, PermitType } from "@sts/shared";

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
  contractorName?: string;
}

export interface ReportPermit {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode: string;
  permitType: PermitType;
  otherLabel: string | null;
  workers: number;
  /** Contractor-assessed high-risk job: task name + EPS supervisor (shown on the Safety page). */
  highRisk: boolean;
  taskName: string | null;
  supervisorName: string | null;
  /** Stable id of the form card; site photos (category "permit") point to it. */
  photoKey?: string | null;
}

export interface ReportRoadUsage {
  id: string;
  targetDate: string;
  buildingId: string | null;
  buildingCode: string | null;
  buildingName: string | null;
  roadLocation: string;
  /** What EPS settled (the contractor's request until EPS changes it). */
  startTime: string;
  endTime: string;
  /** The contractor's own request. */
  requestedStartTime: string;
  requestedEndTime: string;
  adjusted: boolean;
  adjustedAt: string | null;
  adjustedByName: string | null;
  purpose: string;
  /** Register segments in driving order (empty = none picked) and the line through them. */
  segmentIds: string[];
  route: CoordinationPoint[] | null;
  contractorId: string;
  contractorCode: string;
  contractorName?: string;
}

export interface ReportForecast {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  description: string;
}

export interface ReportMachineryConflict {
  targetDate: string;
  machineType: string;
  unitTag: string | null;
  severity: "conflict" | "possible";
  bookingIds: [string, string];
  with: { contractorCode: string; buildingCode: string; startTime: string; endTime: string }[];
}

export interface DailyRequests {
  from: string;
  to: string;
  machinery: WeeklyBooking[];
  equipmentRequests: ReportEquipmentRequest[];
  roads: (ReportRoadUsage & { conflict: boolean })[];
  permits: (ReportPermit & { buildingName: string; contractorId: string; contractorCode: string; contractorName: string })[];
  forecasts: (ReportForecast & { contractorId: string; contractorCode: string; contractorName: string })[];
}

export interface PermitPayload {
  buildingId: string;
  permitType: PermitType;
  otherLabel?: string;
  workers: number;
  highRisk?: boolean;
  taskName?: string;
  supervisorName?: string;
  photoKey?: string;
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
  contractorName?: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  conflict: "conflict" | "possible" | null;
}

// EPS adds a permit the contractor left out (goes on that contractor's report for the date).
export interface CreatePermitPayload {
  contractorId: string;
  targetDate: string;
  buildingId: string;
  permitType: PermitType;
  otherLabel?: string | null;
  workers: number;
  highRisk: boolean;
  taskName?: string | null;
  supervisorName?: string | null;
}

// EPS fixes a permit; kept when the contractor re-sends the report.
export interface UpdatePermitPayload {
  targetDate?: string;
  buildingId?: string;
  permitType?: PermitType;
  otherLabel?: string | null;
  workers?: number;
  highRisk?: boolean;
  taskName?: string | null;
  supervisorName?: string | null;
}

/** A work permit of the day for the Today feed, with the location photos its contractor attached (floor cut open,
 *  guardrail removed...); `photos` is empty when none. */
export interface PermitNotice {
  id: string;
  targetDate: string;
  permitType: string;
  otherLabel: string | null;
  highRisk: boolean;
  taskName: string | null;
  contractorCode: string;
  contractorName: string;
  buildingCode: string;
  buildingName: string;
  buildingNameTh: string | null;
  photos: { id: string; fileName: string; url: string | null }[];
}
