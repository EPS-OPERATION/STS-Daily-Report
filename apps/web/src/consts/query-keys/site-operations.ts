import type { ActiveFilter, SiteActivityFilters } from "@/types/site-operations.types.js";

export const siteOperationKeys = {
  project: (id: string) => ["site-operations", id] as const,
  maps: (id: string, status: ActiveFilter) => ["site-operations", id, "maps", status] as const,
  facilities: (id: string, status: ActiveFilter) => ["site-operations", id, "facilities", status] as const,
  views: (id: string, mapId: string, status: ActiveFilter) => ["site-operations", id, "views", mapId, status] as const,
  markers: (id: string, viewId: string, all: boolean) => ["site-operations", id, "markers", viewId, all] as const,
  parts: (id: string, facilityId: string, status: ActiveFilter) =>
    ["site-operations", id, "parts", facilityId, status] as const,
  placements: (id: string, facilityId: string) => ["site-operations", id, "placements", facilityId] as const,
  activities: (id: string, filters: SiteActivityFilters) => ["site-operations", id, "activities", filters] as const,
  summaries: (id: string, filters: SiteActivityFilters) => ["site-operations", id, "summaries", filters] as const,
  activity: (id: string) => ["site-activity-detail", id] as const,
};
