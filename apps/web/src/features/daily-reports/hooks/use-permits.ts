import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyReportApi } from "../api/daily-report.api.js";
import { dailyReportKeys } from "../api/daily-report.keys.js";
import type { CreatePermitPayload, UpdatePermitPayload } from "../types/daily-report.types.js";

// EPS adds a permit the contractor left out (goes on that contractor's report for the date).
export function useCreatePermit(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePermitPayload) => dailyReportApi.createPermit(projectId!, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: dailyReportKeys.requestLists() }),
  });
}

// EPS updates work permit details. Every request list refetches, updating tables and high-risk task cards.
export function useUpdatePermit(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdatePermitPayload) =>
      dailyReportApi.updatePermit(projectId!, id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: dailyReportKeys.requestLists() }),
  });
}
