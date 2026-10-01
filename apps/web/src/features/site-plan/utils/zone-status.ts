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

export function getActivitiesForPart(activities: PlanActivity[], zonePartId: string | null): PlanActivity[] {
  return activities.filter((activity) => (activity.zonePart?.id ?? null) === zonePartId);
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

export function sortActivitiesByPriority(activities: PlanActivity[]): PlanActivity[] {
  const priority: Record<string, number> = { blocked: 0, attention: 1, active: 2, completed: 3 };
  return [...activities].sort(
    (a, b) =>
      (priority[a.status] ?? 4) - (priority[b.status] ?? 4) ||
      (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"),
  );
}
