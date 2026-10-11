import type { PaginatedResponse, UserRole } from "@sts/shared";
export type UserStatus = "pending" | "active" | "rejected" | "disabled";
export interface ManagedUser {
  id: string; email: string; username: string | null; role: UserRole; status: UserStatus;
  requestedContractorId: string | null; requestedContractorName: string | null; requestedCompanyName: string | null;
  rejectionReason: string | null; membershipCount: number; createdAt: string; decidedAt: string | null;
}
export interface UserFilters { status: UserStatus; page: number; pageSize: number; search?: string }
export type UserListResponse = PaginatedResponse<ManagedUser>;
export interface ResetLink { url: string; expiresAt: string }
