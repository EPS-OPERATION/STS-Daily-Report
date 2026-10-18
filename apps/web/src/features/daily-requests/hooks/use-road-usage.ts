import { useMutation, useQueryClient } from "@tanstack/react-query";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import { dailyRequestApi } from "../api/daily-request.api.js";

// EPS settles a road booking's time. Every request list refetches, so the badges and timelines follow.
export function useAdjustRoadUsage(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; startTime: string; endTime: string }) =>
      dailyRequestApi.adjustRoadUsage(projectId!, v.id, { startTime: v.startTime, endTime: v.endTime }),
    onSuccess: () => client.invalidateQueries({ queryKey: REPORT_KEYS.requestLists }),
  });
}
