import type { PaginationParams } from "@sts/shared";
export type UserStatus = "pending" | "active" | "rejected";
export interface ListUsersQuery extends PaginationParams { status?: UserStatus }
