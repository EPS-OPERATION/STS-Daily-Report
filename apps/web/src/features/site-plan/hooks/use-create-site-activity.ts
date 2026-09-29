import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sitePlanApi } from "../api/site-plan.api.js";
import { sitePlanKeys } from "../api/site-plan.keys.js";
import type { CreateActivityInput } from "../types/site-plan.types.js";

export function useCreateSiteActivity(projectId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateActivityInput) => sitePlanApi.createActivity(projectId as string, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sitePlanKeys.all });
    },
  });
}
