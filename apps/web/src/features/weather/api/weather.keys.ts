export const weatherKeys = {
  all: ["weather"] as const,
  hourly: (projectId: string, from: string, to: string) => [...weatherKeys.all, "hourly", projectId, from, to] as const,
  compare: (projectId: string, from: string, to: string, contractors: string) => [...weatherKeys.all, "compare", projectId, from, to, contractors] as const,
  at: (projectId: string, date: string, time: string) => [...weatherKeys.all, "at", projectId, date, time] as const,
};
