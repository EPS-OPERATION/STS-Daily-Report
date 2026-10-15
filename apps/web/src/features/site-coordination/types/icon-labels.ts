import type { CoordinationIcon, CoordinationInput } from "@sts/shared";
export const ICON_LABELS: Record<CoordinationIcon, string> = {
  crane: "รถเครน", machinery: "เครื่องจักร", truck: "รถขนส่ง", weld: "งานเชื่อม", pipe: "งานท่อ", box: "จุดวางของ", pin: "จุดงาน", road: "ใช้ถนน", text: "ข้อความ",
};

// How a job's area reads in lists and panels.
export function areaLabel(item: Pick<CoordinationInput, "areaKind" | "geometry">, withCount = false): string {
  const n = item.geometry.points.length;
  if (item.areaKind === "route") return withCount ? `เส้นทางถนน ${n} จุด` : "เส้นทางถนน";
  if (item.areaKind === "polygon") return withCount ? `พื้นที่รูปทรงอิสระ ${n} จุดมุม` : "พื้นที่รูปทรงอิสระ";
  return "พื้นที่สี่เหลี่ยม";
}
