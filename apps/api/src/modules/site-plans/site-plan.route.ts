import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { requireSiteConfiguration } from "@/middleware/require-site-configuration.js";
import { ok } from "@/shared/http/response.js";
import {
  listProjectSitePlansService,
  getProjectSitePlanService,
  saveMapAreasService,
  saveMapPointsService,
} from "./site-plan.service.js";
import {
  saveAreasBody,
  savePointsBody,
  sitePlanIdParams,
  sitePlanProjectParams,
  sitePlanQuery,
} from "./site-plan.schema.js";

export const sitePlanRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/site-plans",
    async ({ params }) => ok(await listProjectSitePlansService(params.projectId)),
    { params: sitePlanProjectParams },
  )
  .get(
    "/projects/:projectId/site-plan",
    async ({ params, query }) => ok(await getProjectSitePlanService(params.projectId, query.sitePlanId)),
    { params: sitePlanProjectParams, query: sitePlanQuery },
  )
  // Deprecated compatibility path; the application configures points only.
  .put(
    "/site-plans/:sitePlanId/areas",
    async ({ params, body }) =>
      ok(await saveMapAreasService(params.sitePlanId, body.areas, body.deleteAreaIds, body.zoneColors ?? [])),
    { params: sitePlanIdParams, body: saveAreasBody, beforeHandle: requireSiteConfiguration },
  )
  .put(
    "/site-plans/:sitePlanId/points",
    async ({ params, body }) =>
      ok(await saveMapPointsService(params.sitePlanId, body.locations, body.zoneColors ?? [])),
    { params: sitePlanIdParams, body: savePointsBody, beforeHandle: requireSiteConfiguration },
  );
