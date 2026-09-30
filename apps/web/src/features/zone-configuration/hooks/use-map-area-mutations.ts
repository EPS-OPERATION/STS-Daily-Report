import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/services/http/client.js";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { sitePlanKeys } from "@/features/site-plan/api/site-plan.keys.js";
import type { PolygonGeometry } from "@/features/site-plan/types/site-plan.types.js";

export function useCanConfigureSitePlan(): boolean {
  const me = useMe();
  return !me.isError && Boolean(me.data);
}

export interface SaveMapAreasInput {
  areas: { areaId?: string; zoneId: string; geometry: PolygonGeometry }[];
  deleteAreaIds: string[];
  zoneColors: { zoneId: string; displayColor: string }[];
}

export function useSaveMapAreas(projectId: string | null, sitePlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveMapAreasInput) =>
      http.put<{ data: unknown }>(`/site-plans/${sitePlanId as string}/areas`, input),
    onSuccess: async () => {
      if (projectId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: sitePlanKeys.plan(projectId) }),
          queryClient.invalidateQueries({ queryKey: sitePlanKeys.zones(projectId) }),
        ]);
      }
    },
  });
}
