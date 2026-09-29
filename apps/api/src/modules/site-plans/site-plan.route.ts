import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  bulkSaveAreasService,
  createAreaService,
  deleteAreaService,
  getProjectSitePlanService,
  putZoneGeometryService,
  resetAreaService,
  updateAreaService,
} from "./site-plan.service.js";
import {
  areaIdParams,
  bulkAreasBody,
  createAreaBody,
  geometryBody,
  geometryParams,
  patchAreaBody,
  sitePlanIdParams,
  sitePlanProjectParams,
} from "./site-plan.schema.js";

export const sitePlanRoutes = new Elysia()
  .get(
    "/projects/:projectId/site-plan",
    async ({ params }) => ok(await getProjectSitePlanService(params.projectId)),
    { params: sitePlanProjectParams },
  )
  .use(requireAuth)
  .post(
    "/site-plans/:sitePlanId/areas",
    async ({ params, body, set }) => {
      const created = await createAreaService(params.sitePlanId, body.zoneId, body.geometry);
      set.status = 201;
      return ok(created);
    },
    { params: sitePlanIdParams, body: createAreaBody },
  )
  .put(
    "/site-plans/:sitePlanId/areas",
    async ({ params, body }) => ok(await bulkSaveAreasService(params.sitePlanId, body.areas)),
    { params: sitePlanIdParams, body: bulkAreasBody },
  )
  .patch(
    "/site-plans/:sitePlanId/areas/:areaId",
    async ({ params, body }) =>
      ok(await updateAreaService(params.areaId, { zoneId: body.zoneId, geometry: body.geometry })),
    { params: areaIdParams, body: patchAreaBody },
  )
  .delete(
    "/site-plans/:sitePlanId/areas/:areaId",
    async ({ params, set }) => {
      await deleteAreaService(params.areaId);
      set.status = 204;
      return null;
    },
    { params: areaIdParams },
  )
  .post(
    "/site-plans/:sitePlanId/areas/:areaId/reset",
    async ({ params }) => ok(await resetAreaService(params.areaId)),
    { params: areaIdParams },
  )
  .put(
    "/site-plans/:sitePlanId/zones/:zoneId/geometry",
    async ({ params, body }) => ok(await putZoneGeometryService(params.sitePlanId, params.zoneId, body.geometry)),
    { params: geometryParams, body: geometryBody },
  );
