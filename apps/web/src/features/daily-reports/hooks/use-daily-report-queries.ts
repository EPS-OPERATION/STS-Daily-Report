import type { CoordinationSectionCatalog } from "@sts/shared";
import { useMemo } from "react";
import { sectionsAsPlaces } from "../utils/location.js";
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

// Route sections of the project's Map areas (with each area's picture for the form's mini map).
export function useRouteSections(projectId: string | null) {
  const query = useQuery({
    queryKey: dailyReportKeys.routeSections(projectId ?? ""),
    queryFn: () => dailyReportApi.routeSections(projectId!),
    enabled: Boolean(projectId),
    staleTime: 5 * 60_000,
    select: (res) => res.data,
  });
  return query.data ?? NO_SECTIONS;
}
const NO_SECTIONS: CoordinationSectionCatalog = { maps: [], sections: [] };

// The same sections as extra places in the "where" pickers of extra work and tomorrow's plan (after the buildings).
export function useRouteSectionPlaces(projectId: string | null) {
  const catalog = useRouteSections(projectId);
  return useMemo(() => sectionsAsPlaces(catalog), [catalog]);
}
