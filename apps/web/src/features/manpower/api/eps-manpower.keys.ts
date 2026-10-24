export const epsManpowerKeys = {
  all: ["eps-manpower"] as const,
  entry: (projectId: string, date: string) => [...epsManpowerKeys.all, projectId, date] as const,
};
