export type ActivityStatus = "active" | "attention" | "blocked" | "completed";
export type ZoneState = ActivityStatus | "idle";

export interface ZoneOption {
  id: string;
  projectId: string;
  parentId: string | null;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  status: string;
}

export interface GeometryPoint {
  x: number;
  y: number;
}

export interface PolygonGeometry {
  type: "polygon";
  points: GeometryPoint[];
}

export interface PlanArea {
  id: string;
  zone: { id: string; code: string; name: string; parentId: string | null; sortOrder: number };
  geometry: PolygonGeometry;
  defaultGeometry: PolygonGeometry | null;
  isCustom: boolean;
}

export interface SitePlan {
  id: string;
  projectId: string;
  name: string;
  background: { objectKey: string | null; url: string | null; width: number | null; height: number | null };
  areas: PlanArea[];
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
  zone: { id: string; code: string; name: string };
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
