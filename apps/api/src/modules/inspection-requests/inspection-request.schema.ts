import { t } from "elysia";
import { INSPECTION_RESULTS, INSPECTION_TYPE_CODES, READINESS_CODES, REQUEST_STATUSES } from "@sts/shared";
import { DATE_RE, TIME_RE } from "@/modules/site-activities/site-activity.schema.js";

const isoDate = t.String({ pattern: DATE_RE });
const hhmm = t.String({ pattern: TIME_RE });

export const projectIdParams = t.Object({ projectId: t.String({ format: "uuid" }) });
export const requestIdParams = t.Object({ requestId: t.String({ format: "uuid" }) });

export const listRequestsQuery = t.Object({
  from: isoDate,
  to: isoDate,
  contractorId: t.Optional(t.String({ format: "uuid" })),
  // Filter by the day the request was raised (field page) instead of inspection date.
  by: t.Optional(t.Union([t.Literal("inspection"), t.Literal("report")])),
});

const editable = {
  buildingId: t.String({ format: "uuid" }),
  inspectionDate: isoDate,
  inspectionTime: hhmm,
  inspectionType: t.Union(INSPECTION_TYPE_CODES.map((c) => t.Literal(c))),
  workItem: t.String({ minLength: 1, maxLength: 200 }),
  location: t.Optional(t.String({ maxLength: 120 })),
  drawingRef: t.Optional(t.String({ maxLength: 120 })),
  readiness: t.Union(READINESS_CODES.map((c) => t.Literal(c))),
};

export const createRequestBody = t.Object({
  contractorId: t.String({ format: "uuid" }),
  reportDate: isoDate,
  ...editable,
});

export const updateRequestBody = t.Object(editable);

export const transitionBody = t.Object({
  to: t.Union(REQUEST_STATUSES.map((s) => t.Literal(s))),
  result: t.Optional(t.Union(INSPECTION_RESULTS.map((r) => t.Literal(r)))),
  note: t.Optional(t.String({ maxLength: 1000 })),
});
