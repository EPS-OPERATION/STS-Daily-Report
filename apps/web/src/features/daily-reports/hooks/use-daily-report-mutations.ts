import type { InspectionResult, PhotoCategory, RequestStatus } from "@sts/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import { dailyReportKeys } from "../api/daily-report.keys.js";
import type { EveningPayload, InspectionRequestFields, MorningPayload } from "../types/daily-report.types.js";

// Every write refreshes the current report and any open weekly summary.
function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.currents() });
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.weeklies() });
    void queryClient.invalidateQueries({ queryKey: dailyReportKeys.requestLists() });
  };
}

export function useSubmitMorning(projectId: string | null) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (payload: MorningPayload) => dailyReportApi.submitMorning(projectId!, payload),
    onSuccess: invalidate,
  });
}

export function useSubmitEvening() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: EveningPayload }) =>
      dailyReportApi.submitEvening(reportId, payload),
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
