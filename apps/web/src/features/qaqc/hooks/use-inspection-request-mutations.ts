import type { InspectionResult, RequestStatus } from "@sts/shared";
import { useMutation } from "@tanstack/react-query";
import { inspectionRequestApi } from "../api/inspection-request.api.js";
import type { InspectionRequestFields } from "../types/inspection-request.types.js";
import { useInvalidateReports } from "@/lib/report-query-keys.js";

export function useSaveRequest(projectId: string | null) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (
      v:
        | { id: string; fields: InspectionRequestFields }
        | { id?: undefined; fields: InspectionRequestFields; contractorId: string; reportDate: string },
    ) =>
      "contractorId" in v
        ? inspectionRequestApi.createRequest(projectId!, { ...v.fields, contractorId: v.contractorId, reportDate: v.reportDate })
        : inspectionRequestApi.updateRequest(v.id, v.fields),
    onSuccess: invalidate,
  });
}

export function useDeleteRequest() {
  const invalidate = useInvalidateReports();
  return useMutation({ mutationFn: (id: string) => inspectionRequestApi.deleteRequest(id), onSuccess: invalidate });
}

export function useTransitionRequest() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (v: { id: string; to: RequestStatus; result?: InspectionResult; note?: string }) =>
      inspectionRequestApi.transitionRequest(v.id, { to: v.to, result: v.result, note: v.note }),
    onSuccess: invalidate,
  });
}
