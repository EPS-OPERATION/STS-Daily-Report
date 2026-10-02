import type { InspectionResult, PhotoCategory, RequestStatus } from "@sts/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import { dailyReportKeys } from "../api/daily-report.keys.js";
import type { EveningPayload, InspectionRequestFields, MorningPayload, ReviewPayload } from "../types/daily-report.types.js";

// Every write refreshes the current report and any open weekly summary.
function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.currents() });
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.weeklies() });
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.requestLists() });
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.reviewLists() });
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.materialLists() });
  };
}

export function useSubmitMorning(projectId: string | null) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (payload: MorningPayload) => dailyReportApi.submitMorning(projectId!, payload),
    onSuccess: invalidate,
  });
}

export function useSubmitEvening(projectId: string | null) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (payload: EveningPayload) => dailyReportApi.submitEvening(projectId!, payload),
    onSuccess: invalidate,
  });
}

export function useEnsureDraft(projectId: string | null) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (v: { date: string; contractorId: string }) => dailyReportApi.ensureDraft(projectId!, v.date, v.contractorId),
    onSuccess: invalidate,
  });
}

export function useUploadPhoto() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ reportId, category, file }: { reportId: string; category: PhotoCategory; file: File }) =>
      dailyReportApi.uploadPhoto(reportId, category, file),
    onSuccess: invalidate,
  });
}

export function useDeletePhoto() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ reportId, photoId }: { reportId: string; photoId: string }) =>
      dailyReportApi.deletePhoto(reportId, photoId),
    onSuccess: invalidate,
  });
}

export function useSaveRequest(projectId: string | null) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (
      v:
        | { id: string; fields: InspectionRequestFields }
        | { id?: undefined; fields: InspectionRequestFields; contractorId: string; reportDate: string },
    ) =>
      "contractorId" in v
        ? dailyReportApi.createRequest(projectId!, { ...v.fields, contractorId: v.contractorId, reportDate: v.reportDate })
        : dailyReportApi.updateRequest(v.id, v.fields),
    onSuccess: invalidate,
  });
}

export function useDeleteRequest() {
  const invalidate = useInvalidateReports();
  return useMutation({ mutationFn: (id: string) => dailyReportApi.deleteRequest(id), onSuccess: invalidate });
}

export function useTransitionRequest() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (v: { id: string; to: RequestStatus; result?: InspectionResult; note?: string }) =>
      dailyReportApi.transitionRequest(v.id, { to: v.to, result: v.result, note: v.note }),
    onSuccess: invalidate,
  });
}

// EPS-only daily report review (approved, or rejected with a contractor note).
export function useReviewReport() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (v: { reportId: string; payload: ReviewPayload }) => dailyReportApi.reviewReport(v.reportId, v.payload),
    onSuccess: invalidate,
  });
}
