import { http } from "@/services/http/client.js";
import type { PartInput, SiteDay, SiteMapBuilding, SiteMapView } from "../types/site-map.types.js";

export const siteMapApi = {
  map(projectId: string): Promise<{ data: SiteMapBuilding[] }> {
    return http.get(`/projects/${projectId}/site-map`);
  },
  day(projectId: string, from: string, to: string): Promise<{ data: SiteDay }> {
    return http.get(`/projects/${projectId}/site-day?from=${from}&to=${to}`);
  },
  placeMarker(projectId: string, buildingId: string, view: SiteMapView, x: number, y: number): Promise<{ data: SiteMapBuilding[] }> {
    return http.put(`/projects/${projectId}/buildings/${buildingId}/markers/${view}`, { x, y });
  },
  removeMarker(projectId: string, buildingId: string, view: SiteMapView): Promise<{ data: SiteMapBuilding[] }> {
    return http.delete(`/projects/${projectId}/buildings/${buildingId}/markers/${view}`);
  },
  createPart(projectId: string, buildingId: string, input: PartInput): Promise<{ data: { id: string; map: SiteMapBuilding[] } }> {
    return http.post(`/projects/${projectId}/buildings/${buildingId}/parts`, input);
  },
  updatePart(projectId: string, partId: string, input: PartInput): Promise<{ data: SiteMapBuilding[] }> {
    return http.put(`/projects/${projectId}/parts/${partId}`, input);
  },
  deletePart(projectId: string, partId: string): Promise<{ data: SiteMapBuilding[] }> {
    return http.delete(`/projects/${projectId}/parts/${partId}`);
  },
  placePartMarker(projectId: string, partId: string, view: SiteMapView, x: number, y: number): Promise<{ data: SiteMapBuilding[] }> {
    return http.put(`/projects/${projectId}/parts/${partId}/markers/${view}`, { x, y });
  },
  removePartMarker(projectId: string, partId: string, view: SiteMapView): Promise<{ data: SiteMapBuilding[] }> {
    return http.delete(`/projects/${projectId}/parts/${partId}/markers/${view}`);
  },
};
