import type { CoordinationInput } from "@sts/shared";

// How a job's area reads in lists and panels.
export function areaLabel(item: Pick<CoordinationInput, "areaKind" | "geometry">, withCount = false): string {
  const n = item.geometry.points.length;
  if (item.areaKind === "route") return withCount ? `เส้นทางถนน ${n} จุด` : "เส้นทางถนน";
  if (item.areaKind === "polygon") return withCount ? `พื้นที่รูปทรงอิสระ ${n} จุดมุม` : "พื้นที่รูปทรงอิสระ";
  return "พื้นที่สี่เหลี่ยม";
}
