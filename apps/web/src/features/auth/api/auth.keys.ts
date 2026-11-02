export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  config: () => [...authKeys.all, "config"] as const,
  projects: () => [...authKeys.all, "registration-projects"] as const,
  contractors: (search: string, projectId?: string) => [...authKeys.all, "contractors", projectId ?? "all", search] as const,
};
