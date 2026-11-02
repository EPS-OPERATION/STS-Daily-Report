import type { PolygonGeometry } from "../types/site-plan.types.js";

// Normalized 0..1 geometry -> SVG viewBox coordinates (single system,
// no browser pixel math).
export function toSvgPoints(geometry: PolygonGeometry, width: number, height: number): string {
  return geometry.points.map((p) => `${p.x * width},${p.y * height}`).join(" ");
}

export function centroid(geometry: PolygonGeometry, width: number, height: number): { x: number; y: number } {
  const pts = geometry.points;
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: (sum.x / pts.length) * width, y: (sum.y / pts.length) * height };
}
