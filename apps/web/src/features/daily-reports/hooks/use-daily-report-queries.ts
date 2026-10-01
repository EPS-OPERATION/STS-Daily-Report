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

export function useReviewQueue(projectId: string | null, date: string) {
  return useQuery({
    queryKey: dailyReportKeys.reviewQueue(projectId ?? "", date),
    queryFn: () => dailyReportApi.reviewQueue(projectId!, date),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function usePositionMix(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: dailyReportKeys.positionMix(projectId ?? "", from, to),
    queryFn: () => dailyReportApi.positionMix(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useManpowerTrend(projectId: string | null, until: string, weeks = 12) {
  return useQuery({
    queryKey: dailyReportKeys.trend(projectId ?? "", until, weeks),
    queryFn: () => dailyReportApi.manpowerTrend(projectId!, until, weeks),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useManpowerSummary(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: dailyReportKeys.manpower(projectId ?? "", from, to),
    queryFn: () => dailyReportApi.manpowerSummary(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
