import { http } from "@/services/http/client.js";
import type {
  ActiveFilter,
  Facility,
  FacilityMarker,
  FacilityPart,
  FacilityPlacement,
  FacilitySummary,
  MapView,
  SiteActivityFilters,
  SiteActivityInput,
  SiteActivityRecord,
  SiteMap,
} from "@/types/site-operations.types.js";

function query(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
  return params.size ? "?" + params.toString() : "";
}
type Data<T> = { data: T };
export const siteOperationsApi = {
  maps: (projectId: string, status: ActiveFilter = "active") =>
    http.get<Data<SiteMap[]>>(`/projects/${projectId}/site-maps${query({ status })}`),
  saveMap: (
    projectId: string,
    id: string | null,
    input: { name: string; description?: string; isDefault?: boolean; isActive?: boolean },
  ) =>
    id
      ? http.patch<Data<SiteMap>>(`/site-maps/${id}`, input)
      : http.post<Data<SiteMap>>(`/projects/${projectId}/site-maps`, input),
  archiveMap: (id: string) => http.delete<void>(`/site-maps/${id}`),
  views: (mapId: string, status: ActiveFilter = "active") =>
    http.get<Data<MapView[]>>(`/site-maps/${mapId}/views${query({ status })}`),
  saveView: (mapId: string, id: string | null, input: { name: string; sortOrder: number; isActive: boolean }) =>
    id
      ? http.patch<Data<MapView>>(`/site-map-views/${id}`, input)
      : http.post<Data<MapView>>(`/site-maps/${mapId}/views`, input),
  archiveView: (id: string) => http.delete<void>(`/site-map-views/${id}`),
  uploadImage: (id: string, file: File, width: number, height: number) => {
    const form = new FormData();
    form.set("file", file);
    form.set("width", String(width));
    form.set("height", String(height));
    return http.upload<Data<MapView>>(`/site-map-views/${id}/image`, form);
  },
  facilities: (projectId: string, status: ActiveFilter = "active", search?: string) =>
    http.get<Data<Facility[]>>(`/projects/${projectId}/facilities${query({ status, search })}`),
  saveFacility: (
    projectId: string,
    id: string | null,
    input: { name: string; code?: string; sortOrder?: number; isActive?: boolean },
  ) =>
    id
      ? http.patch<Data<Facility>>(`/facilities/${id}`, input)
      : http.post<Data<Facility>>(`/projects/${projectId}/facilities`, input),
  archiveFacility: (id: string) => http.delete<void>(`/facilities/${id}`),
  markers: (viewId: string, includeInactive = false) =>
    http.get<Data<FacilityMarker[]>>(`/site-map-views/${viewId}/markers${query({ includeInactive })}`),
  saveMarkers: (viewId: string, markers: { facilityId: string; x: number | null; y: number | null }[]) =>
    http.put<Data<FacilityMarker[]>>(`/site-map-views/${viewId}/markers`, { markers }),
  placements: (facilityId: string) => http.get<Data<FacilityPlacement[]>>(`/facilities/${facilityId}/map-placements`),
  parts: (facilityId: string, status: ActiveFilter = "active") =>
    http.get<Data<FacilityPart[]>>(`/facilities/${facilityId}/parts${query({ status })}`),
  savePart: (
    facilityId: string,
    id: string | null,
    input: { name: string; code: string; sortOrder: number; isActive: boolean },
  ) =>
    id
      ? http.patch<Data<FacilityPart>>(`/facility-parts/${id}`, input)
      : http.post<Data<FacilityPart>>(`/facilities/${facilityId}/parts`, input),
  archivePart: (id: string) => http.delete<void>(`/facility-parts/${id}`),
  activities: (projectId: string, filters: SiteActivityFilters) =>
    http.get<Data<SiteActivityRecord[]> & { meta: { page: number; pageSize: number; total: number } }>(
      `/projects/${projectId}/activities${query({ ...filters })}`,
    ),
  summaries: (projectId: string, filters: SiteActivityFilters) =>
    http.get<Data<FacilitySummary[]>>(`/projects/${projectId}/activity-summaries${query({ ...filters })}`),
  activity: (id: string) => http.get<Data<SiteActivityRecord>>(`/activities/${id}`),
  saveActivity: (projectId: string, id: string | null, input: SiteActivityInput) =>
    id
      ? http.patch<Data<SiteActivityRecord>>(`/activities/${id}`, input)
      : http.post<Data<SiteActivityRecord>>(`/projects/${projectId}/activities`, input),
};
