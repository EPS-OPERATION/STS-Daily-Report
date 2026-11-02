import { http } from "@/services/http/client.js";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import type { ManpowerSummary, MaterialsSummary, PositionMixRow, WeeklySummary } from "../types/report-summary.types.js";

type MaterialsQuery = { from?: string; to?: string; search?: string; contractorId?: string; page: number; pageSize: number };

export const reportSummaryKeys = {
  weekly: (projectId: string, weekStart: string) => [...REPORT_KEYS.weeklies, projectId, weekStart] as const,
  positionMix: (projectId: string, from: string, to: string) => [...REPORT_KEYS.weeklies, "positions", projectId, from, to] as const,
  manpower: (projectId: string, from: string, to: string) => [...REPORT_KEYS.weeklies, "manpower", projectId, from, to] as const,
  materials: (projectId: string, filters: MaterialsQuery) => [...REPORT_KEYS.materialLists, projectId, filters] as const,
};

export const reportSummaryApi = {
  weeklySummary(projectId: string, weekStart: string): Promise<{ data: WeeklySummary }> {
    return http.get(`/projects/${projectId}/weekly-summary?weekStart=${weekStart}`);
  },
  positionMix(projectId: string, from: string, to: string): Promise<{ data: PositionMixRow[] }> {
    return http.get(`/projects/${projectId}/position-mix?from=${from}&to=${to}`);
  },
  manpowerSummary(projectId: string, from: string, to: string): Promise<{ data: ManpowerSummary }> {
    return http.get(`/projects/${projectId}/manpower-summary?from=${from}&to=${to}`);
  },
  materials(projectId: string, filters: MaterialsQuery): Promise<{ data: MaterialsSummary }> {
    const q = new URLSearchParams();
    if (filters.from) q.set("from", filters.from);
    if (filters.to) q.set("to", filters.to);
    if (filters.search) q.set("search", filters.search);
    if (filters.contractorId) q.set("contractorId", filters.contractorId);
    q.set("page", String(filters.page));
    q.set("pageSize", String(filters.pageSize));
    return http.get(`/projects/${projectId}/daily-reports/materials?${q.toString()}`);
  },
};
