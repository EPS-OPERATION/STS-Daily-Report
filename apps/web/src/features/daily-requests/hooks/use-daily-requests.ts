import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dailyRequestApi, dailyRequestKeys } from "../api/daily-request.api.js";

export function useDailyRequests(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: dailyRequestKeys.dailyRequests(projectId ?? "", from, to),
    queryFn: () => dailyRequestApi.dailyRequests(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

// Permits with location photos for a date range (the Today feed; dashboard highlights; High-Risk cards).
export function usePermitNotices(projectId: string | null, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: dailyRequestKeys.permitNotices(projectId ?? "", from, to),
    queryFn: () => dailyRequestApi.permitNotices(projectId!, from, to),
    enabled: Boolean(projectId) && enabled,
    placeholderData: keepPreviousData,
    // Presigned photo links last an hour: refresh a little before that, and when the tab is revisited.
    staleTime: 5 * 60_000,
  });
}
