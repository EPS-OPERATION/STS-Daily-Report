import { t } from "elysia";
import { FINDING_TYPE_CODES } from "@sts/shared";
import { DATE_RE, TIME_RE } from "@/modules/site-activities/site-activity.schema.js";

const isoDate = t.String({ pattern: DATE_RE });

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });
export const findingParams = t.Object({ projectId: t.String({ format: "uuid" }), findingId: t.String({ format: "uuid" }) });
export const photoParams = t.Object({
  projectId: t.String({ format: "uuid" }),
  findingId: t.String({ format: "uuid" }),
  kind: t.Union([t.Literal("finding"), t.Literal("close")]),
});
export const rangeQuery = t.Object({ from: isoDate, to: isoDate });

export const findingBody = t.Object({
  observation: t.String({ minLength: 1, maxLength: 1000 }),
  buildingId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
  locationDetail: t.Optional(t.String({ maxLength: 200 })),
  actionToBeTaken: t.String({ minLength: 1, maxLength: 1000 }),
  contractorId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
  inspectionDate: isoDate,
  expectedCompleteDate: t.Optional(t.Union([isoDate, t.Null()])),
  status: t.Union([t.Literal("open"), t.Literal("done")]),
  findingType: t.Union(FINDING_TYPE_CODES.map((c) => t.Literal(c))),
});

export const photoBody = t.Object({ file: t.File({ type: "image", maxSize: "10m" }) });

// Rain & Delay Log (EPS).
export const rainLogParams = t.Object({ projectId: t.String({ format: "uuid" }), logId: t.String({ format: "uuid" }) });
export const rainLogBody = t.Object(
  {
    date: isoDate,
    startTime: t.String({ pattern: TIME_RE }),
    endTime: t.String({ pattern: TIME_RE }),
    stoppageHours: t.Optional(t.Number({ minimum: 0, maximum: 24 })),
    intensity: t.Optional(t.Union([t.Literal("light"), t.Literal("moderate"), t.Literal("heavy"), t.Literal("storm"), t.Null()])),
    rainfallMm: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 1000 }), t.Null()])),
    impactSummary: t.Optional(t.String({ maxLength: 1000 })),
    delayClaimNote: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
  },
  { additionalProperties: false },
);
