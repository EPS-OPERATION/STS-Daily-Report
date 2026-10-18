import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import { dailyReportKeys } from "../api/daily-report.keys.js";

export function usePrintReport(reportId: string | null) {
  return useQuery({
    queryKey: dailyReportKeys.print(reportId ?? ""),
    queryFn: () => dailyReportApi.printReport(reportId!),
    enabled: Boolean(reportId),
    staleTime: 0,
  });
}

// Several printable reports at once (combined R003 export), in the order given.
export function usePrintReports(reportIds: string[]) {
  return useQueries({
    queries: reportIds.map((id) => ({
      queryKey: dailyReportKeys.print(id),
      queryFn: () => dailyReportApi.printReport(id),
      staleTime: 0,
    })),
  });
}

export function useCurrentReport(projectId: string | null, date: string, contractorId?: string, enabled = true) {
  return useQuery({
    queryKey: dailyReportKeys.current(projectId ?? "", date, contractorId),
    queryFn: () => dailyReportApi.current(projectId!, date, contractorId),
    enabled: Boolean(projectId && date && enabled),
  });
}

export function useReviewQueue(
  projectId: string | null,
  params: { date?: string; from?: string; to?: string } | string,
) {
  return useQuery({
    queryKey: dailyReportKeys.reviewQueue(projectId ?? "", params),
    queryFn: () => dailyReportApi.reviewQueue(projectId!, params),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
