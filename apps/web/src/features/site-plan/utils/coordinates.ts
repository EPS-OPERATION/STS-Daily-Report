export interface MapPoint {
  x: number;
  y: number;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

export function normalizedToMap(point: NormalizedPoint, mapW: number, mapH: number): MapPoint {
  return { x: point.x * mapW, y: point.y * mapH };
}

export function mapToNormalized(point: MapPoint, mapW: number, mapH: number): NormalizedPoint {
  const clamp = (value: number): number => Math.min(1, Math.max(0, value));
  return { x: round4(clamp(point.x / mapW)), y: round4(clamp(point.y / mapH)) };
}

export function clampToMap(point: MapPoint, mapW: number, mapH: number): MapPoint {
  return {
    x: Math.min(mapW, Math.max(0, point.x)),
    y: Math.min(mapH, Math.max(0, point.y)),
  };
}

export function pointsBounds(points: MapPoint[]): Bounds {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
