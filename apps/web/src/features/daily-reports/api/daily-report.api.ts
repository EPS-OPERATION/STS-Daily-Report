import type { CoordinationSectionCatalog, PhotoCategory } from "@sts/shared";
import { http } from "@/services/http/client.js";
import type {
  CurrentReportResponse,
  DailyReport,
  EveningPayload,
  MorningPayload,
  PrintReport,
  ReviewPayload,
  ReviewQueueRow,
} from "../types/daily-report.types.js";

export const dailyReportApi = {
  // Route sections offered as places in the form (Map → Route sections).
  routeSections(projectId: string): Promise<{ data: CoordinationSectionCatalog }> {
    return http.get(`/projects/${projectId}/coordination/sections`);
  },
  printReport(reportId: string): Promise<{ data: PrintReport }> {
    return http.get(`/daily-reports/${reportId}/print`);
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
  uploadPhoto(reportId: string, category: PhotoCategory, file: File, permitKey?: string): Promise<{ data: { id: string } }> {
    const form = new FormData();
    form.set("category", category);
    form.set("file", file);
    if (permitKey) form.set("permitKey", permitKey);
    return http.upload(`/daily-reports/${reportId}/photos`, form);
  },
  deletePhoto(reportId: string, photoId: string): Promise<null> {
    return http.delete(`/daily-reports/${reportId}/photos/${photoId}`);
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
};
