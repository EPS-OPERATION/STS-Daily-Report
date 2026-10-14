import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { droneApi, type DroneUploadInput } from "../api/drone.api.js";
import { droneKeys } from "../api/drone.keys.js";

export function useDroneLogs(projectId: string | null, from?: string, to?: string) {
  return useQuery({
    queryKey: droneKeys.list(projectId ?? "", from, to),
    queryFn: () => droneApi.list(projectId!, from, to),
    enabled: Boolean(projectId),
  });
}

export function useUploadDroneLog(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DroneUploadInput) => droneApi.upload(projectId!, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: droneKeys.lists() }),
  });
}

export function useDeleteDroneLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => droneApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: droneKeys.lists() }),
  });
}
