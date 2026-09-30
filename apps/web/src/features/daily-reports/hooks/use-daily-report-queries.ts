import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import { dailyReportKeys } from "../api/daily-report.keys.js";

export function useBuildings(projectId: string | null) {
  return useQuery({
    queryKey: dailyReportKeys.buildings(projectId ?? ""),
    queryFn: () => dailyReportApi.buildings(projectId!),
    enabled: Boolean(projectId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCurrentReport(projectId: string | null, date: string) {
  return useQuery({
    queryKey: dailyReportKeys.current(projectId ?? "", date),
    queryFn: () => dailyReportApi.current(projectId!, date),
    enabled: Boolean(projectId),
  });
}

export function useInspectionRequests(
  projectId: string | null,
  filters: { from: string; to: string; by: "inspection" | "report" },
) {
  return useQuery({
    queryKey: dailyReportKeys.requests(projectId ?? "", filters),
    queryFn: () => dailyReportApi.requests(projectId!, filters),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useWeeklySummary(projectId: string | null, weekStart: string) {
  return useQuery({
    queryKey: dailyReportKeys.weekly(projectId ?? "", weekStart),
    queryFn: () => dailyReportApi.weeklySummary(projectId!, weekStart),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
