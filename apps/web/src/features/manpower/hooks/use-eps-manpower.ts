import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REPORT_KEYS } from "@/lib/report-query-keys.js";
import { epsManpowerApi } from "../api/eps-manpower.api.js";
import { epsManpowerKeys } from "../api/eps-manpower.keys.js";
import type { EpsManpowerPayload } from "../types/eps-manpower.types.js";

export function useEpsManpowerEntry(projectId: string | null, date: string, enabled = true) {
  return useQuery({
    queryKey: epsManpowerKeys.entry(projectId ?? "none", date),
    queryFn: () => epsManpowerApi.get(projectId!, date),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useSaveEpsManpower(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EpsManpowerPayload) => epsManpowerApi.save(projectId!, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: epsManpowerKeys.all });
      // Manpower, position mix, weekly summary, site-day and the dashboard all read this data.
      void queryClient.invalidateQueries({ queryKey: REPORT_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ["site-plan"] });
    },
  });
}
