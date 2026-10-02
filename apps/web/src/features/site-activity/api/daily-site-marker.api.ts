import { http } from "@/services/http/client.js";
import type {
  CreateDailySiteMarkerInput,
  DailySiteMarker,
  DailySiteMarkerFilters,
  UpdateDailySiteMarkerInput,
} from "../types/daily-site-marker.types.js";

function query(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, value);
  return params.size ? `?${params.toString()}` : "";
}

type Data<T> = { data: T };

export const dailySiteMarkerApi = {
  list: (projectId: string, viewId: string, workDate: string, filters: DailySiteMarkerFilters = {}) =>
    http.get<Data<DailySiteMarker[]>>(
      `/projects/${projectId}/daily-site-markers${query({ siteMapViewId: viewId, workDate, ...filters })}`,
    ),
  create: (projectId: string, input: CreateDailySiteMarkerInput) =>
    http.post<Data<DailySiteMarker>>(`/projects/${projectId}/daily-site-markers`, input),
  update: (id: string, input: UpdateDailySiteMarkerInput) =>
    http.patch<Data<DailySiteMarker>>(`/daily-site-markers/${id}`, input),
  withdraw: (id: string) => http.post<Data<DailySiteMarker>>(`/daily-site-markers/${id}/withdraw`, {}),
};
