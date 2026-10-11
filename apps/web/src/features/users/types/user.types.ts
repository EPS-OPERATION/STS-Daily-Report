import type { PaginatedResponse } from "@sts/shared";
export type UserStatus = "pending" | "active" | "rejected";
export interface ManagedUser {
  id: string; email: string; username: string | null; role: "eps" | "contractor"; status: UserStatus;
  requestedContractorId: string | null; requestedContractorName: string | null; requestedCompanyName: string | null;
  rejectionReason: string | null; createdAt: string; decidedAt: string | null;
}
export interface UserFilters { status: UserStatus; page: number; pageSize: number; search?: string }
export type UserListResponse = PaginatedResponse<ManagedUser>;
export interface ResetLink { url: string; expiresAt: string }
