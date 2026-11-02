import { REPORT_KEYS } from "@/lib/report-query-keys.js";

export const dailyReportKeys = {
  routeSections: (projectId: string) => [...REPORT_KEYS.all, "route-sections", projectId] as const,
  print: (reportId: string) => [...REPORT_KEYS.all, "print", reportId] as const,
  current: (projectId: string, date: string, contractorId?: string) =>
    [...REPORT_KEYS.currents, projectId, date, contractorId ?? "self"] as const,
  reviewQueue: (projectId: string, params: { date?: string; from?: string; to?: string } | string) =>
    [
      ...REPORT_KEYS.reviewLists,
      projectId,
      typeof params === "string" ? params : `${params.from ?? ""}_${params.to ?? ""}_${params.date ?? ""}`,
    ] as const,
};
