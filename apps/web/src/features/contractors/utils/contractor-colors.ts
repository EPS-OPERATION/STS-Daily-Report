import { CHART_OTHER, CHART_SERIES } from "@/app/theme/chart-palette.js";

export interface ContractorColorSource {
  code: string;
  color?: string | null;
}

// Colour follows the contractor, never its rank. Use the colour EPS set on the coordination
// map (the same one as the Contractors page/Map); the chart palette is only a fallback for a
// company that has no stored colour yet.
export function contractorColorMap(codes: string[], contractors?: readonly ContractorColorSource[]): Map<string, string> {
  const stored = new Map<string, string>();
  for (const c of contractors ?? []) if (c.color) stored.set(c.code, c.color);
  const sorted = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((c, i) => [c, stored.get(c) ?? CHART_SERIES[i] ?? CHART_OTHER]));
}
