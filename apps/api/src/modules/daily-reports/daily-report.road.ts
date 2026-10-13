import { normalizeRoadName } from "@sts/shared";

// A road booking as the contractor sent it. The signature ties an EPS time change to that request.
export interface RoadRequest {
  buildingId: string;
  roadLocation: string;
  startTime: string;
  endTime: string;
}

export interface RoadAdjustment {
  adjustedStartTime: string;
  adjustedEndTime: string;
  adjustedBy: string | null;
  adjustedAt: Date;
}

export type AdjustedRoadRequest = RoadRequest & RoadAdjustment;

export function roadSignature(r: RoadRequest): string {
  return [r.buildingId, normalizeRoadName(r.roadLocation), r.startTime, r.endTime].join("|");
}

// A contractor re-sends the whole evening report and its road rows are replaced. An EPS time change
// survives only when the same request comes back unchanged; a changed or removed request starts again
// without it. Identical requests are matched in order, so each keeps its own change.
export function carryRoadAdjustments(previous: AdjustedRoadRequest[], next: RoadRequest[]): (RoadAdjustment | null)[] {
  const queues = new Map<string, RoadAdjustment[]>();
  for (const p of previous) {
    const key = roadSignature(p);
    const adjustment: RoadAdjustment = {
      adjustedStartTime: p.adjustedStartTime,
      adjustedEndTime: p.adjustedEndTime,
      adjustedBy: p.adjustedBy,
      adjustedAt: p.adjustedAt,
    };
    queues.set(key, [...(queues.get(key) ?? []), adjustment]);
  }
  return next.map((r) => queues.get(roadSignature(r))?.shift() ?? null);
}
