export const dailyReportKeys = {
  all: ["daily-reports"] as const,
  buildings: (projectId: string) => [...dailyReportKeys.all, "buildings", projectId] as const,
  currents: () => [...dailyReportKeys.all, "current"] as const,
  current: (projectId: string, date: string) => [...dailyReportKeys.currents(), projectId, date] as const,
  requestLists: () => [...dailyReportKeys.all, "requests"] as const,
  requests: (projectId: string, filters: { from: string; to: string; by: "inspection" | "report" }) =>
    [...dailyReportKeys.requestLists(), projectId, filters] as const,
  positionMix: (projectId: string, from: string, to: string) => [...dailyReportKeys.weeklies(), "positions", projectId, from, to] as const,
  manpower: (projectId: string, from: string, to: string) => [...dailyReportKeys.weeklies(), "manpower", projectId, from, to] as const,
  trend: (projectId: string, until: string, weeks: number) => [...dailyReportKeys.weeklies(), "trend", projectId, until, weeks] as const,
  weeklies: () => [...dailyReportKeys.all, "weekly"] as const,
  weekly: (projectId: string, weekStart: string) => [...dailyReportKeys.weeklies(), projectId, weekStart] as const,
  reviewLists: () => [...dailyReportKeys.all, "review-queue"] as const,
  reviewQueue: (projectId: string, date: string) => [...dailyReportKeys.reviewLists(), projectId, date] as const,
};
