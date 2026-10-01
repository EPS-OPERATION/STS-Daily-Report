// Categorical series colours for charts (dataviz reference palette, light mode).
// Validated as an ordered set: adjacent-pair CVD ΔE ≥ 9 and normal-vision ΔE ≥ 19.
// Assign in this fixed order by entity (e.g. contractor sorted by code) — never by rank,
// never cycled. A 9th series folds into "Other".
export const CHART_SERIES = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const;

export const CHART_OTHER = "#a3a29c";

// Single-series emphasis (trend line) — slot 1.
export const CHART_PRIMARY = CHART_SERIES[0];
