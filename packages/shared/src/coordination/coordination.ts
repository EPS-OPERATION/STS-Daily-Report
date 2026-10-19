export const COORDINATION_ICONS = ["crane", "machinery", "truck", "weld", "pipe", "box", "pin", "road", "text"] as const;
export type CoordinationIcon = (typeof COORDINATION_ICONS)[number];
export interface CoordinationPoint { x: number; y: number }
// polygon = a work area (rectangle or free shape); polyline = a road route (open line, "route" items).
export interface CoordinationGeometry { type: "polygon" | "polyline"; points: CoordinationPoint[] }
export type CoordinationAreaKind = "rectangle" | "polygon" | "route";
export interface CoordinationInput {
  contractorId: string; workDate: string; title: string; icon: CoordinationIcon;
  x: number; y: number; rotation: number; areaKind: CoordinationAreaKind; geometry: CoordinationGeometry;
  /** false = the marker stands alone; no connector line to its area (defaults to true). */
  linkArea?: boolean;
  /** Road routes only: traffic both ways (arrows at both ends). */
  twoWay?: boolean;
  /** Optional detail behind the short title (hidden on the map until the job is clicked). */
  note?: string | null;
}
export interface CoordinationItem extends CoordinationInput {
  id: string; mapId: string; projectId: string; revision: number; createdAt: string; updatedAt: string;
}
export interface CoordinationContractor {
  id: string; code: string; name: string; color: string; revision: number;
  /** false for the owner company (EPS): its old items still show, but it cannot be picked. */
  isContractor: boolean;
}
/** One shared note for the whole map on a work date (EPS writes, everyone reads). */
export interface CoordinationDayNote {
  note: string; updatedAt: string; updatedByName: string | null;
}
/** EPS stamp: the day's map is final — nobody can change jobs or the day note until EPS unlocks it. */
export interface CoordinationDayLock {
  lockedAt: string; lockedByName: string | null;
}
/** A road request for this day that has a route on the map (from the contractors' Daily Request). */
export interface CoordinationRoad {
  id: string; contractorId: string; roadLocation: string; startTime: string; endTime: string; purpose: string;
  route: CoordinationPoint[];
  /** Another contractor uses the same place at an overlapping time. */
  clash: boolean;
}
export interface CoordinationData {
  map: { id: string; projectId: string; imagePath: string; width: number; height: number };
  contractors: CoordinationContractor[]; items: CoordinationItem[];
  roads: CoordinationRoad[];
  editableContractorIds: string[]; canManageColors: boolean;
  dayNote: CoordinationDayNote | null; canEditDayNote: boolean;
  lock: CoordinationDayLock | null; canLock: boolean;
}
/** Printable day report (EPS only): the drawing with every job of the day and the day note. */
export interface CoordinationReport {
  projectName: string; date: string; generatedAt: string; generatedByName: string | null;
  map: CoordinationData["map"]; contractors: CoordinationContractor[]; items: CoordinationItem[];
  roads: CoordinationRoad[];
  dayNote: CoordinationDayNote | null;
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
  if (geometry.type === "polyline") return routeGeometryError(p);
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

const inBounds = (v: CoordinationPoint) =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && v.x >= COORDINATION_MIN && v.x <= COORDINATION_MAX && v.y >= COORDINATION_MIN && v.y <= COORDINATION_MAX;

// A road route: 2–500 points along the road, inside the drawing, no zero-length step.
export function routeGeometryError(p: CoordinationPoint[]): string | null {
  if (p.length < 2 || p.length > 500) return "เส้นทางต้องมี 2–500 จุด";
  if (!p.every(inBounds)) return "เส้นทางต้องอยู่ภายในผัง";
  for (let i = 1; i < p.length; i++) {
    if (Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y) < 1e-8) return "จุดที่ต่อกันต้องไม่ซ้ำกัน";
  }
  return null;
}

// Two routes closer than this (drawing pixels) are on the same stretch of road.
export const ROUTE_CLASH_DISTANCE_PX = 40;

type Px = { x: number; y: number };
function pointSegment(p: Px, a: Px, b: Px): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const len = abx * abx + aby * aby;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}
function segmentsCross(a: Px, b: Px, c: Px, d: Px): boolean {
  const k = (p: Px, q: Px, r: Px) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return k(a, b, c) * k(a, b, d) < 0 && k(c, d, a) * k(c, d, b) < 0;
}
// Smallest distance between two open polylines, in drawing pixels (0 when they cross).
export function routeDistance(r1: CoordinationPoint[], r2: CoordinationPoint[], width: number, height: number): number {
  const s = (p: CoordinationPoint) => ({ x: p.x * width, y: p.y * height });
  let best = Infinity;
  for (let i = 1; i < r1.length; i++) {
    const a = s(r1[i - 1]!), b = s(r1[i]!);
    for (let j = 1; j < r2.length; j++) {
      const c = s(r2[j - 1]!), d = s(r2[j]!);
      if (segmentsCross(a, b, c, d)) return 0;
      best = Math.min(best, pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
    }
  }
  return best;
}

// Routes of different contractors on the same day that cross or run together:
// route id → the other contractors it collides with. Warning only, nothing is blocked.
export function coordinationRouteClashes(
  items: Pick<CoordinationItem, "id" | "contractorId" | "workDate" | "areaKind" | "geometry">[],
  width: number,
  height: number,
): Map<string, string[]> {
  const routes = items.filter((i) => i.areaKind === "route" && i.geometry.points.length >= 2);
  const clashes = new Map<string, string[]>();
  const add = (id: string, other: string) => {
    const list = clashes.get(id) ?? [];
    if (!list.includes(other)) list.push(other);
    clashes.set(id, list);
  };
  for (let i = 0; i < routes.length; i++) {
    for (let j = i + 1; j < routes.length; j++) {
      const a = routes[i]!, b = routes[j]!;
      if (a.contractorId === b.contractorId || a.workDate !== b.workDate) continue;
      if (routeDistance(a.geometry.points, b.geometry.points, width, height) <= ROUTE_CLASH_DISTANCE_PX) {
        add(a.id, b.contractorId);
        add(b.id, a.contractorId);
      }
    }
  }
  return clashes;
}

// Site road register (EPS): a road is split at junctions into segments; requests pick segments.
export interface RoadSegment {
  id: string;
  /** Road code shared by its segments, e.g. "R2". */
  road: string;
  /** Segment name shown to contractors, e.g. "R2 Boiler–ACC". */
  name: string;
  points: CoordinationPoint[];
  closed: boolean;
}
