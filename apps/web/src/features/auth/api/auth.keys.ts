export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  config: () => [...authKeys.all, "config"] as const,
  contractors: (search: string) => [...authKeys.all, "contractors", search] as const,
};
