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
  WeeklySummary,
} from "../types/daily-report.types.js";

export const dailyReportApi = {
  buildings(projectId: string): Promise<{ data: Building[] }> {
    return http.get(`/projects/${projectId}/buildings`);
  },
  current(projectId: string, date: string): Promise<CurrentReportResponse> {
    return http.get(`/projects/${projectId}/daily-reports/current?date=${date}`);
  },
  submitMorning(projectId: string, payload: MorningPayload): Promise<{ data: DailyReport }> {
    return http.put(`/projects/${projectId}/daily-reports/morning`, payload);
  },
  submitEvening(reportId: string, payload: EveningPayload): Promise<{ data: DailyReport }> {
    return http.put(`/daily-reports/${reportId}/evening`, payload);
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
};
