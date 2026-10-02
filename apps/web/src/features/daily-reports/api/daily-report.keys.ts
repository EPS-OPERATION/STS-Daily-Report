export const dailyReportKeys = {
  all: ["daily-reports"] as const,
  buildings: (projectId: string) => [...dailyReportKeys.all, "buildings", projectId] as const,
  currents: () => [...dailyReportKeys.all, "current"] as const,
  current: (projectId: string, date: string, contractorId?: string) =>
    [...dailyReportKeys.currents(), projectId, date, contractorId ?? "self"] as const,
  requestLists: () => [...dailyReportKeys.all, "requests"] as const,
  requests: (projectId: string, filters: { from: string; to: string; by: "inspection" | "report" }) =>
    [...dailyReportKeys.requestLists(), projectId, filters] as const,
  positionMix: (projectId: string, from: string, to: string) => [...dailyReportKeys.weeklies(), "positions", projectId, from, to] as const,
  manpower: (projectId: string, from: string, to: string) => [...dailyReportKeys.weeklies(), "manpower", projectId, from, to] as const,
  trend: (projectId: string, until: string, weeks: number) => [...dailyReportKeys.weeklies(), "trend", projectId, until, weeks] as const,
  dailyRequests: (projectId: string, from: string, to: string) => [...dailyReportKeys.requestLists(), "daily", projectId, from, to] as const,
  weeklies: () => [...dailyReportKeys.all, "weekly"] as const,
  weekly: (projectId: string, weekStart: string) => [...dailyReportKeys.weeklies(), projectId, weekStart] as const,
  reviewLists: () => [...dailyReportKeys.all, "review-queue"] as const,
  reviewQueue: (projectId: string, params: { date?: string; from?: string; to?: string } | string) =>
    [
      ...dailyReportKeys.reviewLists(),
      projectId,
      typeof params === "string" ? params : `${params.from ?? ""}_${params.to ?? ""}_${params.date ?? ""}`,
    ] as const,
  materialLists: () => [...dailyReportKeys.all, "materials"] as const,
  materials: (
    projectId: string,
    filters: { from?: string; to?: string; search?: string; contractorId?: string; page: number; pageSize: number },
  ) => [...dailyReportKeys.materialLists(), projectId, filters] as const,
};
