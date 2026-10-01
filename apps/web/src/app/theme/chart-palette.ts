// Categorical series colours for charts. Navy-led set that sits with the brand
// navy (#0B4D8B) instead of the default rainbow (user feedback, Oct 2026).
// Validated as an ordered set (dataviz validate_palette, light surface):
// adjacent-pair CVD ΔE ≥ 11.3, normal-vision ΔE ≥ 18.4. Orange, green and sky sit
// below 3:1 on white, so every chart keeps a legend + hover values.
// Assign in this fixed order by entity (e.g. contractor sorted by code) — never by
// rank, never cycled. A 9th series folds into "Other".
export const CHART_SERIES = [
  "#1f5fa8", // navy blue
  "#f0913a", // orange
  "#2aa198", // teal
  "#8b6cc8", // violet
  "#d64f6e", // rose
  "#9cbf3b", // green
  "#5aa9e6", // sky
  "#b5651d", // brown
] as const;

export const CHART_OTHER = "#a3a29c";

// Single-series emphasis (trend line) — slot 1.
export const CHART_PRIMARY = CHART_SERIES[0];
