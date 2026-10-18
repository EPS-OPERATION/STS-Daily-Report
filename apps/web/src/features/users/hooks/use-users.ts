import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@sts/shared";
import { usersApi } from "../api/user.api.js";
import { usersKeys } from "../api/user.keys.js";
import type { CreateUserInput, UserFilters } from "../types/user.types.js";
export function useUsers(filters: UserFilters) {
  return useQuery({ queryKey: usersKeys.list(filters), queryFn: () => usersApi.list(filters), placeholderData: keepPreviousData });
}
export function useDecideUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; action: "approve"; contractorId?: string; projectId?: string } | { id: string; action: "reject"; reason: string }) =>
      input.action === "approve" ? usersApi.approve(input.id, input.contractorId, input.projectId) : usersApi.reject(input.id, input.reason),
    onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }),
  });
}
export function useIssueResetLink() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => usersApi.reset(id), onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }) });
}
export function useChangeUserRole() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { id: string; role: UserRole }) => usersApi.changeRole(input.id, input.role), onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }) });
}
export function useChangeUserStatus() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { id: string; status: "active" | "disabled" }) => usersApi.changeStatus(input.id, input.status), onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }) });
}
export function useLinkUser() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: { id: string; contractorId: string; projectId?: string }) => usersApi.link(input.id, input.contractorId, input.projectId), onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }) });
}
export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: CreateUserInput) => usersApi.create(input), onSuccess: () => client.invalidateQueries({ queryKey: usersKeys.lists() }) });
}
