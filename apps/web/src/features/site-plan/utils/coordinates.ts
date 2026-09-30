// Framework-free map math. Map space = base image natural pixels;
// stored geometry is always normalized 0..1 (never viewport pixels).

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

export function translatePointsWithinMap(
  points: MapPoint[],
  dx: number,
  dy: number,
  mapW: number,
  mapH: number,
): MapPoint[] {
  if (points.length === 0) return points;
  const bounds = polygonBounds(points);
  const safeDx = Math.min(mapW - bounds.x - bounds.w, Math.max(-bounds.x, dx));
  const safeDy = Math.min(mapH - bounds.y - bounds.h, Math.max(-bounds.y, dy));
  return points.map((point) => ({ x: point.x + safeDx, y: point.y + safeDy }));
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

// Rotate every point around `center` by `angleRad` (clockwise positive in
// screen/map space where +y points down, matching Konva rotation).
export function rotatePoints(points: MapPoint[], center: MapPoint, angleRad: number): MapPoint[] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  });
}

export type ResizeHandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

// Scale every point away from `anchor` (opposite edge/corner stays fixed).
export function scalePoints(points: MapPoint[], anchor: MapPoint, scaleX: number, scaleY: number): MapPoint[] {
  return points.map((p) => ({
    x: anchor.x + (p.x - anchor.x) * scaleX,
    y: anchor.y + (p.y - anchor.y) * scaleY,
  }));
}

// Edge/corner positions of a bounds box for resize handles.
export function resizeHandlePositions(bounds: Bounds): { id: ResizeHandleId; x: number; y: number }[] {
  const { x, y, w, h } = bounds;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    { id: "nw", x, y },
    { id: "n", x: cx, y },
    { id: "ne", x: x + w, y },
    { id: "e", x: x + w, y: cy },
    { id: "se", x: x + w, y: y + h },
    { id: "s", x: cx, y: y + h },
    { id: "sw", x, y: y + h },
    { id: "w", x, y: cy },
  ];
}

// Anchor + per-axis scales for dragging one resize handle to `pt`.
// Edges scale a single axis (e/w = length, n/s = height), corners both.
export function resizeScales(
  bounds: Bounds,
  handle: ResizeHandleId,
  pt: MapPoint,
): { anchor: MapPoint; scaleX: number; scaleY: number } {
  const right = bounds.x + bounds.w;
  const bottom = bounds.y + bounds.h;
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const w = Math.max(bounds.w, 1e-6);
  const h = Math.max(bounds.h, 1e-6);
  const safe = (v: number): number => (Number.isFinite(v) ? v : 1);
  switch (handle) {
    case "e":
      return { anchor: { x: bounds.x, y: cy }, scaleX: safe((pt.x - bounds.x) / w), scaleY: 1 };
    case "w":
      return { anchor: { x: right, y: cy }, scaleX: safe((right - pt.x) / w), scaleY: 1 };
    case "s":
      return { anchor: { x: cx, y: bounds.y }, scaleX: 1, scaleY: safe((pt.y - bounds.y) / h) };
    case "n":
      return { anchor: { x: cx, y: bottom }, scaleX: 1, scaleY: safe((bottom - pt.y) / h) };
    case "se":
      return {
        anchor: { x: bounds.x, y: bounds.y },
        scaleX: safe((pt.x - bounds.x) / w),
        scaleY: safe((pt.y - bounds.y) / h),
      };
    case "sw":
      return {
        anchor: { x: right, y: bounds.y },
        scaleX: safe((right - pt.x) / w),
        scaleY: safe((pt.y - bounds.y) / h),
      };
    case "ne":
      return {
        anchor: { x: bounds.x, y: bottom },
        scaleX: safe((pt.x - bounds.x) / w),
        scaleY: safe((bottom - pt.y) / h),
      };
    case "nw":
      return {
        anchor: { x: right, y: bottom },
        scaleX: safe((right - pt.x) / w),
        scaleY: safe((bottom - pt.y) / h),
      };
  }
}

function distToSegment(p: MapPoint, a: MapPoint, b: MapPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// Ray-casting point-in-polygon (map units). Used to detect genuinely
// ambiguous clicks that land inside several same-level zone polygons.
export function pointInPolygon(point: MapPoint, polygon: MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y) {
      const intersectX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (point.x < intersectX) inside = !inside;
    }
  }
  return inside;
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
