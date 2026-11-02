import { useMutation, useQueryClient } from "@tanstack/react-query";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import { dailyRequestApi } from "../api/daily-request.api.js";
import type { CreatePermitPayload, UpdatePermitPayload } from "../types/daily-request.types.js";

// EPS adds a permit the contractor left out (goes on that contractor's report for the date).
export function useCreatePermit(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePermitPayload) => dailyRequestApi.createPermit(projectId!, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: REPORT_KEYS.requestLists }),
  });
}

// EPS updates work permit details. Every request list refetches, updating tables and high-risk task cards.
export function useUpdatePermit(projectId: string | null) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdatePermitPayload) => dailyRequestApi.updatePermit(projectId!, id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: REPORT_KEYS.requestLists }),
  });
}
