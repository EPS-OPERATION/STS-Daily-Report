import { http } from "@/services/http/client.js";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import type { DailyRequests, ReportRoadUsage } from "../types/daily-request.types.js";

export const dailyRequestKeys = {
  dailyRequests: (projectId: string, from: string, to: string) => [...REPORT_KEYS.requestLists, "daily", projectId, from, to] as const,
};

export const dailyRequestApi = {
  adjustRoadUsage(projectId: string, id: string, body: { startTime: string; endTime: string }): Promise<{ data: ReportRoadUsage }> {
    return http.patch(`/projects/${projectId}/daily-reports/road-usage/${id}`, body);
  },
  dailyRequests(projectId: string, from: string, to: string): Promise<{ data: DailyRequests }> {
    return http.get(`/projects/${projectId}/daily-requests?from=${from}&to=${to}`);
  },
};
