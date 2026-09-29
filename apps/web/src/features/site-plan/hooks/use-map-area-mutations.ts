import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { http } from "@/services/http/client.js";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { sitePlanKeys } from "../api/site-plan.keys.js";
import type { PolygonGeometry } from "../types/site-plan.types.js";

// Authenticated users may configure the map today; a permission field
// (canEditSitePlan) plugs in here once RBAC lands.
export function useCanEditSitePlan(): boolean {
  const me = useMe();
  return !me.isError && Boolean(me.data);
}

function invalidatePlan(queryClient: QueryClient, projectId: string) {
  void queryClient.invalidateQueries({ queryKey: sitePlanKeys.plan(projectId) });
}

export function useSaveMapAreas(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (areas: { zoneId: string; geometry: PolygonGeometry }[]) =>
      http.put<{ data: unknown }>(`/site-plans/${projectId as string}/areas`, { areas }),
    onSuccess: () => {
      if (projectId) invalidatePlan(queryClient, projectId);
    },
  });
}

export function useCreateMapArea(projectId: string | null, sitePlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { zoneId: string; geometry: PolygonGeometry }) =>
      http.post<{ data: unknown }>(`/site-plans/${sitePlanId as string}/areas`, input),
    onSuccess: () => {
      if (projectId) invalidatePlan(queryClient, projectId);
    },
  });
}

export function useDeleteMapArea(projectId: string | null, sitePlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (areaId: string) =>
      http.delete<{ data: unknown }>(`/site-plans/${sitePlanId as string}/areas/${areaId}`),
    onSuccess: () => {
      if (projectId) invalidatePlan(queryClient, projectId);
    },
  });
}

export function useResetMapArea(projectId: string | null, sitePlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (areaId: string) =>
      http.post<{ data: unknown }>(`/site-plans/${sitePlanId as string}/areas/${areaId}/reset`, {}),
    onSuccess: () => {
      if (projectId) invalidatePlan(queryClient, projectId);
    },
  });
}

export function usePatchMapArea(projectId: string | null, sitePlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { areaId: string; zoneId?: string; geometry?: PolygonGeometry }) =>
      http.patch<{ data: unknown }>(
        `/site-plans/${sitePlanId as string}/areas/${input.areaId}`,
        { zoneId: input.zoneId, geometry: input.geometry },
      ),
    onSuccess: () => {
      if (projectId) invalidatePlan(queryClient, projectId);
    },
  });
}
