import type { PaginatedResponse, UserRole } from "@sts/shared";
export type UserStatus = "pending" | "active" | "rejected" | "disabled";
export interface ManagedUser {
  id: string; email: string; username: string | null; role: UserRole; status: UserStatus;
  requestedContractorId: string | null; requestedContractorName: string | null; requestedCompanyName: string | null;
  rejectionReason: string | null; membershipCount: number; createdAt: string; decidedAt: string | null;
}
export interface UserFilters { status: UserStatus; page: number; pageSize: number; search?: string; projectId?: string }
export type UserListResponse = PaginatedResponse<ManagedUser>;
export interface ResetLink { url: string; expiresAt: string }
export interface CreateUserInput {
  email: string; username: string; displayName?: string; password: string; role: UserRole; contractorId?: string; projectId?: string;
}
export interface CreatedUser { id: string; email: string; username: string; role: UserRole; status: "active"; contractorId: string | null; projectId: string | null }
// Admin Usage page (GET /users/activity): people per day + per-user activity in the range.
export interface UserActivityPerson {
  id: string; username: string | null; displayName: string | null; email: string; role: UserRole; status: UserStatus;
  company: string | null; activeDays: number; activeMinutes: number; reportsSubmitted: number; lastSeenAt: string | null;
}
export interface UserActivity { daily: Array<{ day: string; users: number }>; users: UserActivityPerson[] }
