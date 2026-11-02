import type { CoordinationItem } from "@sts/shared";

// Report room (screen px) kept clear around the drawing: job titles and notes hang below or beside their marker.
export const REPORT_ROOM = { left: 130, right: 130, top: 40, bottom: 100 };

// Report framing: the drawing content plus every job (marker and area), so nothing printed is cut off.
export function reportBounds(content: { x: number; y: number; w: number; h: number } | null, items: CoordinationItem[], map: { width: number; height: number }) {
  let minX = content?.x ?? 0, minY = content?.y ?? 0;
  let maxX = content ? content.x + content.w : map.width, maxY = content ? content.y + content.h : map.height;
  for (const item of items) {
    for (const p of [{ x: item.x, y: item.y }, ...item.geometry.points]) {
      const px = p.x * map.width, py = p.y * map.height;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  }
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}
