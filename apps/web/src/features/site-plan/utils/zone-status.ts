import type { PlanActivity, ZoneState } from "../types/site-plan.types.js";

const PRIORITY: Record<Exclude<ZoneState, "idle">, number> = {
  blocked: 4,
  attention: 3,
  active: 2,
  completed: 1,
};

// Highest-attention activity wins. Contractors never own the zone color.
export function aggregateZoneState(activities: PlanActivity[]): ZoneState {
  let top: ZoneState = "idle";
  let topScore = 0;
  for (const a of activities) {
    const score = PRIORITY[a.status as keyof typeof PRIORITY] ?? 0;
    if (score > topScore) {
      topScore = score;
      top = a.status as ZoneState;
    }
  }
  return top;
}

export interface ZoneSummary {
  activityCount: number;
  contractorCount: number;
  workers: number;
}

export function summarizeZone(activities: PlanActivity[]): ZoneSummary {
  return {
    activityCount: activities.length,
    contractorCount: new Set(activities.map((a) => a.contractor.id)).size,
    workers: activities.reduce((sum, a) => sum + a.manpower, 0),
  };
}
