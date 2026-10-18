import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { dateRangeQuery, projectIdParams } from "@/shared/http/params.js";
import { adjustRoadUsageService, dailyRequestsService } from "./daily-request.service.js";
import { roadAdjustBody, roadUsageParams } from "./daily-request.schema.js";

export const dailyRequestRoutes = new Elysia()
  .get(
    "/projects/:projectId/daily-requests",
    async ({ params, query }) => ok(await dailyRequestsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  .use(requireAuth)
  .patch(
    "/projects/:projectId/daily-reports/road-usage/:id",
    async ({ params, body, auth }) => ok(await adjustRoadUsageService(auth, params.projectId, params.id, body)),
    { params: roadUsageParams, body: roadAdjustBody },
  );
