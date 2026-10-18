import { t } from "elysia";

import { DATE_RE, TIME_RE } from "@/shared/http/params.js";

export { DATE_RE, TIME_RE };

const uuid = t.String({ format: "uuid" });
const statusEnum = t.Union([
  t.Literal("active"),
  t.Literal("attention"),
  t.Literal("blocked"),
  t.Literal("completed"),
]);

export const projectActivitiesParams = t.Object({ projectId: uuid });

export const listActivitiesQuery = t.Object({
  date: t.Optional(t.String({ pattern: DATE_RE })),
  zoneId: t.Optional(uuid),
  contractorId: t.Optional(uuid),
  status: t.Optional(statusEnum),
});

export const createActivityBody = t.Object({
  zoneId: uuid,
  contractorId: uuid,
  workDate: t.String({ pattern: DATE_RE }),
  title: t.String({ minLength: 1, maxLength: 300 }),
  description: t.Optional(t.String({ maxLength: 2000 })),
  status: t.Optional(statusEnum),
  manpower: t.Optional(t.Integer({ minimum: 0, maximum: 100000 })),
  progressPercent: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  startTime: t.Optional(t.String({ pattern: TIME_RE })),
  endTime: t.Optional(t.String({ pattern: TIME_RE })),
});

export const activityIdParams = t.Object({ activityId: uuid });

export const updateActivityBody = t.Object({
  zoneId: t.Optional(uuid),
  contractorId: t.Optional(uuid),
  workDate: t.Optional(t.String({ pattern: DATE_RE })),
  title: t.Optional(t.String({ minLength: 1, maxLength: 300 })),
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  status: t.Optional(statusEnum),
  manpower: t.Optional(t.Integer({ minimum: 0, maximum: 100000 })),
  progressPercent: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
  startTime: t.Optional(t.Union([t.String({ pattern: TIME_RE }), t.Null()])),
  endTime: t.Optional(t.Union([t.String({ pattern: TIME_RE }), t.Null()])),
});
