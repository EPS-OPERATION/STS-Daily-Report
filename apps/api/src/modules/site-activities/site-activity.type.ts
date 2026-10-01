export type SiteActivityStatus = "active" | "attention" | "blocked" | "completed";

export interface SiteActivityFilters {
  date?: string;
  workDate?: string;
  facilityId?: string;
  facilityPartId?: string;
  zoneId?: string;
  contractorId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSiteActivityInput {
  facilityId?: string;
  facilityPartId?: string | null;
  zoneId?: string | null;
  zonePartId?: string | null;
  contractorId: string;
  workDate: string;
  title: string;
  description?: string;
  status?: SiteActivityStatus;
  manpower?: number;
  progressPercent?: number;
  startTime?: string;
  endTime?: string;
}

export interface UpdateSiteActivityInput {
  facilityId?: string;
  facilityPartId?: string | null;
  zoneId?: string | null;
  zonePartId?: string | null;
  contractorId?: string;
  workDate?: string;
  title?: string;
  description?: string | null;
  status?: SiteActivityStatus;
  manpower?: number;
  progressPercent?: number;
  startTime?: string | null;
  endTime?: string | null;
}
