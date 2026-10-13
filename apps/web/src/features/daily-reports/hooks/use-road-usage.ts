import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import { dailyReportKeys } from "../api/daily-report.keys.js";

// EPS settles a road booking's time. Every request list refetches, so the badges and timelines follow.
export function useAdjustRoadUsage(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; startTime: string; endTime: string }) =>
      dailyReportApi.adjustRoadUsage(projectId!, v.id, { startTime: v.startTime, endTime: v.endTime }),
    onSuccess: () => client.invalidateQueries({ queryKey: dailyReportKeys.requestLists() }),
  });
}
