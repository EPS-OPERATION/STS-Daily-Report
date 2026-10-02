import type { InspectionRequest, ReportEquipmentRequest, ReportRoadUsage } from "@/features/daily-reports/index.js";

export type SiteMapView = "overview" | "topview" | "plan";
export const SITE_MAP_VIEW_LIST: SiteMapView[] = ["overview", "topview", "plan"];

export interface MapPoint {
  x: number; // 0..1 of image width
  y: number; // 0..1 of image height
}

export interface WorkPart {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
  markers: Record<SiteMapView, MapPoint | null>;
}

export interface SiteMapBuilding {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  markers: Record<SiteMapView, MapPoint | null>;
  parts: WorkPart[];
}

export interface PartInput {
  code: string;
  name: string;
  status: "active" | "inactive";
}

export interface SiteDayBuilding {
  id: string;
  code: string;
  name: string;
  nameTh: string | null;
  /** people on one day; man-days when the range spans several days */
  headcount: number;
  /** average people per reported day */
  avgDaily: number;
  contractors: string[];
  activities: {
    reportDate: string;
    buildingId: string;
    contractorCode: string;
    contractorName: string;
    headcount: number;
    workDescription: string;
    planPercent: number;
    actualPercent: number | null;
  }[];
  machinery: {
    id: string;
    targetDate: string;
    machineType: string;
    unitTag: string | null;
    startTime: string | null;
    endTime: string | null;
    purpose: string | null;
    contractorCode: string;
    conflict: boolean;
  }[];
  equipment: ReportEquipmentRequest[];
  roads: ReportRoadUsage[];
  permits: { buildingId: string; permitType: string; workers: number }[];
  inspections: InspectionRequest[];
}

export interface SiteDay {
  date: string;
  from: string;
  to: string;
  /** days with at least one morning report in the range */
  reportedDays: number;
  buildings: SiteDayBuilding[];
}

export const SITE_MAP_IMAGES: Record<SiteMapView, { src: string; label: string }> = {
  overview: { src: "/site-plan/site-model-iso.png", label: "Overview (3D)" },
  topview: { src: "/site-plan/site-model-topdown.png", label: "Top view" },
  plan: { src: "/site-plan/site-plan-drawing.png", label: "Plan (แบบ)" },
};
