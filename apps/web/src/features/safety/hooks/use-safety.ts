import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { safetyApi, safetyKeys } from "../api/safety.api.js";
import type { FindingInput } from "../types/safety.types.js";

export function useSafetyFindings(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: safetyKeys.findings(projectId ?? "", from, to),
    queryFn: () => safetyApi.findings(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useSafetyStats(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: safetyKeys.stats(projectId ?? "", from, to),
    queryFn: () => safetyApi.stats(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

// Save = create/update the row, then upload any newly picked photos.
export function useSaveFinding(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string | null; input: FindingInput; findingPhoto?: File | null; closePhoto?: File | null }) => {
      const pid = projectId!;
      const id = v.id ?? (await safetyApi.create(pid, v.input)).data.id;
      if (v.id) await safetyApi.update(pid, v.id, v.input);
      if (v.findingPhoto) await safetyApi.uploadPhoto(pid, id, "finding", v.findingPhoto);
      if (v.closePhoto) await safetyApi.uploadPhoto(pid, id, "close", v.closePhoto);
      return id;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}

export function useDeleteFinding(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => safetyApi.remove(projectId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}
