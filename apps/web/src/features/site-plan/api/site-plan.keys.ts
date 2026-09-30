export const sitePlanKeys = {
  all: ["site-plan"] as const,
  plan: (projectId: string, sitePlanId?: string) =>
    sitePlanId
      ? ([...sitePlanKeys.all, "plan", projectId, sitePlanId] as const)
      : ([...sitePlanKeys.all, "plan", projectId] as const),
  plans: (projectId: string) => [...sitePlanKeys.all, "plans", projectId] as const,
  zones: (projectId: string) => [...sitePlanKeys.all, "zones", projectId] as const,
  activities: (projectId: string, filters: { date: string; zoneId?: string; contractorId?: string; status?: string }) =>
    [...sitePlanKeys.all, "activities", projectId, filters] as const,
};
