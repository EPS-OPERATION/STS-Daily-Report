import { http } from "@/services/http/client.js";
import type {
  ActivityFilters,
  CreateActivityInput,
  PlanActivity,
  SitePlan,
  ZoneOption,
} from "../types/site-plan.types.js";

export interface SitePlanOption {
  id: string;
  name: string;
  isDefault: boolean;
}

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
  listPlans(projectId: string): Promise<{ data: SitePlanOption[] }> {
    return http.get<{ data: SitePlanOption[] }>(`/projects/${projectId}/site-plans`);
  },
  getPlan(projectId: string, sitePlanId?: string): Promise<{ data: SitePlan }> {
    const query = sitePlanId ? `?sitePlanId=${encodeURIComponent(sitePlanId)}` : "";
    return http.get<{ data: SitePlan }>(`/projects/${projectId}/site-plan${query}`);
  },
  listZones(projectId: string, status?: "active" | "inactive" | "all"): Promise<{ data: ZoneOption[] }> {
    const query = status ? `?status=${status}` : "";
    return http.get<{ data: ZoneOption[] }>(`/projects/${projectId}/zones${query}`);
  },
  listActivities(projectId: string, filters: ActivityFilters): Promise<{ data: PlanActivity[] }> {
    return http.get<{ data: PlanActivity[] }>(`/projects/${projectId}/activities${toParams(filters)}`);
  },
  createActivity(projectId: string, input: CreateActivityInput): Promise<{ data: PlanActivity }> {
    return http.post<{ data: PlanActivity }>(`/projects/${projectId}/activities`, input);
  },
};
