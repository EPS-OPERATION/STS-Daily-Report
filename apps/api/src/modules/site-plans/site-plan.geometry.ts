import { ValidationError } from "@/shared/errors/app-error.js";
import type { PolygonGeometry } from "./site-plan.type.js";

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
