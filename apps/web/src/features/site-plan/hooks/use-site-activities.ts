import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { sitePlanApi } from "../api/site-plan.api.js";
import { sitePlanKeys } from "../api/site-plan.keys.js";
import type { ActivityFilters } from "../types/site-plan.types.js";

export function useSiteActivities(projectId: string | null, filters: ActivityFilters) {
  return useQuery({
    queryKey: sitePlanKeys.activities(projectId ?? "none", filters),
    queryFn: () => sitePlanApi.listActivities(projectId as string, filters),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}
