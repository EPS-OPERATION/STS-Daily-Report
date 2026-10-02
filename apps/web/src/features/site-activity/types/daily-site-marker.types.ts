import type { DailySiteMarkerIconKey } from "@sts/shared";

export interface DailySiteMarker {
  id: string;
  projectId: string;
  siteMapViewId: string;
  workDate: string;
  contractor: { id: string; code: string; name: string };
  createdBy: { id: string; displayName: string | null };
  updatedBy: { id: string; displayName: string | null } | null;
  iconKey: DailySiteMarkerIconKey;
  comment: string;
  x: number;
  y: number;
  facility: { id: string; name: string; code: string | null } | null;
  status: "active" | "withdrawn";
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canWithdraw: boolean;
}

export interface DailySiteMarkerFilters {
  contractorId?: string;
  facilityId?: string;
  iconKey?: DailySiteMarkerIconKey;
  status?: "active" | "withdrawn" | "all";
}

export interface CreateDailySiteMarkerInput {
  siteMapViewId: string;
  workDate: string;
  contractorId: string;
  iconKey: DailySiteMarkerIconKey;
  comment: string;
  x: number;
  y: number;
  facilityId?: string | null;
}

export interface UpdateDailySiteMarkerInput {
  iconKey?: DailySiteMarkerIconKey;
  comment?: string;
  x?: number;
  y?: number;
  facilityId?: string | null;
}
