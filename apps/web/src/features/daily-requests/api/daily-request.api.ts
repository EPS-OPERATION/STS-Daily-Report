import { http } from "@/services/http/client.js";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import type { CreatePermitPayload, DailyRequests, MachineSummary, ReportRoadUsage, UpdatePermitPayload } from "../types/daily-request.types.js";

export const dailyRequestKeys = {
  dailyRequests: (projectId: string, from: string, to: string) => [...REPORT_KEYS.requestLists, "daily", projectId, from, to] as const,
  machineSummary: (projectId: string, from: string, to: string) => [...REPORT_KEYS.requestLists, "machines", projectId, from, to] as const,
};

export const dailyRequestApi = {
  adjustRoadUsage(projectId: string, id: string, body: { startTime: string; endTime: string }): Promise<{ data: ReportRoadUsage }> {
    return http.patch(`/projects/${projectId}/daily-reports/road-usage/${id}`, body);
  },
  createPermit(projectId: string, body: CreatePermitPayload): Promise<{ data: unknown }> {
    return http.post(`/projects/${projectId}/daily-reports/permits`, body);
  },
  updatePermit(projectId: string, id: string, body: UpdatePermitPayload): Promise<{ data: unknown }> {
    return http.patch(`/projects/${projectId}/daily-reports/permits/${id}`, body);
  },
  // Machines on site (morning report) and machine bookings (afternoon Daily Request) for a date range.
  machineSummary(projectId: string, from: string, to: string): Promise<{ data: MachineSummary }> {
    return http.get(`/projects/${projectId}/machine-summary?from=${from}&to=${to}`);
  },
  dailyRequests(projectId: string, from: string, to: string): Promise<{ data: DailyRequests }> {
    return http.get(`/projects/${projectId}/daily-requests?from=${from}&to=${to}`);
  },
};
