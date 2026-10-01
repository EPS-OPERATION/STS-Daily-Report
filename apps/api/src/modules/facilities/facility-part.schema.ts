import { t } from "elysia";

export const facilityPartIdParams = t.Object({ facilityPartId: t.String({ format: "uuid" }) });
export const createFacilityPartBody = t.Object({
  code: t.String({ minLength: 1, maxLength: 50 }),
  name: t.String({ minLength: 1, maxLength: 200 }),
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
  isActive: t.Optional(t.Boolean()),
});
export const updateFacilityPartBody = t.Partial(createFacilityPartBody);
