export type OperationalStatus = "blocked" | "attention" | "active" | "completed";
export type FacilityState = OperationalStatus | "idle";
export type ActiveFilter = "active" | "inactive" | "all";
export interface Facility {
  id: string;
  projectId: string;
  key: string;
  name: string;
  code: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface FacilityPart {
  id: string;
  facilityId: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface SiteMap {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface MapView {
  id: string;
  siteMapId: string;
  key: string;
  name: string;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface FacilityMarker {
  id: string;
  facilityId: string;
  siteMapViewId: string;
  x: number;
  y: number;
  facility: Facility;
}
export interface FacilityPlacement {
  siteMapId: string;
  mapName: string;
  siteMapViewId: string;
  viewName: string;
  isActive: boolean;
  markerId: string | null;
  x: number | null;
  y: number | null;
}
export interface FacilitySummary {
  facilityId: string;
  activityCount: number;
  contractorCount: number;
  manpowerCount: number;
  highestPriorityStatus: FacilityState;
}
export interface SiteActivityRecord {
  id: string;
  projectId: string;
  workDate: string;
  title: string;
  description: string | null;
  status: OperationalStatus;
  manpower: number;
  progressPercent: number;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  facility: Pick<Facility, "id" | "key" | "name" | "code" | "isActive"> | null;
  facilityPart: Pick<FacilityPart, "id" | "facilityId" | "code" | "name" | "isActive"> | null;
  contractor: { id: string; code: string; name: string };
}
export interface SiteActivityInput {
  facilityId: string;
  facilityPartId?: string | null;
  contractorId: string;
  workDate: string;
  title: string;
  description?: string;
  status: OperationalStatus;
  manpower: number;
  progressPercent: number;
  startTime?: string | null;
  endTime?: string | null;
}
export interface SiteActivityFilters {
  workDate?: string;
  before?: string;
  facilityId?: string;
  facilityPartId?: string;
  contractorId?: string;
  status?: OperationalStatus;
  page?: number;
  pageSize?: number;
}
export type MarkerDrafts = Record<string, { x: number; y: number } | null>;
