import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildingApi, buildingKeys } from "../api/building.api.js";
import type { BuildingInput } from "../types/building.types.js";

export function useBuildings(projectId: string | null) {
  return useQuery({
    queryKey: buildingKeys.list(projectId ?? ""),
    queryFn: () => buildingApi.list(projectId!),
    enabled: Boolean(projectId),
    staleTime: 10 * 60 * 1000,
  });
}

export function useManagedBuildings(projectId: string | null) {
  return useQuery({
    queryKey: buildingKeys.manage(projectId ?? ""),
    queryFn: () => buildingApi.manage(projectId!).then((r) => r.data),
    enabled: Boolean(projectId),
  });
}

// Every write refreshes both the admin list and the pickers' list (manage key sits under list).
function useRefresh(projectId: string | null) {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: buildingKeys.list(projectId ?? "") });
}

export function useCreateBuilding(projectId: string | null) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (input: BuildingInput) => buildingApi.create(projectId!, input), onSuccess: refresh });
}

export function useUpdateBuilding(projectId: string | null) {
  const refresh = useRefresh(projectId);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BuildingInput> & { status?: "active" | "inactive" } }) => buildingApi.update(projectId!, id, input),
    onSuccess: refresh,
  });
}

export function useReorderBuildings(projectId: string | null) {
  const refresh = useRefresh(projectId);
  return useMutation({ mutationFn: (ids: string[]) => buildingApi.reorder(projectId!, ids), onSuccess: refresh });
}
