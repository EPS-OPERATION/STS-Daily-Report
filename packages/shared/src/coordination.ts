export const COORDINATION_ICONS = ["crane", "machinery", "truck", "weld", "pipe", "box", "pin", "text"] as const;
export type CoordinationIcon = (typeof COORDINATION_ICONS)[number];
export interface CoordinationPoint { x: number; y: number }
export interface CoordinationGeometry { type: "polygon"; points: CoordinationPoint[] }
export type CoordinationAreaKind = "rectangle" | "polygon";
export interface CoordinationInput {
  contractorId: string; workDate: string; title: string; icon: CoordinationIcon;
  x: number; y: number; rotation: number; areaKind: CoordinationAreaKind; geometry: CoordinationGeometry;
  /** false = the marker stands alone; no connector line to its area (defaults to true). */
  linkArea?: boolean;
}
export interface CoordinationItem extends CoordinationInput {
  id: string; mapId: string; projectId: string; revision: number; createdAt: string; updatedAt: string;
}
export interface CoordinationContractor {
  id: string; code: string; name: string; color: string; revision: number;
}
export interface CoordinationData {
  map: { id: string; projectId: string; imagePath: string; width: number; height: number };
  contractors: CoordinationContractor[]; items: CoordinationItem[];
  editableContractorIds: string[]; canManageColors: boolean;
}
// Separate from chart colours: every contractor remains individually identifiable.
export const COORDINATION_COLORS = [
  "#2563EB", "#C2410C", "#15803D", "#7E22CE", "#BE123C", "#0E7490",
  "#A16207", "#4338CA", "#0F766E", "#9D174D", "#4D7C0F", "#92400E",
  "#0369A1", "#B91C1C", "#6D28D9", "#047857", "#A21CAF", "#334155",
  "#1D4ED8", "#9A3412", "#166534", "#581C87", "#9F1239", "#155E75",
] as const;

// Coordinates are normalised to the map image (0..1). Items may be parked a
// little outside the drawing so labels fit in the white margin; anything past
// the margin is out of bounds (rendered grey and rejected by validation).
export const COORDINATION_MARGIN = 0.15;
export const COORDINATION_MIN = -COORDINATION_MARGIN;
export const COORDINATION_MAX = 1 + COORDINATION_MARGIN;

const cross = (a: CoordinationPoint, b: CoordinationPoint, c: CoordinationPoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (a: CoordinationPoint, b: CoordinationPoint, p: CoordinationPoint) =>
  Math.abs(cross(a, b, p)) < 1e-10 && p.x >= Math.min(a.x, b.x) - 1e-10 && p.x <= Math.max(a.x, b.x) + 1e-10 && p.y >= Math.min(a.y, b.y) - 1e-10 && p.y <= Math.max(a.y, b.y) + 1e-10;

export function coordinationGeometryError(geometry: CoordinationGeometry): string | null {
  const p = geometry.points;
  if (geometry.type !== "polygon" || p.length < 3 || p.length > 500) return "พื้นที่ต้องมีจุดมุม 3–500 จุด";
  if (p.some((v) => !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.x < COORDINATION_MIN || v.x > COORDINATION_MAX || v.y < COORDINATION_MIN || v.y > COORDINATION_MAX)) return "พื้นที่ต้องอยู่ภายในผัง";
  let area = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i]!, b = p[(i + 1) % p.length]!;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-8) return "จุดมุมต้องไม่ซ้ำกัน";
    area += a.x * b.y - b.x * a.y;
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      const c = p[j]!, d = p[(j + 1) % p.length]!;
      if ((cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)) return "เส้นขอบพื้นที่ต้องไม่ตัดกัน";
    }
  }
  return Math.abs(area) < 1e-8 ? "พื้นที่ต้องมีขนาดมากกว่าศูนย์" : null;
}

export function coordinationDateValid(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function coordinationToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((part) => parts.find((v) => v.type === part)!.value).join("-");
}

export function coordinationRectangleValid(points: CoordinationPoint[], width: number, height: number): boolean {
  if (points.length !== 4) return false;
  const p = points.map((v) => ({ x: v.x * width, y: v.y * height }));
  const a = p[0]!, b = p[1]!, c = p[2]!, d = p[3]!;
  const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - a.x, vy = d.y - a.y;
  return Math.abs(ux * vx + uy * vy) <= 1e-6 * Math.hypot(ux, uy) * Math.hypot(vx, vy)
    && Math.hypot(a.x + c.x - b.x - d.x, a.y + c.y - b.y - d.y) < 1e-4;
}
