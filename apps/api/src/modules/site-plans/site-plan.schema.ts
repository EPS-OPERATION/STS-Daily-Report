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
