import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { requireSiteConfiguration } from "@/middleware/require-site-configuration.js";
import { ok } from "@/shared/http/response.js";
import {
  createMapViewService,
  createSiteMapService,
  getMapViewService,
  getSiteMapService,
  listFacilityMarkersService,
  listMapViewsService,
  listSiteMapsService,
  saveFacilityMarkersService,
  updateMapViewService,
  updateSiteMapService,
} from "./site-map.service.js";
import { uploadMapViewImageService } from "./site-map-image.service.js";
import {
  createMapViewBody,
  createSiteMapBody,
  mapProjectParams,
  mapViewIdParams,
  markerListQuery,
  saveFacilityMarkersBody,
  siteMapIdParams,
  siteMapListQuery,
  updateMapViewBody,
  updateSiteMapBody,
  uploadMapViewImageBody,
  viewFacilityMarkerParams,
} from "./site-map.schema.js";

export const siteMapRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/site-maps",
    async ({ params, query }) => ok(await listSiteMapsService(params.projectId, query.status)),
    { params: mapProjectParams, query: siteMapListQuery },
  )
  .post(
    "/projects/:projectId/site-maps",
    async ({ params, body, set }) => {
      set.status = 201;
      return ok(await createSiteMapService(params.projectId, body));
    },
    { params: mapProjectParams, body: createSiteMapBody, beforeHandle: requireSiteConfiguration },
  )
  .get("/site-maps/:siteMapId", async ({ params }) => ok(await getSiteMapService(params.siteMapId)), {
    params: siteMapIdParams,
  })
  .patch("/site-maps/:siteMapId", async ({ params, body }) => ok(await updateSiteMapService(params.siteMapId, body)), {
    params: siteMapIdParams,
    body: updateSiteMapBody,
    beforeHandle: requireSiteConfiguration,
  })
  .delete(
    "/site-maps/:siteMapId",
    async ({ params, set }) => {
      await updateSiteMapService(params.siteMapId, { isActive: false });
      set.status = 204;
      return null;
    },
    { params: siteMapIdParams, beforeHandle: requireSiteConfiguration },
  )
  .get(
    "/site-maps/:siteMapId/views",
    async ({ params, query }) => ok(await listMapViewsService(params.siteMapId, query.status)),
    { params: siteMapIdParams, query: siteMapListQuery },
  )
  .post(
    "/site-maps/:siteMapId/views",
    async ({ params, body, set }) => {
      set.status = 201;
      return ok(await createMapViewService(params.siteMapId, body));
    },
    { params: siteMapIdParams, body: createMapViewBody, beforeHandle: requireSiteConfiguration },
  )
  .get("/site-map-views/:siteMapViewId", async ({ params }) => ok(await getMapViewService(params.siteMapViewId)), {
    params: mapViewIdParams,
  })
  .patch(
    "/site-map-views/:siteMapViewId",
    async ({ params, body }) => ok(await updateMapViewService(params.siteMapViewId, body)),
    { params: mapViewIdParams, body: updateMapViewBody, beforeHandle: requireSiteConfiguration },
  )
  .delete(
    "/site-map-views/:siteMapViewId",
    async ({ params, set }) => {
      await updateMapViewService(params.siteMapViewId, { isActive: false });
      set.status = 204;
      return null;
    },
    { params: mapViewIdParams, beforeHandle: requireSiteConfiguration },
  )
  .post(
    "/site-map-views/:siteMapViewId/image",
    async ({ params, body }) =>
      ok(await uploadMapViewImageService(params.siteMapViewId, body.file, body.width, body.height)),
    { params: mapViewIdParams, body: uploadMapViewImageBody, beforeHandle: requireSiteConfiguration },
  )
  .get(
    "/site-map-views/:siteMapViewId/markers",
    async ({ params, query }) =>
      ok(await listFacilityMarkersService(params.siteMapViewId, query.includeInactive === "true")),
    { params: mapViewIdParams, query: markerListQuery },
  )
  .put(
    "/site-map-views/:siteMapViewId/markers",
    async ({ params, body }) => ok(await saveFacilityMarkersService(params.siteMapViewId, body.markers)),
    { params: mapViewIdParams, body: saveFacilityMarkersBody, beforeHandle: requireSiteConfiguration },
  )
  .delete(
    "/site-map-views/:siteMapViewId/markers/:facilityId",
    async ({ params, set }) => {
      await saveFacilityMarkersService(params.siteMapViewId, [{ facilityId: params.facilityId, x: null, y: null }]);
      set.status = 204;
      return null;
    },
    { params: viewFacilityMarkerParams, beforeHandle: requireSiteConfiguration },
  );
