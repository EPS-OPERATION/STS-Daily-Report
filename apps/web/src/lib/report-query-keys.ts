import { useQueryClient } from "@tanstack/react-query";

// Query-key families shared by the daily-report features (reports, requests, QAQC, summaries).
// Every key starts with "daily-reports", so one invalidation after a write refreshes whichever are open.
const ROOT = ["daily-reports"] as const;

export const REPORT_KEYS = {
  all: ROOT,
  currents: [...ROOT, "current"] as const,
  weeklies: [...ROOT, "weekly"] as const,
  requestLists: [...ROOT, "requests"] as const,
  reviewLists: [...ROOT, "review-queue"] as const,
  materialLists: [...ROOT, "materials"] as const,
};

// Every write refreshes the current report and any open weekly summary.
export function useInvalidateReports() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: REPORT_KEYS.currents });
    void queryClient.invalidateQueries({ queryKey: REPORT_KEYS.weeklies });
    void queryClient.invalidateQueries({ queryKey: REPORT_KEYS.requestLists });
    void queryClient.invalidateQueries({ queryKey: REPORT_KEYS.reviewLists });
    void queryClient.invalidateQueries({ queryKey: REPORT_KEYS.materialLists });
  };
}
