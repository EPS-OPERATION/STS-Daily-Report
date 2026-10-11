import { http } from "@/services/http/client.js";
import type { ResetLink, UserFilters, UserListResponse } from "../types/user.types.js";
export const usersApi = {
  list(filters: UserFilters): Promise<UserListResponse> {
    return http.get(`/users?${new URLSearchParams({ status: filters.status, page: String(filters.page), pageSize: String(filters.pageSize), search: filters.search ?? "" })}`);
  },
  approve(id: string, contractorId?: string): Promise<{ data: { id: string; status: string } }> { return http.post(`/users/${id}/approve`, contractorId ? { contractorId } : {}); },
  reject(id: string, reason: string): Promise<{ data: { id: string; status: string } }> { return http.post(`/users/${id}/reject`, { reason }); },
  reset(id: string): Promise<{ data: ResetLink }> { return http.post(`/users/${id}/reset-password`, {}); },
};
