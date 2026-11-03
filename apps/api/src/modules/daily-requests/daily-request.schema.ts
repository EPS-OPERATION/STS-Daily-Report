import { t } from "elysia";
import { hhmm, isoDate } from "@/shared/http/params.js";

// Built-in codes plus the permit types EPS adds per project.
const permitTypeCode = t.String({ minLength: 1, maxLength: 50 });

// EPS settles a road booking's time (the service checks the role).
export const roadUsageParams = t.Object({ projectId: t.String({ format: "uuid" }), id: t.String({ format: "uuid" }) });

export const roadAdjustBody = t.Object({ startTime: hhmm, endTime: hhmm }, { additionalProperties: false });

// EPS adds / updates a work permit (the service checks the role).
export const permitParams = t.Object({ projectId: t.String({ format: "uuid" }), id: t.String({ format: "uuid" }) });
export const permitCreateBody = t.Object(
  {
    contractorId: t.String({ format: "uuid" }),
    targetDate: isoDate,
    buildingId: t.String({ format: "uuid" }),
    permitType: permitTypeCode,
    otherLabel: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
    workers: t.Integer({ minimum: 1, maximum: 500 }),
    highRisk: t.Boolean(),
    taskName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
    supervisorName: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
  },
  { additionalProperties: false },
);
export const permitUpdateBody = t.Object(
  {
    targetDate: t.Optional(isoDate),
    buildingId: t.Optional(t.String({ format: "uuid" })),
    permitType: t.Optional(permitTypeCode),
    otherLabel: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
    workers: t.Optional(t.Integer({ minimum: 1, maximum: 500 })),
    highRisk: t.Optional(t.Boolean()),
    taskName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
    supervisorName: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
  },
  { additionalProperties: false },
);
