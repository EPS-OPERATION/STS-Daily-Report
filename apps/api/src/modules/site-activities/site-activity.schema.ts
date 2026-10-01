import { t } from "elysia";

export const DATE_RE = "^\\d{4}-\\d{2}-\\d{2}$";
export const TIME_RE = "^([01]\\d|2[0-3]):[0-5]\\d$";

const uuid = t.String({ format: "uuid" });
const statusEnum = t.Union([t.Literal("active"), t.Literal("attention"), t.Literal("blocked"), t.Literal("completed")]);

export const projectActivitiesParams = t.Object({ projectId: uuid });

export const listActivitiesQuery = t.Object({
  date: t.Optional(t.String({ pattern: DATE_RE })),
  workDate: t.Optional(t.String({ pattern: DATE_RE })),
  facilityId: t.Optional(uuid),
  facilityPartId: t.Optional(uuid),
  zoneId: t.Optional(uuid),
  contractorId: t.Optional(uuid),
  status: t.Optional(statusEnum),
  page: t.Optional(t.Numeric({ minimum: 1, multipleOf: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100, multipleOf: 1 })),
});

export const createActivityBody = t.Object({
  facilityId: t.Optional(uuid),
  facilityPartId: t.Optional(t.Union([uuid, t.Null()])),
  zoneId: t.Optional(uuid),
  zonePartId: t.Optional(t.Union([uuid, t.Null()])),
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
  facilityId: t.Optional(uuid),
  facilityPartId: t.Optional(t.Union([uuid, t.Null()])),
  zoneId: t.Optional(uuid),
  zonePartId: t.Optional(t.Union([uuid, t.Null()])),
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
