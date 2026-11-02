export const droneKeys = {
  all: ["drone"] as const,
  lists: () => [...droneKeys.all, "list"] as const,
  list: (projectId: string, from?: string, to?: string) =>
    [...droneKeys.lists(), projectId, from ?? "", to ?? ""] as const,
};
