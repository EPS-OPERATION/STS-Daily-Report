import type { CoordinationPoint } from "./coordination.js";

// Site road network from the EPS road register. EPS draws each road whole (North Road, Boiler Road…);
// where roads cross or one road's end touches another, that is a junction. A road request can then be
// any stretch: tap a start and an end on the roads and the route follows the roads between them,
// cut exactly at the tapped points.

type P = CoordinationPoint;
/** Image size in pixels: distances are measured on the drawing, not in 0..1 units. */
export interface MapSize { width: number; height: number }
export interface NetworkRoad { id: string; name: string; points: P[] }
interface Edge { id: number; a: number; b: number; points: P[]; length: number; roadId: string }
export interface RoadNetwork { nodes: P[]; edges: Edge[]; size: MapSize }
export interface RoadSnap { edge: number; piece: number; t: number; point: P; distance: number }
export interface RoadPath { points: P[]; roadIds: string[]; length: number }

/** A road end this close to another road (share of the drawing's longer side) joins it. */
export const JUNCTION_SNAP = 0.015;
/** A tap this close to a road (share of the longer side) lands on it. */
export const TAP_SNAP = 0.04;

const px = (s: MapSize, d: number) => d * Math.max(s.width, s.height);
const dist = (s: MapSize, a: P, b: P) => Math.hypot((a.x - b.x) * s.width, (a.y - b.y) * s.height);
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function project(s: MapSize, p: P, a: P, b: P) {
  const dx = (b.x - a.x) * s.width, dy = (b.y - a.y) * s.height;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (((p.x - a.x) * s.width) * dx + ((p.y - a.y) * s.height) * dy) / len2));
  const q = lerp(a, b, t);
  return { t, q, d: dist(s, p, q) };
}

function intersect(a1: P, a2: P, b1: P, b2: P): { t: number; u: number } | null {
  const r = { x: a2.x - a1.x, y: a2.y - a1.y }, q = { x: b2.x - b1.x, y: b2.y - b1.y };
  const den = r.x * q.y - r.y * q.x;
  if (Math.abs(den) < 1e-12) return null;
  const w = { x: b1.x - a1.x, y: b1.y - a1.y };
  const t = (w.x * q.y - w.y * q.x) / den, u = (w.x * r.y - w.y * r.x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}

const polyLength = (s: MapSize, pts: P[]) => pts.slice(1).reduce((sum, p, i) => sum + dist(s, pts[i]!, p), 0);
/** Position along a polyline as piece index + fraction. */
const at = (pts: P[], pos: number) => {
  const i = Math.min(pts.length - 2, Math.max(0, Math.floor(pos)));
  return lerp(pts[i]!, pts[i + 1]!, Math.min(1, pos - i));
};
/** The polyline between two positions, in the order from → to. */
function slice(pts: P[], from: number, to: number): P[] {
  if (from > to) return slice(pts, to, from).reverse();
  const out = [at(pts, from)];
  for (let i = Math.floor(from) + 1; i <= Math.ceil(to) - 1 && i < pts.length; i++) if (i > from && i < to) out.push(pts[i]!);
  out.push(at(pts, to));
  return out;
}

export function buildRoadNetwork(roads: NetworkRoad[], size: MapSize): RoadNetwork {
  const snap = px(size, JUNCTION_SNAP);
  // Cut positions per road: its two ends, every crossing, and where another road's end touches it.
  const cuts = roads.map((r) => [0, r.points.length - 1]);
  roads.forEach((ra, i) => {
    roads.forEach((rb, j) => {
      if (i === j) return;
      if (i < j) {
        for (let pa = 0; pa < ra.points.length - 1; pa++) {
          for (let pb = 0; pb < rb.points.length - 1; pb++) {
            const x = intersect(ra.points[pa]!, ra.points[pa + 1]!, rb.points[pb]!, rb.points[pb + 1]!);
            if (x) { cuts[i]!.push(pa + x.t); cuts[j]!.push(pb + x.u); }
          }
        }
      }
      for (const end of [ra.points[0]!, ra.points[ra.points.length - 1]!]) {
        let best: { pos: number; d: number } | null = null;
        for (let pb = 0; pb < rb.points.length - 1; pb++) {
          const pr = project(size, end, rb.points[pb]!, rb.points[pb + 1]!);
          if (!best || pr.d < best.d) best = { pos: pb + pr.t, d: pr.d };
        }
        if (best && best.d <= snap) cuts[j]!.push(best.pos);
      }
    });
  });

  const nodes: P[] = [];
  const nodeAt = (p: P) => {
    const found = nodes.findIndex((n) => dist(size, n, p) <= snap);
    if (found >= 0) return found;
    nodes.push(p);
    return nodes.length - 1;
  };
  const edges: Edge[] = [];
  roads.forEach((r, i) => {
    const sorted = [...new Set(cuts[i]!.map((c) => Math.round(c * 1e6) / 1e6))].sort((a, b) => a - b);
    const marks = sorted.filter((c, k) => k === 0 || dist(size, at(r.points, c), at(r.points, sorted[k - 1]!)) > 1);
    for (let k = 0; k < marks.length - 1; k++) {
      const a = nodeAt(at(r.points, marks[k]!)), b = nodeAt(at(r.points, marks[k + 1]!));
      const pts = slice(r.points, marks[k]!, marks[k + 1]!);
      pts[0] = nodes[a]!; pts[pts.length - 1] = nodes[b]!;
      if (a !== b) edges.push({ id: edges.length, a, b, points: pts, length: polyLength(size, pts), roadId: r.id });
    }
  });
  return { nodes, edges, size };
}

/** Nearest point on any road to a tap; null when the tap is not near a road. */
export function snapToRoad(net: RoadNetwork, p: P, within = TAP_SNAP): RoadSnap | null {
  let best: RoadSnap | null = null;
  for (const e of net.edges) {
    for (let i = 0; i < e.points.length - 1; i++) {
      const pr = project(net.size, p, e.points[i]!, e.points[i + 1]!);
      if (!best || pr.d < best.distance) best = { edge: e.id, piece: i, t: pr.t, point: pr.q, distance: pr.d };
    }
  }
  return best && best.distance <= px(net.size, within) ? best : null;
}

// Shortest way along the roads from one tapped point to the next.
function leg(net: RoadNetwork, from: RoadSnap, to: RoadSnap): RoadPath | null {
  const ea = net.edges[from.edge]!, eb = net.edges[to.edge]!;
  const posA = from.piece + from.t, posB = to.piece + to.t;
  if (ea.id === eb.id) {
    const pts = slice(ea.points, posA, posB);
    return { points: pts, roadIds: [ea.roadId], length: polyLength(net.size, pts) };
  }
  const toEnd = (e: Edge, pos: number, end: "a" | "b") => polyLength(net.size, slice(e.points, pos, end === "a" ? 0 : e.points.length - 1));
  const best = new Map<number, number>(), prev = new Map<number, { node: number; edge: number }>();
  const queue: number[] = [];
  for (const end of ["a", "b"] as const) {
    const n = ea[end], c = toEnd(ea, posA, end);
    if (c < (best.get(n) ?? Infinity)) { best.set(n, c); prev.set(n, { node: -1, edge: -1 }); queue.push(n); }
  }
  const done = new Set<number>();
  while (queue.length) {
    queue.sort((x, y) => best.get(x)! - best.get(y)!);
    const n = queue.shift()!;
    if (done.has(n)) continue;
    done.add(n);
    for (const e of net.edges) {
      if (e.a !== n && e.b !== n) continue;
      const m = e.a === n ? e.b : e.a, c = best.get(n)! + e.length;
      if (c < (best.get(m) ?? Infinity)) { best.set(m, c); prev.set(m, { node: n, edge: e.id }); queue.push(m); }
    }
  }
  let finish: { node: number; cost: number; end: "a" | "b" } | null = null;
  for (const end of ["a", "b"] as const) {
    const n = eb[end];
    if (!best.has(n)) continue;
    const cost = best.get(n)! + toEnd(eb, posB, end);
    if (!finish || cost < finish.cost) finish = { node: n, cost, end };
  }
  if (!finish) return null;
  const chain: { node: number; edge: number }[] = [];
  for (let n = finish.node; n !== -1; ) {
    const step = prev.get(n)!;
    chain.unshift({ node: n, edge: step.edge });
    n = step.node;
  }
  const first = chain[0]!.node;
  const pts: P[] = slice(ea.points, posA, ea.a === first ? 0 : ea.points.length - 1);
  const roadIds = [ea.roadId];
  for (let k = 1; k < chain.length; k++) {
    const e = net.edges[chain[k]!.edge]!;
    const run = e.a === chain[k - 1]!.node ? e.points : [...e.points].reverse();
    pts.push(...run.slice(1));
    roadIds.push(e.roadId);
  }
  pts.push(...slice(eb.points, finish.end === "a" ? 0 : eb.points.length - 1, posB).slice(1));
  roadIds.push(eb.roadId);
  return { points: pts, roadIds, length: finish.cost };
}

/** Route along the roads through the tapped stops, in order. Null when a stop can't be reached. */
export function routeThrough(net: RoadNetwork, stops: RoadSnap[]): RoadPath | null {
  if (stops.length < 2) return null;
  const points: P[] = [], roadIds: string[] = [];
  let length = 0;
  for (let i = 1; i < stops.length; i++) {
    const l = leg(net, stops[i - 1]!, stops[i]!);
    if (!l) return null;
    points.push(...(points.length ? l.points.slice(1) : l.points));
    for (const id of l.roadIds) if (roadIds[roadIds.length - 1] !== id) roadIds.push(id);
    length += l.length;
  }
  // Drop zero-length steps (stops on a junction) so the line stays a valid route.
  const clean = points.filter((p, i) => i === 0 || dist(net.size, p, points[i - 1]!) > 0.5);
  return { points: clean, roadIds, length };
}

// ---- picking whole roads in driving order (dropdown) -------------------------------------------

const edgesOf = (net: RoadNetwork, roadId: string) => net.edges.filter((e) => e.roadId === roadId);
function roadEnds(net: RoadNetwork, roadId: string): number[] {
  const count = new Map<number, number>();
  for (const e of edgesOf(net, roadId)) for (const n of [e.a, e.b]) count.set(n, (count.get(n) ?? 0) + 1);
  return [...count.entries()].filter(([, c]) => c === 1).map(([n]) => n);
}
function junction(net: RoadNetwork, a: string, b: string): number | null {
  const na = new Set(edgesOf(net, a).flatMap((e) => [e.a, e.b]));
  return edgesOf(net, b).flatMap((e) => [e.a, e.b]).find((n) => na.has(n)) ?? null;
}
function snapAtNode(net: RoadNetwork, node: number, roadId: string): RoadSnap | null {
  const e = edgesOf(net, roadId).find((x) => x.a === node || x.b === node);
  if (!e) return null;
  return e.a === node
    ? { edge: e.id, piece: 0, t: 0, point: net.nodes[node]!, distance: 0 }
    : { edge: e.id, piece: e.points.length - 2, t: 1, point: net.nodes[node]!, distance: 0 };
}

/**
 * Roads picked in driving order → the route: start at the far end of the first road, turn at each
 * junction onto the next road, finish at the far end of the last one. One road = the whole road.
 * When the next road does not meet the previous one, the route goes to its nearest end along the
 * roads that join them — those roads appear in `roadIds` (so the caller can show them as added).
 * Null when a picked road can't be reached at all.
 */
export function routeAlongRoads(net: RoadNetwork, roadIds: string[], ends: { start?: number | null; end?: number | null } = {}): RoadPath | null {
  if (roadIds.length === 0) return null;
  const nodesOf = (id: string) => [...new Set(edgesOf(net, id).flatMap((e) => [e.a, e.b]))];
  const gap = (n: number, toRoad: string) => Math.min(...nodesOf(toRoad).map((m) => dist(net.size, net.nodes[n]!, net.nodes[m]!)));
  // Where each road after the first is entered: the junction with the previous road, else its end nearest to it.
  const entry: (number | null)[] = roadIds.map((id, i) => {
    if (i === 0) return null;
    const j = junction(net, roadIds[i - 1]!, id);
    if (j !== null) return j;
    const ends = roadEnds(net, id);
    return ends.length ? ends.reduce((x, y) => (gap(y, roadIds[i - 1]!) < gap(x, roadIds[i - 1]!) ? y : x)) : null;
  });
  const farFrom = (roadId: string, from: number) =>
    roadEnds(net, roadId).reduce<number | null>((best, n) => (best === null || dist(net.size, net.nodes[n]!, net.nodes[from]!) > dist(net.size, net.nodes[best]!, net.nodes[from]!) ? n : best), null);

  const firstId = roadIds[0]!, lastId = roadIds[roadIds.length - 1]!;
  const onRoad = (n: number | null | undefined, id: string) => n !== null && n !== undefined && edgesOf(net, id).some((e) => e.a === n || e.b === n);
  const startNode = onRoad(ends.start, firstId)
    ? ends.start!
    : roadIds.length === 1 ? (roadEnds(net, firstId)[0] ?? null) : entry[1] === null ? null : farFrom(firstId, entry[1]!);
  const stops: (RoadSnap | null)[] = [startNode === null ? null : snapAtNode(net, startNode, firstId)];
  roadIds.slice(1).forEach((id, k) => stops.push(entry[k + 1] === null ? null : snapAtNode(net, entry[k + 1]!, id)));
  const lastEntry = roadIds.length === 1 ? startNode : entry[entry.length - 1]!;
  const endNode = onRoad(ends.end, lastId) && ends.end !== lastEntry
    ? ends.end!
    : lastEntry === null ? null : roadIds.length === 1 ? (roadEnds(net, lastId).find((n) => n !== startNode) ?? null) : farFrom(lastId, lastEntry);
  stops.push(endNode === null ? null : snapAtNode(net, endNode, lastId));
  if (stops.some((x) => x === null)) return null;
  return routeThrough(net, stops as RoadSnap[]);
}

/** Drawing magnet for the road register: share of the longer side within which a point snaps. */
export const DRAW_SNAP = 0.012;

/**
 * While EPS draws or drags a road point: snap onto another road's end or bend first, else onto the
 * nearest point of its line, so roads meet exactly at junctions (no tiny gaps or overshoots).
 * `skipId` = the road being edited. Returns the point unchanged when nothing is close.
 */
export function snapRoadPoint(roads: NetworkRoad[], p: P, size: MapSize, skipId?: string | null, within = DRAW_SNAP): P {
  const limit = px(size, within);
  const others = roads.filter((r) => r.id !== skipId);
  let best: { q: P; d: number } | null = null;
  for (const r of others) for (const v of r.points) {
    const d = dist(size, p, v);
    if (d <= limit && (!best || d < best.d)) best = { q: v, d };
  }
  if (best) return { ...best.q };
  for (const r of others) for (let i = 0; i < r.points.length - 1; i++) {
    const pr = project(size, p, r.points[i]!, r.points[i + 1]!);
    if (pr.d <= limit && (!best || pr.d < best.d)) best = { q: pr.q, d: pr.d };
  }
  return best ? best.q : p;
}

/** Roads that meet both `a` and `b` (the ways to get from one to the other through a single road). */
export function roadsJoining(net: RoadNetwork, a: string, b: string): string[] {
  if (junction(net, a, b) !== null) return [];
  const ids = [...new Set(net.edges.map((e) => e.roadId))].filter((id) => id !== a && id !== b);
  return ids.filter((id) => junction(net, a, id) !== null && junction(net, id, b) !== null);
}

/** A place on a road where a route can start or stop: a junction (named by the roads crossing there) or a road end. */
export interface RoadStop { node: number; point: P; crossing: string[]; isEnd: boolean }

/** Stopping places along one road, in order from one end to the other. */
export function roadStopsOf(net: RoadNetwork, roadId: string): RoadStop[] {
  const own = edgesOf(net, roadId);
  const ends = roadEnds(net, roadId);
  if (!own.length || !ends.length) return [];
  // Walk the road from one end, piece by piece.
  const order = [ends[0]!];
  for (let guard = 0; guard < own.length; guard++) {
    const last = order[order.length - 1]!;
    const next = own.find((e) => (e.a === last || e.b === last) && !order.includes(e.a === last ? e.b : e.a));
    if (!next) break;
    order.push(next.a === last ? next.b : next.a);
  }
  return order.map((node) => ({
    node,
    point: net.nodes[node]!,
    crossing: [...new Set(net.edges.filter((e) => e.roadId !== roadId && (e.a === node || e.b === node)).map((e) => e.roadId))],
    isEnd: ends.includes(node),
  }));
}

/** "ซ้าย" / "ขวา" / "บน" / "ล่าง": which way a place lies from another, as seen on the drawing. */
export function directionWord(net: RoadNetwork, from: P, to: P): "ซ้าย" | "ขวา" | "บน" | "ล่าง" {
  const dx = (to.x - from.x) * net.size.width, dy = (to.y - from.y) * net.size.height;
  return Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "ซ้าย" : "ขวา") : dy < 0 ? "บน" : "ล่าง";
}

/** Where two roads meet (null when they don't). */
export const roadJunction = (net: RoadNetwork, a: string, b: string) => junction(net, a, b);
