import { useQuery } from "@tanstack/react-query";
import { sitePlanApi } from "../api/site-plan.api.js";
import { sitePlanKeys } from "../api/site-plan.keys.js";

export function useSitePlan(projectId: string | null) {
  return useQuery({
    queryKey: sitePlanKeys.plan(projectId ?? "none"),
    queryFn: () => sitePlanApi.getPlan(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}

export function usePlanZones(projectId: string | null) {
  return useQuery({
    queryKey: sitePlanKeys.zones(projectId ?? "none"),
    queryFn: () => sitePlanApi.listZones(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}
