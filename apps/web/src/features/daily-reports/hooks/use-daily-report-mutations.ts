import type { PhotoCategory } from "@sts/shared";
import { useMutation } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import type { EveningPayload, MorningPayload } from "../types/daily-report.types.js";
import { useInvalidateReports } from "@/lib/report-query-keys.js";

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
    mutationFn: ({ reportId, category, file, permitKey }: { reportId: string; category: PhotoCategory; file: File; permitKey?: string }) =>
      dailyReportApi.uploadPhoto(reportId, category, file, permitKey),
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
