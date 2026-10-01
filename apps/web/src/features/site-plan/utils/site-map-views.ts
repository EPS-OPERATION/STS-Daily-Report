import type { PlanMapPoint, SiteMapView, SitePlan } from "../types/site-plan.types.js";
import { SITE_MAP_H, SITE_MAP_W } from "../constants.js";

export const siteViewLabels: Record<SiteMapView, string> = { overview: "Overview", top: "Top View" };

export function getSiteViewImage(view: SiteMapView, top?: SitePlan["background"]) {
  return view === "overview"
    ? { url: "/site-plan/master-layout-map-above.png", width: 1513, height: 1039 }
    : {
        url: top?.url ?? "/site-plan/master-layout-map.png",
        width: top?.width ?? SITE_MAP_W,
        height: top?.height ?? SITE_MAP_H,
      };
}

export function getSiteViewPoints(points: PlanMapPoint[], view: SiteMapView): PlanMapPoint[] {
  return points.filter((point) => point.view === view);
}

export function markerDraftKey(view: SiteMapView, facilityKey: string): string {
  return `${view}:${facilityKey}`;
}

export interface PlacementTarget {
  facilityKey: string;
  view: SiteMapView;
}

const PLACEMENT_VIEWS: SiteMapView[] = ["overview", "top"];

/**
 * Next placement target for the Save & Next bulk flow. Prefers the current
 * facility's missing view first, then the next facility (list order, wrapping)
 * that still misses a view. Returns null when everything is configured.
 */
export function getNextPlacementTarget(
  facilities: readonly { key: string }[],
  isPlaced: (facilityKey: string, view: SiteMapView) => boolean,
  currentFacilityKey: string | null,
): PlacementTarget | null {
  if (currentFacilityKey) {
    const missing = PLACEMENT_VIEWS.find((view) => !isPlaced(currentFacilityKey, view));
    if (missing) return { facilityKey: currentFacilityKey, view: missing };
  }
  const startIndex = currentFacilityKey ? facilities.findIndex((facility) => facility.key === currentFacilityKey) : -1;
  for (let step = 1; step <= facilities.length; step++) {
    const facility = facilities[(startIndex + step) % facilities.length]!;
    const missing = PLACEMENT_VIEWS.find((view) => !isPlaced(facility.key, view));
    if (missing) return { facilityKey: facility.key, view: missing };
  }
  return null;
}

/** Small global progress indicator: facilities fully configured in both views. */
export function placementProgress(
  facilities: readonly { key: string }[],
  isPlaced: (facilityKey: string, view: SiteMapView) => boolean,
): { done: number; total: number } {
  const done = facilities.filter((facility) => PLACEMENT_VIEWS.every((view) => isPlaced(facility.key, view))).length;
  return { done, total: facilities.length };
}
