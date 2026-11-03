import type { CoordinationItem } from "@sts/shared";

// Report room (screen px) kept clear around the drawing: job titles and notes hang below or beside their marker.
export const REPORT_ROOM = { left: 130, right: 130, top: 40, bottom: 100 };

// Report framing: the drawing content plus every job (marker and area), so nothing printed is cut off.
// `items` focuses on the reported jobs instead of the whole drawing; useful when a site map has many
// jobs clustered in one area and the full plan would make their labels unreadable.
export function reportBounds(
  content: { x: number; y: number; w: number; h: number } | null,
  items: CoordinationItem[],
  map: { width: number; height: number },
  focus: "content" | "items" = "content",
) {
  const useItems = focus === "items" && items.length > 0;
  let minX = useItems ? Infinity : content?.x ?? 0, minY = useItems ? Infinity : content?.y ?? 0;
  let maxX = useItems ? -Infinity : content ? content.x + content.w : map.width;
  let maxY = useItems ? -Infinity : content ? content.y + content.h : map.height;
  for (const item of items) {
    for (const p of [{ x: item.x, y: item.y }, ...item.geometry.points]) {
      const px = p.x * map.width, py = p.y * map.height;
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
  }
  if (useItems) {
    // Keep a little context around the jobs (and never beyond the drawing).
    const pad = Math.max(80, Math.max(maxX - minX, maxY - minY) * 0.08);
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(map.width, maxX + pad); maxY = Math.min(map.height, maxY + pad);
  }
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}
