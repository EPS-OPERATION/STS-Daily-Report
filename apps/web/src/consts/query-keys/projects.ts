export const projectKeys = {
  all: ["projects"] as const,
  list: (status = "active") => [...projectKeys.all, "list", status] as const,
  contractors: (projectId: string) => [...projectKeys.all, projectId, "contractors"] as const,
};
