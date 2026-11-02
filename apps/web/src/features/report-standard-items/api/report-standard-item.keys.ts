export const reportStandardItemKeys = {
  all: ["report-standard-items"] as const,
  list: (projectId: string, contractorId: string) => [...reportStandardItemKeys.all, "list", projectId, contractorId] as const,
};
