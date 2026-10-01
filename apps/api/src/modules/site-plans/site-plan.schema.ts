import { t } from "elysia";

const uuid = t.String({ format: "uuid" });

export const sitePlanProjectParams = t.Object({ projectId: uuid });
export const sitePlanIdParams = t.Object({ sitePlanId: uuid });
export const sitePlanQuery = t.Object({ sitePlanId: t.Optional(uuid) });

export const saveAreasBody = t.Object({
  areas: t.Array(
    t.Object({
      areaId: t.Optional(uuid),
      zoneId: uuid,
      geometry: t.Unknown(),
    }),
    { maxItems: 200 },
  ),
  deleteAreaIds: t.Array(uuid, { maxItems: 200 }),
  zoneColors: t.Optional(
    t.Array(
      t.Object({
        zoneId: uuid,
        displayColor: t.String({ pattern: "^#[0-9A-Fa-f]{6}$" }),
      }),
      { maxItems: 200 },
    ),
  ),
});

export const savePointsBody = t.Object({
  locations: t.Array(
    t.Object({
      facilityKey: t.String({ minLength: 1, maxLength: 100 }),
      view: t.Union([t.Literal("overview"), t.Literal("top")]),
      x: t.Union([t.Number(), t.Null()]),
      y: t.Union([t.Number(), t.Null()]),
    }),
    { maxItems: 500 },
  ),
  zoneColors: t.Optional(
    t.Array(
      t.Object({
        zoneId: uuid,
        displayColor: t.String({ pattern: "^#[0-9A-Fa-f]{6}$" }),
      }),
      { maxItems: 500 },
    ),
  ),
});
