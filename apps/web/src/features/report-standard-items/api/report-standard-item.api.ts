import { http } from "@/services/http/client.js";
import type { StandardItem, StandardItemDraft } from "../types/report-standard-item.types.js";

export const reportStandardItemApi = {
  list(projectId: string, contractorId: string): Promise<{ data: StandardItem[] }> {
    return http.get(`/projects/${projectId}/report-standard-items?contractorId=${contractorId}`);
  },
  merge(projectId: string, contractorId: string, items: StandardItemDraft[]): Promise<{ data: StandardItem[] }> {
    return http.post(`/projects/${projectId}/report-standard-items`, { contractorId, items });
  },
  remove(projectId: string, id: string): Promise<null> {
    return http.delete(`/projects/${projectId}/report-standard-items/${id}`);
  },
};
