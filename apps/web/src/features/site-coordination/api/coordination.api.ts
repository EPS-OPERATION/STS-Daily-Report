import type { CoordinationData, CoordinationDayLock, CoordinationDayNote, CoordinationInput, CoordinationItem, CoordinationReport, RoadSegment } from "@sts/shared";
import { http } from "@/services/http/client.js";
export const coordinationApi = {
  get(projectId: string, date: string): Promise<{ data: CoordinationData }> {
    return http.get(`/projects/${projectId}/coordination?${new URLSearchParams({ date })}`);
  },
  version(projectId: string, date: string): Promise<{ data: { version: string } }> {
    return http.get(`/projects/${projectId}/coordination/version?${new URLSearchParams({ date })}`);
  },
  report(projectId: string, date: string): Promise<{ data: CoordinationReport }> {
    return http.get(`/projects/${projectId}/coordination/report?${new URLSearchParams({ date })}`);
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
  dayNote(projectId: string, date: string, note: string): Promise<{ data: CoordinationDayNote | null }> {
    return http.put(`/projects/${projectId}/coordination/day-note?${new URLSearchParams({ date })}`, { note });
  },
  lock(projectId: string, date: string, locked: boolean): Promise<{ data: CoordinationDayLock | null }> {
    const url = `/projects/${projectId}/coordination/lock?${new URLSearchParams({ date })}`;
    return locked ? http.put(url, {}) : http.delete(url);
  },
  roads(projectId: string): Promise<{ data: RoadSegment[] }> {
    return http.get(`/projects/${projectId}/coordination/roads`);
  },
  saveRoad(projectId: string, input: Omit<RoadSegment, "id">, id?: string): Promise<{ data: RoadSegment }> {
    return id ? http.patch(`/projects/${projectId}/coordination/roads/${id}`, input) : http.post(`/projects/${projectId}/coordination/roads`, input);
  },
  removeRoad(projectId: string, id: string): Promise<void> {
    return http.delete(`/projects/${projectId}/coordination/roads/${id}`);
  },
  color(projectId: string, contractorId: string, color: string, revision: number) {
    return http.patch(`/projects/${projectId}/coordination/contractors/${contractorId}`, { color, revision });
  },
};
