import type { InspectionResult, PhotoCategory, RequestStatus } from "@sts/shared";
import { http } from "@/services/http/client.js";
import type {
  Building,
  CurrentReportResponse,
  DailyReport,
  EveningPayload,
  InspectionRequest,
  InspectionRequestFields,
  MorningPayload,
  ReviewPayload,
  ReviewQueueRow,
  WeeklySummary,
  PositionMixRow,
  ManpowerTrendPoint,
  ManpowerSummary,
  DailyRequests,
} from "../types/daily-report.types.js";

export const dailyReportApi = {
  buildings(projectId: string): Promise<{ data: Building[] }> {
    return http.get(`/projects/${projectId}/buildings`);
  },
  current(projectId: string, date: string, contractorId?: string): Promise<CurrentReportResponse> {
    const q = contractorId ? `?date=${date}&contractorId=${contractorId}` : `?date=${date}`;
    return http.get(`/projects/${projectId}/daily-reports/current${q}`);
  },
  submitMorning(projectId: string, payload: MorningPayload): Promise<{ data: DailyReport }> {
    return http.put(`/projects/${projectId}/daily-reports/morning`, payload);
  },
  submitEvening(projectId: string, payload: EveningPayload): Promise<{ data: DailyReport }> {
    return http.put(`/projects/${projectId}/daily-reports/evening`, payload);
  },
  // Empty draft row (photos need a report id before either shift is sent).
  ensureDraft(projectId: string, date: string, contractorId: string): Promise<{ data: DailyReport }> {
    return http.post(`/projects/${projectId}/daily-reports/draft`, { date, contractorId });
  },
  uploadPhoto(reportId: string, category: PhotoCategory, file: File): Promise<{ data: { id: string } }> {
    const form = new FormData();
    form.set("category", category);
    form.set("file", file);
    return http.upload(`/daily-reports/${reportId}/photos`, form);
  },
  deletePhoto(reportId: string, photoId: string): Promise<null> {
    return http.delete(`/daily-reports/${reportId}/photos/${photoId}`);
  },
  requests(
    projectId: string,
    filters: { from: string; to: string; by: "inspection" | "report" },
  ): Promise<{ data: InspectionRequest[] }> {
    return http.get(`/projects/${projectId}/inspection-requests?from=${filters.from}&to=${filters.to}&by=${filters.by}`);
  },
  createRequest(
    projectId: string,
    input: InspectionRequestFields & { contractorId: string; reportDate: string },
  ): Promise<{ data: InspectionRequest }> {
    return http.post(`/projects/${projectId}/inspection-requests`, input);
  },
  updateRequest(requestId: string, input: InspectionRequestFields): Promise<{ data: InspectionRequest }> {
    return http.put(`/inspection-requests/${requestId}`, input);
  },
  deleteRequest(requestId: string): Promise<null> {
    return http.delete(`/inspection-requests/${requestId}`);
  },
  transitionRequest(
    requestId: string,
    input: { to: RequestStatus; result?: InspectionResult; note?: string },
  ): Promise<{ data: InspectionRequest }> {
    return http.post(`/inspection-requests/${requestId}/transition`, input);
  },
  weeklySummary(projectId: string, weekStart: string): Promise<{ data: WeeklySummary }> {
    return http.get(`/projects/${projectId}/weekly-summary?weekStart=${weekStart}`);
  },
  // EPS review queue: one row per contractor report for a date or date range (role-scoped server-side).
  reviewQueue(
    projectId: string,
    params: { date?: string; from?: string; to?: string } | string,
  ): Promise<{ data: ReviewQueueRow[] }> {
    const q =
      typeof params === "string"
        ? `date=${params}`
        : params.from && params.to
          ? `from=${params.from}&to=${params.to}`
          : `date=${params.date ?? params.from ?? ""}`;
    return http.get(`/projects/${projectId}/daily-reports/review-queue?${q}`);
  },
  // EPS-only decision on a submitted report (403 for contractor role).
  reviewReport(reportId: string, payload: ReviewPayload): Promise<{ data: DailyReport }> {
    return http.post(`/daily-reports/${reportId}/review`, payload);
  },
  positionMix(projectId: string, from: string, to: string): Promise<{ data: PositionMixRow[] }> {
    return http.get(`/projects/${projectId}/position-mix?from=${from}&to=${to}`);
  },
  manpowerSummary(projectId: string, from: string, to: string): Promise<{ data: ManpowerSummary }> {
    return http.get(`/projects/${projectId}/manpower-summary?from=${from}&to=${to}`);
  },
  manpowerTrend(projectId: string, until: string, weeks: number): Promise<{ data: ManpowerTrendPoint[] }> {
    return http.get(`/projects/${projectId}/manpower-trend?until=${until}&weeks=${weeks}`);
  },
  dailyRequests(projectId: string, from: string, to: string): Promise<{ data: DailyRequests }> {
    return http.get(`/projects/${projectId}/daily-requests?from=${from}&to=${to}`);
  },
};
