import { useQuery } from "@tanstack/react-query";
import { contractorApi } from "../api/contractor.api.js";
import { contractorKeys } from "../api/contractor.keys.js";

export function useCompanyUsers(contractorId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: [...contractorKeys.detail(contractorId ?? ""), "users", projectId ?? null],
    queryFn: () => contractorApi.users(contractorId!, projectId),
    enabled: Boolean(contractorId),
  });
}
