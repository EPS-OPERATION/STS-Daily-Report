import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { requireSiteConfiguration } from "@/middleware/require-site-configuration.js";
import { ok } from "@/shared/http/response.js";
import {
  archiveFacilityService,
  createFacilityService,
  getFacilityService,
  listFacilitiesService,
  listFacilityPlacementsService,
  updateFacilityService,
} from "./facility.service.js";
import {
  createFacilityBody,
  facilityIdParams,
  facilityProjectParams,
  listFacilitiesQuery,
  updateFacilityBody,
} from "./facility.schema.js";
import {
  archiveFacilityPartService,
  createFacilityPartService,
  getFacilityPartService,
  listFacilityPartsService,
  updateFacilityPartService,
} from "./facility-part.service.js";
import { createFacilityPartBody, facilityPartIdParams, updateFacilityPartBody } from "./facility-part.schema.js";

export const facilityRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/facilities/:facilityId/map-placements",
    async ({ params }) => {
      return ok(await listFacilityPlacementsService(params.facilityId));
    },
    { params: facilityIdParams },
  )
  .get(
    "/projects/:projectId/facilities",
    async ({ params, query }) => ok(await listFacilitiesService(params.projectId, query.status, query.search)),
    { params: facilityProjectParams, query: listFacilitiesQuery },
  )
  .post(
    "/projects/:projectId/facilities",
    async ({ params, body, set }) => {
      set.status = 201;
      return ok(await createFacilityService(params.projectId, body));
    },
    { params: facilityProjectParams, body: createFacilityBody, beforeHandle: requireSiteConfiguration },
  )
  .get("/facilities/:facilityId", async ({ params }) => ok(await getFacilityService(params.facilityId)), {
    params: facilityIdParams,
  })
  .patch(
    "/facilities/:facilityId",
    async ({ params, body }) => ok(await updateFacilityService(params.facilityId, body)),
    { params: facilityIdParams, body: updateFacilityBody, beforeHandle: requireSiteConfiguration },
  )
  .delete(
    "/facilities/:facilityId",
    async ({ params, set }) => {
      await archiveFacilityService(params.facilityId);
      set.status = 204;
      return null;
    },
    { params: facilityIdParams, beforeHandle: requireSiteConfiguration },
  )
  .get(
    "/facilities/:facilityId/parts",
    async ({ params, query }) => ok(await listFacilityPartsService(params.facilityId, query.status)),
    { params: facilityIdParams, query: listFacilitiesQuery },
  )
  .post(
    "/facilities/:facilityId/parts",
    async ({ params, body, set }) => {
      set.status = 201;
      return ok(await createFacilityPartService(params.facilityId, body));
    },
    { params: facilityIdParams, body: createFacilityPartBody, beforeHandle: requireSiteConfiguration },
  )
  .get(
    "/facility-parts/:facilityPartId",
    async ({ params }) => ok(await getFacilityPartService(params.facilityPartId)),
    { params: facilityPartIdParams },
  )
  .patch(
    "/facility-parts/:facilityPartId",
    async ({ params, body }) => ok(await updateFacilityPartService(params.facilityPartId, body)),
    { params: facilityPartIdParams, body: updateFacilityPartBody, beforeHandle: requireSiteConfiguration },
  )
  .delete(
    "/facility-parts/:facilityPartId",
    async ({ params, set }) => {
      await archiveFacilityPartService(params.facilityPartId);
      set.status = 204;
      return null;
    },
    { params: facilityPartIdParams, beforeHandle: requireSiteConfiguration },
  );
