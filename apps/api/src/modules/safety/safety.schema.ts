import { t } from "elysia";
import { FINDING_TYPE_CODES } from "@sts/shared";
import { DATE_RE } from "@/modules/site-activities/site-activity.schema.js";

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
