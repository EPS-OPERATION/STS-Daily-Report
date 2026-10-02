import { describe, expect, it } from "bun:test";
import {
  createActivityBody,
  updateActivityBody,
} from "../apps/api/src/modules/site-activities/site-activity.schema.js";
import { siteActivityFormSchema } from "../apps/web/src/features/site-maps/schemas/site-activity.schema.js";
import type { PlanActivity } from "../apps/web/src/features/site-maps/types/site-plan.types.js";
import * as zoneStatus from "../apps/web/src/features/site-maps/helpers/zone-status.js";
import * as activityService from "../apps/api/src/modules/site-activities/site-activity.service.js";

const validActivity = {
  workDate: "2026-10-01",
  zoneId: "00000000-0000-4000-8000-000000000001",
  contractorId: "00000000-0000-4000-8000-000000000002",
  title: "Install boiler steel",
  status: "active" as const,
  manpower: 12,
  progressPercent: 20,
};

describe("Work Part activity form values", () => {
  it("preserves the selected part ID in the validated form value", () => {
    const zonePartId = "00000000-0000-4000-8000-000000000003";

    const result = siteActivityFormSchema.parse({ ...validActivity, zonePartId });

    expect(result.zonePartId).toBe(zonePartId);
  });

  it("preserves null for legacy zone-level activity", () => {
    const result = siteActivityFormSchema.parse({ ...validActivity, zonePartId: null });

    expect(result.zonePartId).toBeNull();
  });
});

describe("Work Part activity API values", () => {
  const apiActivity = {
    zoneId: validActivity.zoneId,
    contractorId: validActivity.contractorId,
    workDate: validActivity.workDate,
    title: validActivity.title,
  };

  it("accepts a part ID while preserving nullable zone-level activity", () => {
    expect(createActivityBody.properties.zonePartId).toBeDefined();
    expect(updateActivityBody.properties.zonePartId).toBeDefined();
  });

  it("accepts optional Part marker coordinates rather than polygon geometry", async () => {
    const { saveZonePartsBody } = await import("../apps/api/src/modules/zone-parts/zone-part.schema.js");
    expect(saveZonePartsBody.properties.parts.items.properties.mapX).toBeDefined();
    expect(saveZonePartsBody.properties.parts.items.properties.mapY).toBeDefined();
    expect(saveZonePartsBody.properties.parts.items.properties.geometry).toBeUndefined();
  });

  it("keeps legacy location compatibility while accepting Facility ownership", () => {
    expect(createActivityBody.properties.zoneId).toBeDefined();
    expect(createActivityBody.properties.facilityId).toBeDefined();
    expect(createActivityBody.properties.facilityPartId).toBeDefined();
    expect(createActivityBody.required?.includes("zoneId")).toBe(false);
    expect(createActivityBody.required?.includes("contractorId")).toBe(true);
    expect(createActivityBody.properties.contractorId).toBeDefined();
    expect(apiActivity.zoneId).toBe(validActivity.zoneId);
    expect(apiActivity.contractorId).toBe(validActivity.contractorId);
  });
});

describe("Work Part activity selection", () => {
  const partActivities: PlanActivity[] = [
    {
      id: "part-activity",
      projectId: "project",
      workDate: "2026-10-01",
      title: "Part work",
      description: null,
      status: "active",
      manpower: 4,
      progressPercent: 20,
      startTime: null,
      endTime: null,
      zone: { id: "zone", code: "2.1", name: "Furnace & Boiler" },
      zonePart: { id: "part-a", code: "A", name: "Part A", displayColor: "#457B9D", isActive: true },
      contractor: { id: "contractor", code: "C-1", name: "Contractor" },
    },
    {
      id: "zone-activity",
      projectId: "project",
      workDate: "2026-10-01",
      title: "Zone-wide work",
      description: null,
      status: "attention",
      manpower: 2,
      progressPercent: 10,
      startTime: null,
      endTime: null,
      zone: { id: "zone", code: "2.1", name: "Furnace & Boiler" },
      zonePart: null,
      contractor: { id: "contractor", code: "C-1", name: "Contractor" },
    },
  ];

  it("filters one part without copying its row into zone-wide activities", () => {
    const getActivitiesForPart = Reflect.get(zoneStatus, "getActivitiesForPart") as
      ((activities: PlanActivity[], zonePartId: string | null) => PlanActivity[]) | undefined;

    expect(getActivitiesForPart?.(partActivities, "part-a").map((activity) => activity.id)).toEqual(["part-activity"]);
    expect(getActivitiesForPart?.(partActivities, null).map((activity) => activity.id)).toEqual(["zone-activity"]);
  });

  it("keeps Zone totals as one pass over the activity rows, including Part work", () => {
    expect(zoneStatus.summarizeZone(partActivities)).toEqual({ activityCount: 2, contractorCount: 1, workers: 6 });
    expect(zoneStatus.aggregateZoneState(partActivities)).toBe("attention");
  });
});

describe("Work Part assignment validation", () => {
  it("requires an existing active Part attached to the selected Zone", () => {
    const getZonePartAssignmentError = Reflect.get(activityService, "getZonePartAssignmentError") as
      | ((
          part: { zoneId: string; isActive: boolean } | null,
          selectedZoneId: string,
          projectId: string,
          zoneProjectId: string,
        ) => "missing" | "inactive" | "wrong-zone" | "wrong-project" | null)
      | undefined;

    expect(getZonePartAssignmentError?.(null, "zone", "project", "project")).toBe("missing");
    expect(getZonePartAssignmentError?.({ zoneId: "zone", isActive: true }, "zone", "project", "other-project")).toBe(
      "wrong-project",
    );
    expect(getZonePartAssignmentError?.({ zoneId: "zone", isActive: false }, "zone", "project", "project")).toBe(
      "inactive",
    );
    expect(getZonePartAssignmentError?.({ zoneId: "other-zone", isActive: true }, "zone", "project", "project")).toBe(
      "wrong-zone",
    );
    expect(getZonePartAssignmentError?.({ zoneId: "zone", isActive: true }, "zone", "project", "project")).toBeNull();
  });
});
