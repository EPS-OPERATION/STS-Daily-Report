import type { FacilityMarker, MarkerDrafts } from "@/types/site-operations.types.js";

export const appendDisplayOrder = (items: { sortOrder: number }[]) =>
  Math.max(0, ...items.map((item) => item.sortOrder)) + 1;

export function markerPoints(saved: Pick<FacilityMarker, "facilityId" | "x" | "y">[], drafts: MarkerDrafts) {
  const points = new Map(saved.map((marker) => [marker.facilityId, { x: marker.x, y: marker.y }]));
  for (const [id, point] of Object.entries(drafts)) {
    if (point) points.set(id, point);
    else points.delete(id);
  }
  return points;
}

export function placementFacility(
  id: string,
  active: boolean,
  imageReady: boolean,
  points: Map<string, { x: number; y: number }>,
) {
  return active && imageReady && !points.has(id) ? id : null;
}
