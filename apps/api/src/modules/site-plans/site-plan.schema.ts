import { t } from "elysia";

const uuid = t.String({ format: "uuid" });

export const sitePlanProjectParams = t.Object({ projectId: uuid });

export const sitePlanIdParams = t.Object({ sitePlanId: uuid });

export const geometryParams = t.Object({
  sitePlanId: uuid,
  zoneId: uuid,
});

export const geometryBody = t.Object({
  geometry: t.Unknown(),
});

export const areaIdParams = t.Object({
  sitePlanId: uuid,
  areaId: uuid,
});

export const createAreaBody = t.Object({
  zoneId: uuid,
  geometry: t.Unknown(),
});

export const patchAreaBody = t.Object({
  zoneId: t.Optional(uuid),
  geometry: t.Optional(t.Unknown()),
});

export const bulkAreasBody = t.Object({
  areas: t.Array(
    t.Object({
      zoneId: uuid,
      geometry: t.Unknown(),
    }),
    { minItems: 1, maxItems: 200 },
  ),
});
