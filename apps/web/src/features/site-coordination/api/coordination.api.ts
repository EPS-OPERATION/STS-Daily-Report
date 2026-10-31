import type { CoordinationData, CoordinationDayLock, CoordinationDayNote, CoordinationInput, CoordinationItem, CoordinationItemType, CoordinationMap, CoordinationMapAdmin, CoordinationReport, CoordinationSection, CoordinationSectionWork, RoadSegment } from "@sts/shared";
import type { CreateItemTypeInput, UpdateItemTypeInput } from "../types/item-type.types.js";
import { http, request } from "@/services/http/client.js";
export type SectionInput = Pick<CoordinationSection, "code" | "work" | "color" | "points">;
export const coordinationApi = {
  maps(projectId: string): Promise<{ data: CoordinationMapAdmin[] }> {
    return http.get(`/projects/${projectId}/coordination/maps`);
  },
  createMap(projectId: string, form: FormData): Promise<{ data: CoordinationMap }> {
    return http.upload(`/projects/${projectId}/coordination/maps`, form);
  },
  updateMap(projectId: string, id: string, form: FormData): Promise<{ data: CoordinationMap }> {
    return request(`/projects/${projectId}/coordination/maps/${id}`, { method: "PATCH", body: form });
  },
  reorderMaps(projectId: string, ids: string[]): Promise<void> {
    return http.put(`/projects/${projectId}/coordination/maps/order`, { ids });
  },
  removeMap(projectId: string, id: string): Promise<void> {
    return http.delete(`/projects/${projectId}/coordination/maps/${id}`);
  },
  createSection(projectId: string, input: SectionInput & { mapId: string }): Promise<{ data: CoordinationSection }> {
    return http.post(`/projects/${projectId}/coordination/sections`, input);
  },
  updateSection(projectId: string, id: string, input: SectionInput): Promise<{ data: CoordinationSection }> {
    return http.patch(`/projects/${projectId}/coordination/sections/${id}`, input);
  },
  removeSection(projectId: string, id: string): Promise<void> {
    return http.delete(`/projects/${projectId}/coordination/sections/${id}`);
  },
  get(projectId: string, date: string): Promise<{ data: CoordinationData }> {
    return http.get(`/projects/${projectId}/coordination?${new URLSearchParams({ date })}`);
  },
  version(projectId: string, date: string): Promise<{ data: { version: string } }> {
    return http.get(`/projects/${projectId}/coordination/version?${new URLSearchParams({ date })}`);
  },
  // Daily-report rows contractors placed on this map's route sections (read-only card on the Map).
  sectionWork(projectId: string, date: string, mapId: string): Promise<{ data: CoordinationSectionWork }> {
    return http.get(`/projects/${projectId}/coordination/section-work?${new URLSearchParams({ date, mapId })}`);
  },
  report(projectId: string, date: string, mapId?: string): Promise<{ data: CoordinationReport }> {
    return http.get(`/projects/${projectId}/coordination/report?${new URLSearchParams({ date, ...(mapId ? { mapId } : {}) })}`);
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
  itemTypes(projectId: string): Promise<{ data: CoordinationItemType[] }> {
    return http.get(`/projects/${projectId}/coordination/item-types`);
  },
  createItemType(projectId: string, input: CreateItemTypeInput): Promise<{ data: CoordinationItemType }> {
    return http.post(`/projects/${projectId}/coordination/item-types`, input);
  },
  updateItemType(projectId: string, id: string, input: UpdateItemTypeInput): Promise<{ data: CoordinationItemType }> {
    return http.patch(`/projects/${projectId}/coordination/item-types/${id}`, input);
  },
  reorderItemTypes(projectId: string, ids: string[]): Promise<{ data: CoordinationItemType[] }> {
    return http.put(`/projects/${projectId}/coordination/item-types/order`, { ids });
  },
  removeItemType(projectId: string, id: string): Promise<void> {
    return http.delete(`/projects/${projectId}/coordination/item-types/${id}`);
  },
};
