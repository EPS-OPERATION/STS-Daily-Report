import { http } from "@/services/http/client.js";
import type {
  ActivityFilters,
  CreateActivityInput,
  PlanActivity,
  SitePlan,
  ZoneOption,
} from "../types/site-plan.types.js";

function toParams(filters: ActivityFilters): string {
  const params = new URLSearchParams();
  if (filters.date) params.set("date", filters.date);
  if (filters.zoneId) params.set("zoneId", filters.zoneId);
  if (filters.contractorId) params.set("contractorId", filters.contractorId);
  if (filters.status) params.set("status", filters.status);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const sitePlanApi = {
  getPlan(projectId: string): Promise<{ data: SitePlan }> {
    return http.get<{ data: SitePlan }>(`/projects/${projectId}/site-plan`);
  },
  listZones(projectId: string): Promise<{ data: ZoneOption[] }> {
    return http.get<{ data: ZoneOption[] }>(`/projects/${projectId}/zones`);
  },
  listActivities(projectId: string, filters: ActivityFilters): Promise<{ data: PlanActivity[] }> {
    return http.get<{ data: PlanActivity[] }>(`/projects/${projectId}/activities${toParams(filters)}`);
  },
  createActivity(projectId: string, input: CreateActivityInput): Promise<{ data: PlanActivity }> {
    return http.post<{ data: PlanActivity }>(`/projects/${projectId}/activities`, input);
  },
};
