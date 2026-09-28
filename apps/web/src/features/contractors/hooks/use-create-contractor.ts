import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contractorApi } from "../api/contractor.api.js";
import { contractorKeys } from "../api/contractor.keys.js";

export function useCreateContractor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contractorApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contractorKeys.lists() });
    },
  });
}
