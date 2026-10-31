import type { CoordinationPoint, CoordinationSection, CoordinationSectionActivity, CoordinationSectionPlan } from "@sts/shared";

// Colours offered for a route section (distinct from each other and readable over an aerial photo).
export const SECTION_COLORS = ["#E91E8C", "#F59E0B", "#FACC15", "#22C55E", "#3B82F6", "#8B5CF6", "#EF4444", "#C2410C", "#0EA5E9", "#14B8A6"] as const;

const RANGE = /^\s*([A-Za-z0-9]{1,4})\s*[-–]\s*([A-Za-z0-9]{1,4})\s*$/;

/** "A-B" → ["A", "B"]: the labels of the section's two ends. Other codes have none. */
export function sectionEnds(code: string): [string, string] | null {
  const match = RANGE.exec(code);
  return match ? [match[1]!.toUpperCase(), match[2]!.toUpperCase()] : null;
}

/** The next code to suggest: "A-B" first, "B-C" after "A-B", otherwise S1, S2 … */
export function nextSectionCode(codes: string[]): string {
  if (!codes.length) return "A-B";
  const taken = new Set(codes.map((c) => c.trim().toUpperCase()));
  for (const code of [...codes].reverse()) {
    const ends = sectionEnds(code);
    if (ends && ends[1].length === 1 && /[A-Y]/.test(ends[1])) {
      const next = `${ends[1]}-${String.fromCharCode(ends[1].charCodeAt(0) + 1)}`;
      if (!taken.has(next)) return next;
    }
    break;
  }
  let n = codes.length + 1;
  while (taken.has(`S${n}`)) n++;
  return `S${n}`;
}

/** The first colour nobody on the map uses yet. */
export function nextSectionColor(used: string[]): string {
  const taken = new Set(used.map((c) => c.toUpperCase()));
  return SECTION_COLORS.find((c) => !taken.has(c)) ?? SECTION_COLORS[used.length % SECTION_COLORS.length]!;
}

export interface SectionMarker { label: string; point: CoordinationPoint }

const gap = (a: CoordinationPoint, b: CoordinationPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** Lettered points where sections meet ("A-B" + "B-C" share B): one marker per label. A line may be drawn in either
 *  direction, so the shared letter goes on the end that touches the neighbour, not simply on the first point. */
export function sectionMarkers(sections: Pick<CoordinationSection, "code" | "points">[]): SectionMarker[] {
  const lines = sections.flatMap((s) => {
    const ends = sectionEnds(s.code);
    return ends && s.points.length >= 2 ? [{ ends, first: s.points[0]!, last: s.points[s.points.length - 1]! }] : [];
  });
  const seen = new Map<string, SectionMarker>();
  for (const line of lines) {
    // Reversed when its first point sits nearer to the neighbour sharing its second letter (or vice versa).
    let flip = false;
    for (const other of lines) {
      if (other === line) continue;
      const near = (p: CoordinationPoint) => Math.min(gap(p, other.first), gap(p, other.last));
      if (other.ends.includes(line.ends[0]) && near(line.last) < near(line.first)) { flip = true; break; }
      if (other.ends.includes(line.ends[1]) && near(line.first) < near(line.last)) { flip = true; break; }
    }
    const [start, end] = flip ? [line.last, line.first] : [line.first, line.last];
    if (!seen.has(line.ends[0])) seen.set(line.ends[0], { label: line.ends[0], point: start });
    if (!seen.has(line.ends[1])) seen.set(line.ends[1], { label: line.ends[1], point: end });
  }
  return [...seen.values()];
}

/** Nearest end of another section within `radius` (map pixels), so a new line starts exactly where the last one stopped. */
export function snapToSectionEnd(
  sections: Pick<CoordinationSection, "id" | "points">[], point: CoordinationPoint, size: { width: number; height: number }, radius: number, exceptId?: string | null,
): CoordinationPoint {
  let best: CoordinationPoint | null = null, bestDistance = radius;
  for (const section of sections) {
    if (section.id === exceptId || section.points.length < 2) continue;
    for (const end of [section.points[0]!, section.points[section.points.length - 1]!]) {
      const distance = Math.hypot((end.x - point.x) * size.width, (end.y - point.y) * size.height);
      if (distance <= bestDistance) { best = end; bestDistance = distance; }
    }
  }
  return best ?? point;
}

/** Directions tried for a letter's leader line, in order: right (as on the deck), left, then the diagonals and up/down. */
const LEADER_ANGLES = [0, 180, -45, 135, 45, -135, -90, 90];

const segmentGap = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

/** Where each lettered circle sits, as an offset from its route end (drawing pixels). Letters go to the right on a
 *  leader line; a spot that would cover a route line, overlap a letter already placed, or leave the drawing is
 *  skipped for the next direction (so a letter on a horizontal stretch drops below or above it, as on the deck). */
export function placeSectionLabels(
  markers: SectionMarker[], size: { width: number; height: number }, reach: number, radius: number, lines: CoordinationPoint[][] = [],
  /** Letters the user moved (map fractions, by label): they stay where they were put. */
  pinned: Record<string, CoordinationPoint> = {},
) {
  const placed: { x: number; y: number }[] = [];
  const px = lines.map((pts) => pts.map((p) => ({ x: p.x * size.width, y: p.y * size.height })));
  return markers.map((marker) => {
    const at = { x: marker.point.x * size.width, y: marker.point.y * size.height };
    const pin = pinned[marker.label];
    if (pin) {
      const centre = { x: pin.x * size.width, y: pin.y * size.height };
      placed.push(centre);
      return { ...marker, dx: centre.x - at.x, dy: centre.y - at.y };
    }
    const options = LEADER_ANGLES.map((deg) => ({ dx: Math.cos((deg * Math.PI) / 180) * reach, dy: Math.sin((deg * Math.PI) / 180) * reach }));
    const centre = (o: { dx: number; dy: number }) => ({ x: at.x + o.dx, y: at.y + o.dy });
    // The bottom-right corner is where the map's zoom buttons float at the fitted view: letters stay out of it.
    const underZoom = (c: { x: number; y: number }) => c.x + radius > size.width * 0.9 && c.y + radius > size.height * 0.72;
    const inside = (c: { x: number; y: number }) => c.x - radius >= 0 && c.x + radius <= size.width && c.y - radius >= 0 && c.y + radius <= size.height && !underZoom(c);
    const clearOfLetters = (c: { x: number; y: number }) => placed.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= radius * 2.3);
    const clearOfLines = (c: { x: number; y: number }) => px.every((pts) => pts.slice(1).every((b, i) => segmentGap(c, pts[i]!, b) >= radius * 1.4));
    const offset = options.find((o) => { const c = centre(o); return inside(c) && clearOfLetters(c) && clearOfLines(c); })
      ?? options.find((o) => { const c = centre(o); return inside(c) && clearOfLetters(c); })
      ?? options[0]!;
    placed.push(centre(offset));
    return { ...marker, ...offset };
  });
}

// ---- the "who is working here, and how many" card on a route section ------------------------------------------------

export interface CalloutRow {
  contractorId: string;
  code: string;
  color: string;
  /** Primary work description of this contractor in this section (e.g. "ติดตั้ง"). */
  work: string;
  /** null = hidden from this viewer */
  people: number | null;
}
export interface SectionCallout {
  rows: CalloutRow[];
  /** Contractors beyond `maxRows`. */
  more: number;
  /** All people on the section, only when every contractor's number is visible. */
  total: number | null;
  /** From yesterday's Tomorrow Forecast (no headcount) instead of today's reports. */
  plan: boolean;
}

/** One row per contractor (primary contractor first, showing work description); headcount is kept for detail view. */
export function summariseSectionWork(
  activities: (Pick<CoordinationSectionActivity, "contractorId" | "contractorCode" | "headcount"> & { work?: string })[],
  planned: (Pick<CoordinationSectionPlan, "contractorId" | "contractorCode"> & { work?: string })[],
  colorOf: (contractorId: string) => string | undefined,
  fallbackColor: string,
  maxRows = 3,
): SectionCallout | null {
  const plan = activities.length === 0;
  const source = plan ? planned.map((p) => ({ ...p, headcount: null as number | null })) : activities;
  if (!source.length) return null;
  const byContractor = new Map<string, CalloutRow>();
  for (const a of source) {
    const existing = byContractor.get(a.contractorId);
    const row = existing ?? {
      contractorId: a.contractorId,
      code: a.contractorCode,
      color: colorOf(a.contractorId) ?? fallbackColor,
      work: a.work?.trim() ?? "",
      people: null,
    };
    if (a.headcount !== null) row.people = (row.people ?? 0) + a.headcount;
    if (!row.work && a.work) row.work = a.work.trim();
    byContractor.set(a.contractorId, row);
  }
  // Primary contractor first: highest headcount (or most activity) on top, then alphabetical by code
  const all = [...byContractor.values()].sort((a, b) => (b.people ?? 0) - (a.people ?? 0) || a.code.localeCompare(b.code));
  const total = !plan && all.every((r) => r.people !== null) ? all.reduce((sum, r) => sum + r.people!, 0) : null;
  return { rows: all.slice(0, maxRows), more: Math.max(0, all.length - maxRows), total, plan };
}

export interface CalloutBox { id: string; /** The section point the leader line starts from (map fractions). */ anchor: CoordinationPoint; w: number; h: number }
export interface Obstacle { x: number; y: number; r: number }
type Rect = { x: number; y: number; w: number; h: number };

const rectsTouch = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const circleTouchesRect = (c: Obstacle, r: Rect) => {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.w)), ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
  return Math.hypot(c.x - nx, c.y - ny) < c.r;
};
// Does the segment a→b cross (or sit inside) the rectangle?
function segmentTouchesRect(a: { x: number; y: number }, b: { x: number; y: number }, r: Rect) {
  const inside = (p: { x: number; y: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  if (inside(a) || inside(b)) return true;
  const corners = [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
  const cross = (o: { x: number; y: number }, p: { x: number; y: number }, q: { x: number; y: number }) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  return corners.some((c, i) => {
    const d = corners[(i + 1) % 4]!;
    return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
  });
}

const CALLOUT_ANGLES = [0, 180, -45, 45, 135, -135, -90, 90];

/** Centre of each card (drawing px). Cards sit beside their section, never on a route line, a lettered circle or
 *  another card; a card the user moved stays where it was put. Several distances are tried before giving up. */
export function placeCallouts(
  boxes: CalloutBox[], size: { width: number; height: number }, gap: number, lines: CoordinationPoint[][], obstacles: Obstacle[],
  pinned: Record<string, CoordinationPoint> = {},
) {
  const px = lines.map((pts) => pts.map((p) => ({ x: p.x * size.width, y: p.y * size.height })));
  const placed: Rect[] = [];
  return boxes.map((box) => {
    const at = { x: box.anchor.x * size.width, y: box.anchor.y * size.height };
    const rectAt = (cx: number, cy: number): Rect => ({ x: cx - box.w / 2, y: cy - box.h / 2, w: box.w, h: box.h });
    const pin = pinned[box.id];
    if (pin) {
      const cx = pin.x * size.width, cy = pin.y * size.height;
      placed.push(rectAt(cx, cy));
      return { id: box.id, cx, cy };
    }
    const fits = (r: Rect) =>
      r.x >= 0 && r.y >= 0 && r.x + r.w <= size.width && r.y + r.h <= size.height
      && placed.every((o) => !rectsTouch(o, { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 }))
      && obstacles.every((c) => !circleTouchesRect({ ...c, r: c.r + 4 }, r))
      && px.every((pts) => pts.slice(1).every((b, i) => !segmentTouchesRect(pts[i]!, b, { x: r.x - 5, y: r.y - 5, w: r.w + 10, h: r.h + 10 })));
    for (const ring of [1, 1.7, 2.5]) {
      for (const deg of CALLOUT_ANGLES) {
        const rad = (deg * Math.PI) / 180;
        const cx = at.x + Math.cos(rad) * (box.w / 2 + gap * ring), cy = at.y + Math.sin(rad) * (box.h / 2 + gap * ring);
        if (fits(rectAt(cx, cy))) { placed.push(rectAt(cx, cy)); return { id: box.id, cx, cy }; }
      }
    }
    // Nowhere clean (a small screen): the spot, kept inside the picture, that covers the least — other cards count most,
    // then lettered circles, then route lines.
    let best = { cx: at.x, cy: at.y, cost: Infinity };
    for (const ring of [1, 1.7, 2.5]) {
      for (const deg of CALLOUT_ANGLES) {
        const rad = (deg * Math.PI) / 180;
        const cx = Math.max(box.w / 2, Math.min(size.width - box.w / 2, at.x + Math.cos(rad) * (box.w / 2 + gap * ring)));
        const cy = Math.max(box.h / 2, Math.min(size.height - box.h / 2, at.y + Math.sin(rad) * (box.h / 2 + gap * ring)));
        const r = rectAt(cx, cy);
        const cost = placed.filter((o) => rectsTouch(o, r)).length * 1000
          + obstacles.filter((c) => circleTouchesRect(c, r)).length * 100
          + px.reduce((n, pts) => n + pts.slice(1).filter((b, i) => segmentTouchesRect(pts[i]!, b, r)).length, 0);
        if (cost < best.cost) best = { cx, cy, cost };
      }
    }
    placed.push(rectAt(best.cx, best.cy));
    return { id: box.id, cx: best.cx, cy: best.cy };
  });
}
