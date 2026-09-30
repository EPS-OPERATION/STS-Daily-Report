export function normalizeZoneColor(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^#[\dA-F]{6}$/.test(normalized) ? normalized : null;
}

export function getZoneColorPreview(input: string, currentColor: string): string {
  return normalizeZoneColor(input) ?? currentColor;
}

// Quick-pick dots for the top action bar (same set as the panel presets).
export const zoneColorPresets: { name: string; value: string }[] = [
  { name: "Navy", value: "#264653" },
  { name: "Blue", value: "#457B9D" },
  { name: "Teal", value: "#2A9D8F" },
  { name: "Green", value: "#6A994E" },
  { name: "Amber", value: "#D1A548" },
  { name: "Orange", value: "#D18B47" },
  { name: "Red", value: "#C75C5C" },
  { name: "Purple", value: "#8E6CBB" },
];
