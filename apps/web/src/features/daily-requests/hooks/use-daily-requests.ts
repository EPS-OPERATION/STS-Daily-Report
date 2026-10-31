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

export function useMachineSummary(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: dailyRequestKeys.machineSummary(projectId ?? "", from, to),
    queryFn: () => dailyRequestApi.machineSummary(projectId!, from, to).then((r) => r.data),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
