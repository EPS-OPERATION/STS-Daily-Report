import { http } from "@/services/http/client.js";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import type { Building } from "../types/building.types.js";

export const buildingKeys = {
  list: (projectId: string) => [...REPORT_KEYS.all, "buildings", projectId] as const,
};

export const buildingApi = {
  list(projectId: string): Promise<{ data: Building[] }> {
    return http.get(`/projects/${projectId}/buildings`);
  },
};
