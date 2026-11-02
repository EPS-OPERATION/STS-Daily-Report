/** Screen-space box: left, top, right, bottom (px). */
export type Box = [number, number, number, number];

/** What one job shows: just its icon (and area), + its name, or + name and note. */
export type Detail = "icon" | "caption" | "full";

export interface DeclutterEntry {
  id: string;
  /** Always shown in full (the selected / edited job). */
  pinned: boolean;
  /** The icon disc / text pill: labels may never cover it. */
  mark: Box;
  /** Name under the icon (null = none to show). */
  caption: Box | null;
  /** Name + note together (null = no note). */
  full: Box | null;
}

/** Drawing width on screen (px) from which names / notes are shown at all (Google-Maps-style level of detail). */
export const NAMES_FROM_PX = 700;
export const NOTES_FROM_PX = 1400;

const overlaps = (a: Box, b: Box) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/**
 * Level of detail + label collision for a crowded map. Zoomed out, jobs are icons only; zooming in brings
 * names, then notes. A label that would cover another job's icon or an already placed label is hidden
 * (the job falls back to a shorter label, then to its icon) until zooming in makes room. Entries are placed
 * in the given order (callers put the important ones first); pinned jobs always show everything.
 */
export function declutter(entries: DeclutterEntry[], drawingWidthPx: number): Map<string, Detail> {
  const result = new Map<string, Detail>();
  const level = drawingWidthPx >= NOTES_FROM_PX ? 2 : drawingWidthPx >= NAMES_FROM_PX ? 1 : 0;
  const placed: Box[] = [];
  for (const e of entries) if (e.pinned) { result.set(e.id, "full"); if (e.full ?? e.caption) placed.push((e.full ?? e.caption)!); }
  const fits = (box: Box, self: DeclutterEntry) =>
    !placed.some((p) => overlaps(box, p)) && !entries.some((o) => o !== self && overlaps(box, o.mark));
  for (const e of entries) {
    if (e.pinned) continue;
    const tries: [Detail, Box | null][] = level === 2 ? [["full", e.full], ["caption", e.caption]] : level === 1 ? [["caption", e.caption]] : [];
    const hit = tries.find(([, box]) => box && fits(box, e));
    result.set(e.id, hit ? hit[0] : "icon");
    if (hit) placed.push(hit[1]!);
  }
  return result;
}
