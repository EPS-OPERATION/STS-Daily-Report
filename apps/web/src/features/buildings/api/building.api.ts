import { http } from "@/services/http/client.js";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import type { Building, BuildingInput, ManagedBuilding } from "../types/building.types.js";

export const buildingKeys = {
  list: (projectId: string) => [...REPORT_KEYS.all, "buildings", projectId] as const,
  manage: (projectId: string) => [...REPORT_KEYS.all, "buildings", projectId, "manage"] as const,
};

export const buildingApi = {
  list(projectId: string): Promise<{ data: Building[] }> {
    return http.get(`/projects/${projectId}/buildings`);
  },
  manage(projectId: string): Promise<{ data: ManagedBuilding[] }> {
    return http.get(`/projects/${projectId}/buildings/manage`);
  },
  create(projectId: string, input: BuildingInput): Promise<{ data: Building }> {
    return http.post(`/projects/${projectId}/buildings`, input);
  },
  update(projectId: string, id: string, input: Partial<BuildingInput> & { status?: "active" | "inactive" }): Promise<{ data: Building }> {
    return http.patch(`/projects/${projectId}/buildings/${id}`, input);
  },
  reorder(projectId: string, ids: string[]): Promise<{ data: ManagedBuilding[] }> {
    return http.put(`/projects/${projectId}/buildings/order`, { ids });
  },
};
