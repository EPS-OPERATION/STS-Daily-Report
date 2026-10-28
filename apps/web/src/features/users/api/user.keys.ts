import type { UserFilters } from "../types/user.types.js";
export const usersKeys = {
  all: ["users"] as const,
  lists: () => [...usersKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...usersKeys.lists(), filters] as const,
  activity: (from: string, to: string) => [...usersKeys.all, "activity", from, to] as const,
};
