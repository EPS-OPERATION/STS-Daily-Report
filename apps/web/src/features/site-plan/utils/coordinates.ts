// Framework-free map math. Map space = base image natural pixels;
// stored geometry is always normalized 0..1 (never viewport pixels).

// Map space = base drawing natural pixels (master-layout-map.png 1586x992).
export const SITE_MAP_W = 1586;
export const SITE_MAP_H = 992;

export interface MapPoint {
  x: number;
  y: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

const round4 = (v: number): number => Math.round(v * 10000) / 10000;

export function normalizedToMap(p: NormalizedPoint, mapW: number, mapH: number): MapPoint {
  return { x: p.x * mapW, y: p.y * mapH };
}

export function mapToNormalized(p: MapPoint, mapW: number, mapH: number): NormalizedPoint {
  const clamp = (v: number): number => Math.min(1, Math.max(0, v));
  return { x: round4(clamp(p.x / mapW)), y: round4(clamp(p.y / mapH)) };
}

export function clampToMap(p: MapPoint, mapW: number, mapH: number): MapPoint {
  return {
    x: Math.min(mapW, Math.max(0, p.x)),
    y: Math.min(mapH, Math.max(0, p.y)),
  };
}

export function flattenPoints(points: MapPoint[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function polygonBounds(points: MapPoint[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

export function polygonCenter(points: MapPoint[]): MapPoint {
  const sum = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function distToSegment(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Insertion index for a new vertex on the nearest polygon edge.
export function nearestEdgeIndex(points: MapPoint[], p: MapPoint): number {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const d = distToSegment(p, a, b);
    if (d < bestD) {
      bestD = d;
      best = i + 1;
    }
  }
  return best;
}
