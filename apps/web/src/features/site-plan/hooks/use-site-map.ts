import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { siteMapApi } from "../api/site-map.api.js";
import { sitePlanKeys } from "../api/site-plan.keys.js";
import type { MapPoint, PartInput, SiteMapBuilding, SiteMapView } from "../types/site-map.types.js";

export function useSiteMap(projectId: string | null) {
  return useQuery({
    queryKey: sitePlanKeys.siteMap(projectId ?? ""),
    queryFn: () => siteMapApi.map(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useSiteDay(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: sitePlanKeys.siteDay(projectId ?? "", from, to),
    queryFn: () => siteMapApi.day(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

// Admin save actions. Every write returns the full site map, which replaces the
// cache directly (no refetch flicker). Callers chain several writes for one Save.
export function useSiteMapWriter(projectId: string | null) {
  const queryClient = useQueryClient();
  const pid = projectId ?? "";
  const store = (data: SiteMapBuilding[]) => {
    queryClient.setQueryData(sitePlanKeys.siteMap(pid), { data });
    return data;
  };
  return {
    async setBuildingMarker(buildingId: string, view: SiteMapView, point: MapPoint | null) {
      const res = point
        ? await siteMapApi.placeMarker(pid, buildingId, view, point.x, point.y)
        : await siteMapApi.removeMarker(pid, buildingId, view);
      return store(res.data);
    },
    async createPart(buildingId: string, input: PartInput) {
      const res = await siteMapApi.createPart(pid, buildingId, input);
      store(res.data.map);
      return res.data.id;
    },
    async updatePart(partId: string, input: PartInput) {
      return store((await siteMapApi.updatePart(pid, partId, input)).data);
    },
    async deletePart(partId: string) {
      return store((await siteMapApi.deletePart(pid, partId)).data);
    },
    async setPartMarker(partId: string, view: SiteMapView, point: MapPoint | null) {
      const res = point
        ? await siteMapApi.placePartMarker(pid, partId, view, point.x, point.y)
        : await siteMapApi.removePartMarker(pid, partId, view);
      return store(res.data);
    },
  };
}
