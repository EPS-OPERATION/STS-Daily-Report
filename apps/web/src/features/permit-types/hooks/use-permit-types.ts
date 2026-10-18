import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { permitTypeApi } from "../api/permit-type.api.js";
import { permitTypeKeys } from "../api/permit-type.keys.js";
import type { CreatePermitTypeInput, UpdatePermitTypeInput } from "../types/permit-type.types.js";

export function usePermitTypes(projectId: string | null | undefined, includeInactive = false) {
  return useQuery({
    queryKey: permitTypeKeys.list(projectId ?? "", includeInactive),
    queryFn: () => permitTypeApi.list(projectId!, includeInactive),
    enabled: Boolean(projectId),
    select: (res) => res.data,
  });
}

export function useCreatePermitType(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePermitTypeInput) => permitTypeApi.create(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permitTypeKeys.all });
    },
  });
}

export function useUpdatePermitType(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePermitTypeInput }) =>
      permitTypeApi.update(projectId, id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permitTypeKeys.all });
    },
  });
}

export function useDeletePermitType(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => permitTypeApi.delete(projectId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permitTypeKeys.all });
    },
  });
}
