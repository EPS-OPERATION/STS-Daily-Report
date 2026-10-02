export type DailySiteMarkerStatus = "active" | "withdrawn";
export type DailySiteMarkerStatusFilter = DailySiteMarkerStatus | "all";

export interface DailySiteMarkerFilters {
  siteMapViewId: string;
  workDate: string;
  contractorId?: string;
  facilityId?: string;
  iconKey?: string;
  status?: DailySiteMarkerStatusFilter;
}

export interface CreateDailySiteMarkerInput {
  siteMapViewId: string;
  workDate: string;
  contractorId: string;
  iconKey: string;
  comment: string;
  x: number;
  y: number;
  facilityId?: string | null;
}

export interface UpdateDailySiteMarkerInput {
  iconKey?: string;
  comment?: string;
  x?: number;
  y?: number;
  facilityId?: string | null;
}
