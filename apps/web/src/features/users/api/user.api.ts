import type { UserRole } from "@sts/shared";
import { http } from "@/services/http/client.js";
import type { CreatedUser, CreateUserInput, ResetLink, UserFilters, UserListResponse } from "../types/user.types.js";
export const usersApi = {
  list(filters: UserFilters): Promise<UserListResponse> {
    const params = new URLSearchParams({ status: filters.status, page: String(filters.page), pageSize: String(filters.pageSize), search: filters.search ?? "" });
    if (filters.projectId) params.set("projectId", filters.projectId);
    return http.get(`/users?${params}`);
  },
  create(input: CreateUserInput): Promise<{ data: CreatedUser }> { return http.post("/users", input); },
  approve(id: string, contractorId?: string, projectId?: string): Promise<{ data: { id: string; status: string } }> { return http.post(`/users/${id}/approve`, { ...(contractorId ? { contractorId } : {}), ...(projectId ? { projectId } : {}) }); },
  reject(id: string, reason: string): Promise<{ data: { id: string; status: string } }> { return http.post(`/users/${id}/reject`, { reason }); },
  reset(id: string): Promise<{ data: ResetLink }> { return http.post(`/users/${id}/reset-password`, {}); },
  link(id: string, contractorId: string, projectId?: string): Promise<{ data: { id: string; contractorId: string; projectId: string } }> { return http.post(`/users/${id}/link`, { contractorId, ...(projectId ? { projectId } : {}) }); },
  changeRole(id: string, role: UserRole): Promise<{ data: { id: string; role: UserRole } }> { return http.patch(`/users/${id}/role`, { role }); },
  changeStatus(id: string, status: "active" | "disabled"): Promise<{ data: { id: string; status: string } }> { return http.patch(`/users/${id}/status`, { status }); },
};
