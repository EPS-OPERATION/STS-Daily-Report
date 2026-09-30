import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { listProjectSitePlansService, getProjectSitePlanService, saveMapAreasService } from "./site-plan.service.js";
import { saveAreasBody, sitePlanIdParams, sitePlanProjectParams, sitePlanQuery } from "./site-plan.schema.js";

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
  .put(
    "/site-plans/:sitePlanId/areas",
    async ({ params, body }) => ok(await saveMapAreasService(params.sitePlanId, body.areas, body.deleteAreaIds)),
    { params: sitePlanIdParams, body: saveAreasBody },
  );
