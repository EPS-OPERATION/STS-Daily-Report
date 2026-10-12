import type { CoordinationData, CoordinationInput, CoordinationItem } from "@sts/shared";
import { http } from "@/services/http/client.js";
export const coordinationApi = {
  get(projectId: string, date: string): Promise<{ data: CoordinationData }> {
    return http.get(`/projects/${projectId}/coordination?${new URLSearchParams({ date })}`);
  },
  create(projectId: string, input: CoordinationInput): Promise<{ data: CoordinationItem }> {
    return http.post(`/projects/${projectId}/coordination/items`, input);
  },
  update(projectId: string, id: string, input: CoordinationInput, revision: number): Promise<{ data: CoordinationItem }> {
    return http.patch(`/projects/${projectId}/coordination/items/${id}`, { ...input, revision });
  },
  remove(projectId: string, id: string, revision: number): Promise<void> {
    return http.delete(`/projects/${projectId}/coordination/items/${id}?revision=${revision}`);
  },
  color(projectId: string, contractorId: string, color: string, revision: number) {
    return http.patch(`/projects/${projectId}/coordination/contractors/${contractorId}`, { color, revision });
  },
};
