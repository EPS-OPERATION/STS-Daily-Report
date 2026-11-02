import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { dateRangeQuery, projectIdParams } from "@/shared/http/params.js";
import { adjustRoadUsageService, createPermitService, dailyRequestsService, permitNoticesService, updatePermitService } from "./daily-request.service.js";
import { permitCreateBody, permitParams, permitUpdateBody, roadAdjustBody, roadUsageParams } from "./daily-request.schema.js";

export const dailyRequestRoutes = new Elysia()
  .get(
    "/projects/:projectId/daily-requests",
    async ({ params, query }) => ok(await dailyRequestsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  .use(requireAuth)
  // Today feed: permits with location photos (everyone in the project; contractors get today only).
  .get(
    "/projects/:projectId/permit-notices",
    async ({ params, query, auth }) => ok(await permitNoticesService(auth, params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  .patch(
    "/projects/:projectId/daily-reports/road-usage/:id",
    async ({ params, body, auth }) => ok(await adjustRoadUsageService(auth, params.projectId, params.id, body)),
    { params: roadUsageParams, body: roadAdjustBody },
  )
  // EPS adds a permit / high-risk task the contractor left out, or fixes one.
  .post(
    "/projects/:projectId/daily-reports/permits",
    async ({ params, body, auth, set }) => {
      set.status = 201;
      return ok(await createPermitService(auth, params.projectId, body));
    },
    { params: projectIdParams, body: permitCreateBody },
  )
  .patch(
    "/projects/:projectId/daily-reports/permits/:id",
    async ({ params, body, auth }) => ok(await updatePermitService(auth, params.projectId, params.id, body)),
    { params: permitParams, body: permitUpdateBody },
  );
