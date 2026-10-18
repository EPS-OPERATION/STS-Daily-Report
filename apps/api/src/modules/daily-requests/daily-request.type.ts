import type { CoordinationPoint } from "@sts/shared";

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
  contractorName?: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
}

export type ConflictSeverity = "conflict" | "possible";

export interface RoadRow {
  id: string;
  targetDate: string;
  buildingId: string | null;
  buildingCode: string | null;
  buildingName: string | null;
  roadLocation: string;
  // startTime/endTime: what EPS settled (the request until EPS changes it). requested*: the contractor's own times.
  startTime: string;
  endTime: string;
  requestedStartTime: string;
  requestedEndTime: string;
  adjusted: boolean;
  adjustedAt: Date | null;
  adjustedByName: string | null;
  purpose: string;
  /** Register segments in driving order (empty = none picked) and the line drawn through them. */
  segmentIds: string[];
  route: CoordinationPoint[] | null;
  contractorId: string;
  contractorCode: string;
  contractorName?: string;
}

export interface MachineryConflict {
  targetDate: string;
  machineType: string;
  unitTag: string | null;
  severity: ConflictSeverity;
  bookingIds: [string, string];
}
