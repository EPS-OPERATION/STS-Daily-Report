export const contractorKeys = {
  all: ["contractors"] as const,
  lists: () => [...contractorKeys.all, "list"] as const,
  list: (filters: { page: number; pageSize: number; search?: string }) => [...contractorKeys.lists(), filters] as const,
  details: () => [...contractorKeys.all, "detail"] as const,
  detail: (id: string) => [...contractorKeys.details(), id] as const,
};
