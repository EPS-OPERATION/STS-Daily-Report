import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportSummaryApi, reportSummaryKeys } from "../api/report-summary.api.js";

export function useWeeklySummary(projectId: string | null, weekStart: string) {
  return useQuery({
    queryKey: reportSummaryKeys.weekly(projectId ?? "", weekStart),
    queryFn: () => reportSummaryApi.weeklySummary(projectId!, weekStart),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function usePositionMix(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: reportSummaryKeys.positionMix(projectId ?? "", from, to),
    queryFn: () => reportSummaryApi.positionMix(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useManpowerSummary(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: reportSummaryKeys.manpower(projectId ?? "", from, to),
    queryFn: () => reportSummaryApi.manpowerSummary(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useMaterials(projectId: string | null, filters: MaterialsFilters) {
  return useQuery({
    queryKey: reportSummaryKeys.materials(projectId ?? "", filters),
    queryFn: () => reportSummaryApi.materials(projectId!, filters),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export interface MaterialsFilters {
  from?: string;
  to?: string;
  search?: string;
  contractorId?: string;
  page: number;
  pageSize: number;
}
