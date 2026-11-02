import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorApi } from "../api/contractor.api.js";
import type { ContractorUpdate } from "../types/contractor.types.js";

// Companies feed sign-up, every filter, the map and the reports, so a change refreshes everything loaded.
export function useCreateContractor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contractorApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContractorUpdate }) => contractorApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}
