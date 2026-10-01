import { t } from "elysia";

const uuid = t.String({ format: "uuid" });
export const facilityProjectParams = t.Object({ projectId: uuid });
export const facilityIdParams = t.Object({ facilityId: uuid });
export const listFacilitiesQuery = t.Object({
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("all")])),
  search: t.Optional(t.String({ maxLength: 200 })),
});
export const createFacilityBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  code: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
  isActive: t.Optional(t.Boolean()),
});
export const updateFacilityBody = t.Partial(createFacilityBody);
