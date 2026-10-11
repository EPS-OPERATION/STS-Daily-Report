import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/user.api.js";
import { usersKeys } from "../api/user.keys.js";
import type { UserFilters } from "../types/user.types.js";
export function useUsers(filters: UserFilters) {
  return useQuery({ queryKey: usersKeys.list(filters), queryFn: () => usersApi.list(filters), placeholderData: keepPreviousData });
}
export function useDecideUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: "approve"; contractorId?: string } | { id: string; action: "reject"; reason: string }) =>
      input.action === "approve" ? usersApi.approve(input.id, input.contractorId) : usersApi.reject(input.id, input.reason),
    onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }),
  });
}
export function useIssueResetLink() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => usersApi.reset(id), onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }) });
}
