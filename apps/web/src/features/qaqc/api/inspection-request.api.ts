import type { InspectionResult, RequestStatus } from "@sts/shared";
import { http } from "@/services/http/client.js";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import type { InspectionRequest, InspectionRequestFields } from "../types/inspection-request.types.js";

export const inspectionRequestKeys = {
  requests: (projectId: string, filters: { from: string; to: string; by: "inspection" | "report" }) =>
    [...REPORT_KEYS.requestLists, projectId, filters] as const,
};

export const inspectionRequestApi = {
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
};
