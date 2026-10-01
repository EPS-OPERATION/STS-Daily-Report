import { ValidationError } from "@/shared/errors/app-error.js";
import type { NormalizedPoint, PolygonGeometry } from "./site-plan.type.js";

export function parseNormalizedPoint(input: unknown): NormalizedPoint {
  if (typeof input !== "object" || input === null) {
    throw new ValidationError("Map point must be an object", { point: input });
  }
  const { x, y } = input as Record<string, unknown>;
  if (typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1) {
    throw new ValidationError("Map point x must be within 0..1", { x });
  }
  if (typeof y !== "number" || !Number.isFinite(y) || y < 0 || y > 1) {
    throw new ValidationError("Map point y must be within 0..1", { y });
  }
  return { x, y };
}

export function polygonCenter(geometry: PolygonGeometry): NormalizedPoint {
  const xs = geometry.points.map((point) => point.x);
  const ys = geometry.points.map((point) => point.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

export function resolveSitePlanPoints<T extends { id: string }>(
  explicit: { zoneId: string; zone: T; view?: string; x: number | null; y: number | null }[],
  legacy: { id: string; zone: T; geometry: unknown }[],
  parentZoneIds: ReadonlySet<string>,
) {
  const explicitZoneIds = new Set(
    explicit.filter((point) => (point.view ?? "top") === "top").map((point) => point.zoneId),
  );
  const points: { zoneId: string; zone: T; view: string; x: number; y: number; legacyDerived?: boolean }[] =
    explicit.flatMap((point) =>
      point.x == null || point.y == null
        ? []
        : [{ zoneId: point.zoneId, zone: point.zone, view: point.view ?? "top", x: point.x, y: point.y }],
    );
  for (const area of legacy) {
    if (explicitZoneIds.has(area.zone.id) || parentZoneIds.has(area.zone.id)) continue;
    try {
      points.push({
        zoneId: area.zone.id,
        zone: area.zone,
        view: "top",
        ...polygonCenter(parseGeometry(area.geometry)),
        legacyDerived: true,
      });
    } catch {
      // Malformed legacy area data stays preserved and is treated as unmapped.
    }
  }
  return points;
}

// V1 supports polygon only, normalized 0..1. Never trust frontend geometry.
export function parseGeometry(input: unknown): PolygonGeometry {
  if (typeof input !== "object" || input === null) {
    throw new ValidationError("Geometry must be an object", { geometry: input });
  }
  const g = input as Record<string, unknown>;
  if (g["type"] !== "polygon") {
    throw new ValidationError("Only polygon geometry is supported", { type: g["type"] });
  }
  if (!Array.isArray(g["points"]) || g["points"].length < 3 || g["points"].length > 500) {
    throw new ValidationError("Polygon needs 3..500 points", { points: g["points"] });
  }
  const points = g["points"].map((p, i) => {
    if (typeof p !== "object" || p === null) {
      throw new ValidationError(`Point ${i} must be { x, y }`, { point: p });
    }
    const { x, y } = p as Record<string, unknown>;
    if (typeof x !== "number" || !Number.isFinite(x) || x < 0 || x > 1) {
      throw new ValidationError(`Point ${i}.x must be within 0..1`, { x });
    }
    if (typeof y !== "number" || !Number.isFinite(y) || y < 0 || y > 1) {
      throw new ValidationError(`Point ${i}.y must be within 0..1`, { y });
    }
    return { x, y };
  });
  return { type: "polygon", points };
}
