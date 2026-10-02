export const sitePlanKeys = {
  all: ["site-plan"] as const,
  plan: (projectId: string) => [...sitePlanKeys.all, "plan", projectId] as const,
  siteMap: (projectId: string) => [...sitePlanKeys.all, "site-map", projectId] as const,
  siteDay: (projectId: string, from: string, to: string) => [...sitePlanKeys.all, "site-day", projectId, from, to] as const,
  zones: (projectId: string) => [...sitePlanKeys.all, "zones", projectId] as const,
  activities: (projectId: string, filters: { date: string; zoneId?: string; contractorId?: string; status?: string }) =>
    [...sitePlanKeys.all, "activities", projectId, filters] as const,
};
