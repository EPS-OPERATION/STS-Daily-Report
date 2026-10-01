export type ActivityStatus = "active" | "attention" | "blocked" | "completed";
export type ZoneState = ActivityStatus | "idle";
export type SiteMapView = "overview" | "top";

export interface ZoneOption {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  displayColor: string;
  defaultDisplayColor: string;
  sortOrder: number;
  status: string;
}

export interface ZonePartOption {
  id: string;
  zoneId: string;
  code: string;
  name: string;
  displayColor: string;
  mapX: number | null;
  mapY: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PlanMapPoint {
  zoneId: string | null;
  facilityKey: string;
  view: SiteMapView;
  facility: { no: number; key: string; name: string };
  zone: {
    id: string;
    code: string;
    name: string;
    parentId: string | null;
    sortOrder: number;
    displayColor: string;
  } | null;
  x: number;
  y: number;
  legacyDerived?: boolean;
}

export interface SiteFacilityDefinition {
  no: number;
  key: string;
  name: string;
  zone: ZoneOption | null;
  overview: { x: number; y: number } | null;
  topView: { x: number; y: number } | null;
}

export interface SitePlan {
  id: string;
  projectId: string;
  name: string;
  background: { objectKey: string | null; url: string | null; width: number | null; height: number | null };
  points: PlanMapPoint[];
  facilities: SiteFacilityDefinition[];
}

export interface PlanActivity {
  id: string;
  projectId: string;
  workDate: string;
  title: string;
  description: string | null;
  status: string;
  manpower: number;
  progressPercent: number;
  startTime: string | null;
  endTime: string | null;
  facility?: { id: string; key: string; name: string; code: string | null; isActive: boolean } | null;
  facilityPart?: { id: string; facilityId: string | null; code: string; name: string; isActive: boolean } | null;
  zone: { id: string; code: string; name: string } | null;
  zonePart: { id: string; code: string; name: string; displayColor: string; isActive: boolean } | null;
  contractor: { id: string; code: string; name: string };
}

export interface ActivityFilters {
  date: string;
  zoneId?: string;
  contractorId?: string;
  status?: string;
}

export interface CreateActivityInput {
  zoneId: string;
  zonePartId?: string | null;
  contractorId: string;
  workDate: string;
  title: string;
  description?: string;
  status: ActivityStatus;
  manpower: number;
  progressPercent: number;
  startTime?: string;
  endTime?: string;
}
