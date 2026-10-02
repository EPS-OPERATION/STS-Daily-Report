export const dailySiteMarkerKeys = {
  project: (projectId: string) => ["daily-site-markers", projectId] as const,
  list: (projectId: string, viewId: string, workDate: string, filters = {}) =>
    ["daily-site-markers", projectId, viewId, workDate, filters] as const,
};
