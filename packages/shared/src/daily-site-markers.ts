export const DAILY_SITE_MARKER_ICON_KEYS = [
  "vehicle",
  "truck",
  "crane",
  "excavator",
  "equipment",
  "material",
  "worker",
  "hazard",
  "restricted-area",
  "work-area",
  "other",
] as const;

export type DailySiteMarkerIconKey = (typeof DAILY_SITE_MARKER_ICON_KEYS)[number];

export function isDailySiteMarkerIconKey(value: string): value is DailySiteMarkerIconKey {
  return (DAILY_SITE_MARKER_ICON_KEYS as readonly string[]).includes(value);
}

export function isDailySiteMarkerView(view: { key: string } | null | undefined): boolean {
  return view?.key === "top";
}
