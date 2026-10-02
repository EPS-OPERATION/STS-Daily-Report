import type { FacilityMarker, MapView, MarkerDrafts, SiteMap } from "@/types/site-operations.types.js";

export function defaultSiteMap(maps: Pick<SiteMap, "id" | "isDefault" | "isActive">[]) {
  return maps.find((map) => map.isActive && map.isDefault)?.id ?? maps.find((map) => map.isActive)?.id ?? null;
}
export function defaultMapView(views: Pick<MapView, "id" | "key" | "name" | "sortOrder" | "isActive">[]) {
  const active = views
    .filter((view) => view.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  return active.find((view) => /overview/i.test(view.key) || /overview/i.test(view.name))?.id ?? active[0]?.id ?? null;
}
export interface FacilityMapSelection {
  selectedSiteMapId: string | null;
  selectedMapViewId: string | null;
  selectedFacilityId: string | null;
  selectedFacilityPartId: string | null;
}
export const emptyFacilitySelection: FacilityMapSelection = {
  selectedSiteMapId: null,
  selectedMapViewId: null,
  selectedFacilityId: null,
  selectedFacilityPartId: null,
};
export function switchSiteMap(state: FacilityMapSelection, id: string): FacilityMapSelection {
  return { ...state, selectedSiteMapId: id, selectedMapViewId: null };
}
export function switchMapView(state: FacilityMapSelection, id: string): FacilityMapSelection {
  return { ...state, selectedMapViewId: id };
}
export function selectFacility(state: FacilityMapSelection, id: string | null): FacilityMapSelection {
  return {
    ...state,
    selectedFacilityId: id,
    selectedFacilityPartId: state.selectedFacilityId === id ? state.selectedFacilityPartId : null,
  };
}
export function updateMarkerDraft(
  drafts: MarkerDrafts,
  saved: Pick<FacilityMarker, "facilityId" | "x" | "y">[],
  facilityId: string,
  point: { x: number; y: number } | null,
) {
  const previous = saved.find((marker) => marker.facilityId === facilityId);
  const next = { ...drafts };
  if (point === null ? !previous : previous?.x === point.x && previous.y === point.y) delete next[facilityId];
  else next[facilityId] = point;
  return next;
}
export function markerDraftRows(drafts: MarkerDrafts) {
  return Object.entries(drafts).map(([facilityId, point]) => ({
    facilityId,
    x: point?.x ?? null,
    y: point?.y ?? null,
  }));
}
