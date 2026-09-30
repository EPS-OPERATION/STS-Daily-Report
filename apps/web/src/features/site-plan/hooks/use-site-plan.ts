import { useQuery } from "@tanstack/react-query";
import { sitePlanApi } from "../api/site-plan.api.js";
import { sitePlanKeys } from "../api/site-plan.keys.js";

export function useSitePlan(projectId: string | null, sitePlanId?: string | null) {
  return useQuery({
    queryKey: sitePlanKeys.plan(projectId ?? "none", sitePlanId ?? undefined),
    queryFn: () => sitePlanApi.getPlan(projectId as string, sitePlanId ?? undefined),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}

export function useSitePlans(projectId: string | null) {
  return useQuery({
    queryKey: sitePlanKeys.plans(projectId ?? "none"),
    queryFn: () => sitePlanApi.listPlans(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}

export function usePlanZones(projectId: string | null, status?: "active" | "inactive" | "all") {
  return useQuery({
    queryKey: [...sitePlanKeys.zones(projectId ?? "none"), status ?? "active"],
    queryFn: () => sitePlanApi.listZones(projectId as string, status),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });
}
