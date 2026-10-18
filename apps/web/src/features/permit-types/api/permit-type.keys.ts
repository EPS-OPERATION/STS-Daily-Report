export const permitTypeKeys = {
  all: ["permit-types"] as const,
  list: (projectId: string, includeInactive = false) =>
    [...permitTypeKeys.all, "list", projectId, { includeInactive }] as const,
};
