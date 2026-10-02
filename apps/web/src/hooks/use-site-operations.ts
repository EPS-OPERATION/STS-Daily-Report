import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { siteOperationsApi as api } from "@/services/site-operations.api.js";
import type { ActiveFilter, SiteActivityFilters } from "@/types/site-operations.types.js";
import { siteOperationKeys } from "@/consts/query-keys/site-operations.js";
export function useSiteMaps(projectId: string | null, status: ActiveFilter = "active") {
  return useQuery({
    queryKey: siteOperationKeys.maps(projectId ?? "none", status),
    queryFn: () => api.maps(projectId!, status),
    enabled: !!projectId,
  });
}
export function useFacilities(projectId: string | null, status: ActiveFilter = "active") {
  return useQuery({
    queryKey: siteOperationKeys.facilities(projectId ?? "none", status),
    queryFn: () => api.facilities(projectId!, status),
    enabled: !!projectId,
  });
}
export function useMapViews(projectId: string | null, mapId: string | null, status: ActiveFilter = "active") {
  return useQuery({
    queryKey: siteOperationKeys.views(projectId ?? "none", mapId ?? "none", status),
    queryFn: () => api.views(mapId!, status),
    enabled: !!projectId && !!mapId,
    refetchInterval: 600_000,
  });
}
export function useFacilityMarkers(projectId: string | null, viewId: string | null, all = false) {
  return useQuery({
    queryKey: siteOperationKeys.markers(projectId ?? "none", viewId ?? "none", all),
    queryFn: () => api.markers(viewId!, all),
    enabled: !!projectId && !!viewId,
  });
}
export function useFacilityParts(projectId: string | null, facilityId: string | null, status: ActiveFilter = "active") {
  return useQuery({
    queryKey: siteOperationKeys.parts(projectId ?? "none", facilityId ?? "none", status),
    queryFn: () => api.parts(facilityId!, status),
    enabled: !!projectId && !!facilityId,
  });
}
export function useFacilityPlacements(projectId: string | null, facilityId: string | null) {
  return useQuery({
    queryKey: siteOperationKeys.placements(projectId ?? "none", facilityId ?? "none"),
    queryFn: () => api.placements(facilityId!),
    enabled: !!projectId && !!facilityId,
  });
}
export function useFacilityActivities(projectId: string | null, filters: SiteActivityFilters, enabled = true) {
  return useQuery({
    queryKey: siteOperationKeys.activities(projectId ?? "none", filters),
    queryFn: () => api.activities(projectId!, filters),
    enabled: !!projectId && enabled,
  });
}
export function useFacilitySummaries(projectId: string | null, filters: SiteActivityFilters, enabled = true) {
  return useQuery({
    queryKey: siteOperationKeys.summaries(projectId ?? "none", filters),
    queryFn: () => api.summaries(projectId!, filters),
    enabled: !!projectId && enabled,
    placeholderData: keepPreviousData,
  });
}
export function useActivityDetail(id: string | null) {
  return useQuery({
    queryKey: siteOperationKeys.activity(id ?? "none"),
    queryFn: () => api.activity(id!),
    enabled: !!id,
  });
}
