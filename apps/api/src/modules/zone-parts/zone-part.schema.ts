import { t } from "elysia";

const uuid = t.String({ format: "uuid" });

export const projectZonePartsParams = t.Object({ projectId: uuid });
export const saveZonePartsParams = t.Object({ projectId: uuid, zoneId: uuid });

export const saveZonePartsBody = t.Object({
  parts: t.Array(
    t.Object({
      id: t.Optional(uuid),
      code: t.String({ minLength: 1, maxLength: 40 }),
      name: t.String({ minLength: 1, maxLength: 200 }),
      displayColor: t.String(),
      mapX: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()]),
      mapY: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()]),
      sortOrder: t.Integer({ minimum: 0 }),
      isActive: t.Boolean(),
    }),
    { maxItems: 100 },
  ),
});
