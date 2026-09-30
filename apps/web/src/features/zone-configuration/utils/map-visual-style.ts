export type ZoneMapVisualState =
  "context" | "group-focused" | "hover" | "selected" | "editing" | "issue-focused" | "dimmed";

export interface ZoneMapVisualFlags {
  selected: boolean;
  editing: boolean;
  issueFocused: boolean;
  hovered: boolean;
  groupFocused?: boolean;
  dimmed: boolean;
}

export const zoneMapVisualTokens: Record<
  ZoneMapVisualState,
  { fillOpacity: number; strokeWidth: number; outline: "none" | "light" | "double" }
> = {
  context: { fillOpacity: 0.2, strokeWidth: 2, outline: "none" },
  "group-focused": { fillOpacity: 0.27, strokeWidth: 2.75, outline: "light" },
  hover: { fillOpacity: 0.3, strokeWidth: 3, outline: "light" },
  selected: { fillOpacity: 0.4, strokeWidth: 4, outline: "double" },
  editing: { fillOpacity: 0.34, strokeWidth: 4.75, outline: "double" },
  "issue-focused": { fillOpacity: 0.26, strokeWidth: 3.5, outline: "double" },
  dimmed: { fillOpacity: 0.05, strokeWidth: 1.25, outline: "none" },
};

export function getZoneMapVisualState({
  editing,
  selected,
  issueFocused,
  hovered,
  groupFocused = false,
  dimmed,
}: ZoneMapVisualFlags): ZoneMapVisualState {
  if (editing) return "editing";
  if (selected) return "selected";
  if (issueFocused) return "issue-focused";
  if (hovered) return "hover";
  if (groupFocused) return "group-focused";
  if (dimmed) return "dimmed";
  return "context";
}
