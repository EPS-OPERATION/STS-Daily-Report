import type { PaginationParams } from "@sts/shared";
export type UserStatus = "pending" | "active" | "rejected" | "disabled";
export interface ListUsersQuery extends PaginationParams {
  status?: UserStatus;
  projectId?: string;
  /** One company's people: linked to it (in projectId when given) or asked for it at sign-up. */
  contractorId?: string;
}
