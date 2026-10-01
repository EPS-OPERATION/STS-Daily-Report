import { t } from "elysia";

const uuid = t.String({ format: "uuid" });
export const mapProjectParams = t.Object({ projectId: uuid });
export const siteMapIdParams = t.Object({ siteMapId: uuid });
export const mapViewIdParams = t.Object({ siteMapViewId: uuid });
export const viewFacilityMarkerParams = t.Object({ siteMapViewId: uuid, facilityId: uuid });
export const markerListQuery = t.Object({
  includeInactive: t.Optional(t.Union([t.Literal("true"), t.Literal("false")])),
});
export const siteMapListQuery = t.Object({
  status: t.Optional(t.Union([t.Literal("active"), t.Literal("inactive"), t.Literal("all")])),
});
export const createSiteMapBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  description: t.Optional(t.Union([t.String({ maxLength: 2000 }), t.Null()])),
  isDefault: t.Optional(t.Boolean()),
  isActive: t.Optional(t.Boolean()),
});
export const updateSiteMapBody = t.Partial(createSiteMapBody);
export const createMapViewBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  key: t.Optional(t.String({ minLength: 1, maxLength: 100, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" })),
  sortOrder: t.Optional(t.Integer({ minimum: 0 })),
  isActive: t.Optional(t.Boolean()),
});
export const updateMapViewBody = t.Partial(t.Omit(createMapViewBody, ["key"]));
export const saveFacilityMarkersBody = t.Object({
  markers: t.Array(
    t.Object({
      facilityId: uuid,
      x: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()]),
      y: t.Union([t.Number({ minimum: 0, maximum: 1 }), t.Null()]),
    }),
    { maxItems: 500 },
  ),
});
export const uploadMapViewImageBody = t.Object({
  file: t.File({ type: ["image/png", "image/jpeg", "image/webp"], maxSize: 20 * 1024 * 1024 }),
  width: t.Numeric({ minimum: 1, maximum: 30000 }),
  height: t.Numeric({ minimum: 1, maximum: 30000 }),
});
