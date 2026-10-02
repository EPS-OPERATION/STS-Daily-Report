import { t } from "elysia";

const uuid = t.String({ format: "uuid" });
const date = t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" });
const iconKey = t.String({ minLength: 1, maxLength: 32 });

export const projectDailySiteMarkersParams = t.Object({ projectId: uuid });
export const dailySiteMarkerIdParams = t.Object({ dailySiteMarkerId: uuid });
export const dailySiteMarkerListQuery = t.Object({
  siteMapViewId: uuid,
  workDate: date,
  contractorId: t.Optional(uuid),
  facilityId: t.Optional(uuid),
  iconKey: t.Optional(iconKey),
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("withdrawn"), t.Literal("all")])),
});

export const createDailySiteMarkerBody = t.Object({
  siteMapViewId: uuid,
  workDate: date,
  contractorId: uuid,
  iconKey,
  comment: t.String({ minLength: 1, maxLength: 2000 }),
  x: t.Number({ minimum: 0, maximum: 1 }),
  y: t.Number({ minimum: 0, maximum: 1 }),
  facilityId: t.Optional(t.Union([uuid, t.Null()])),
});

export const updateDailySiteMarkerBody = t.Object({
  iconKey: t.Optional(iconKey),
  comment: t.Optional(t.String({ minLength: 1, maxLength: 2000 })),
  x: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  y: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  facilityId: t.Optional(t.Union([uuid, t.Null()])),
});
