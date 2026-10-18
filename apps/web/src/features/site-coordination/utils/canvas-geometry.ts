import type { CoordinationPoint } from "@sts/shared";
import { COORDINATION_MAX, COORDINATION_MIN } from "@sts/shared";
import Konva from "konva";

export const clamp = (n: number) => Math.max(COORDINATION_MIN, Math.min(COORDINATION_MAX, n));

// Nearest point on the polygon boundary (image-pixel space): the connector line
// attaches to the closest edge instead of a fixed corner.
export function nearestBoundaryPoint(points: CoordinationPoint[], px: number, py: number, width: number, height: number, closed = true) {
  let best = { x: points[0]!.x * width, y: points[0]!.y * height };
  let bestDistance = Infinity;
  for (let i = 0; i < (closed ? points.length : points.length - 1); i++) {
    const a = { x: points[i]!.x * width, y: points[i]!.y * height };
    const b = { x: points[(i + 1) % points.length]!.x * width, y: points[(i + 1) % points.length]!.y * height };
    const abx = b.x - a.x, aby = b.y - a.y;
    const lengthSquared = abx * abx + aby * aby;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / lengthSquared));
    const qx = a.x + t * abx, qy = a.y + t * aby;
    const distance = (qx - px) ** 2 + (qy - py) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = { x: qx, y: qy }; }
  }
  return best;
}

// Area dragging: during the drag the node keeps Konva's free position and only a
// lightweight pixel offset is tracked (chip, connector and vertices follow via
// their own props). On drop the offset is folded into the geometry points.
export function areaDelta(e: Konva.KonvaEventObject<DragEvent>, start: { x: number; y: number }, base: CoordinationPoint[], width: number, height: number) {
  const dx = Math.max(COORDINATION_MIN - Math.min(...base.map((p) => p.x)), Math.min(COORDINATION_MAX - Math.max(...base.map((p) => p.x)), (e.target.x() - start.x) / width));
  const dy = Math.max(COORDINATION_MIN - Math.min(...base.map((p) => p.y)), Math.min(COORDINATION_MAX - Math.max(...base.map((p) => p.y)), (e.target.y() - start.y) / height));
  return { dx, dy };
}

export const shiftPoints = (base: CoordinationPoint[], dx: number, dy: number) => base.map((p) => ({ x: p.x + dx, y: p.y + dy }));

// Bounding box of the non-white drawing content (image pixels), scanned from a
// downscaled copy. Used to frame the initial view on the drawing itself instead
// of the artwork's empty margins.
export function scanContent(image: HTMLImageElement) {
  const ratio = Math.min(1, 400 / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * ratio));
  const h = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0, w, h);
  const data = context.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3]! > 8 && (data[i]! + data[i + 1]! + data[i + 2]!) / 3 < 235) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: (minX / w) * image.naturalWidth, y: (minY / h) * image.naturalHeight, w: ((maxX - minX + 1) / w) * image.naturalWidth, h: ((maxY - minY + 1) / h) * image.naturalHeight };
}

// Area-weighted centroid (image pixels) where the contractor chip sits.
export function areaCentroid(points: CoordinationPoint[], width: number, height: number) {
  let twiceArea = 0, cx = 0, cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = { x: points[i]!.x * width, y: points[i]!.y * height };
    const b = { x: points[(i + 1) % points.length]!.x * width, y: points[(i + 1) % points.length]!.y * height };
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross; cx += (a.x + b.x) * cross; cy += (a.y + b.y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-6) {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: (sum.x / points.length) * width, y: (sum.y / points.length) * height };
  }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

// Point halfway along a route (image pixels): where its contractor chip sits.
export function routeMidpoint(points: CoordinationPoint[], width: number, height: number) {
  const px = points.map((p) => ({ x: p.x * width, y: p.y * height }));
  const lengths = px.slice(1).map((p, i) => Math.hypot(p.x - px[i]!.x, p.y - px[i]!.y));
  let rest = lengths.reduce((a, b) => a + b, 0) / 2;
  for (let i = 0; i < lengths.length; i++) {
    if (rest <= lengths[i]! && lengths[i]! > 0) {
      const t = rest / lengths[i]!;
      return { x: px[i]!.x + (px[i + 1]!.x - px[i]!.x) * t, y: px[i]!.y + (px[i + 1]!.y - px[i]!.y) * t };
    }
    rest -= lengths[i]!;
  }
  return px[0] ?? { x: 0, y: 0 };
}
