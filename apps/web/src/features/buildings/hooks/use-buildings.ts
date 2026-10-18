import { useQuery } from "@tanstack/react-query";
import { buildingApi, buildingKeys } from "../api/building.api.js";

export function useBuildings(projectId: string | null) {
  return useQuery({
    queryKey: buildingKeys.list(projectId ?? ""),
    queryFn: () => buildingApi.list(projectId!),
    enabled: Boolean(projectId),
    staleTime: 10 * 60 * 1000,
  });
}
