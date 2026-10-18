import { CHART_OTHER, CHART_SERIES } from "@/app/theme/chart-palette.js";

// Colour follows the contractor, never its rank: slots assigned by code order so the
// same contractor keeps its colour across every chart and every week.
export function contractorColorMap(codes: string[]): Map<string, string> {
  const sorted = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((c, i) => [c, CHART_SERIES[i] ?? CHART_OTHER]));
}
