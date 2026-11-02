export type SiteActivityStatus = "active" | "attention" | "blocked" | "completed";

export interface SiteActivityFilters {
  date?: string;
  zoneId?: string;
  contractorId?: string;
  status?: string;
}

export interface CreateSiteActivityInput {
  zoneId: string;
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
  zoneId?: string;
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
