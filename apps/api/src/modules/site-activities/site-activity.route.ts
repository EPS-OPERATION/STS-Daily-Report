import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok, paginated } from "@/shared/http/response.js";
import {
  createActivityService,
  getActivityService,
  listActivitiesService,
  listFacilitySummariesService,
  updateActivityService,
} from "./site-activity.service.js";
import {
  activityIdParams,
  createActivityBody,
  listActivitiesQuery,
  projectActivitiesParams,
  updateActivityBody,
} from "./site-activity.schema.js";

export const siteActivityRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/activities",
    async ({ params, query }) => {
      const result = await listActivitiesService(params.projectId, query);
      return paginated(result.rows, result.page, result.pageSize, result.total);
    },
    { params: projectActivitiesParams, query: listActivitiesQuery },
  )
  .get(
    "/projects/:projectId/activity-summaries",
    async ({ params, query }) => ok(await listFacilitySummariesService(params.projectId, query)),
    { params: projectActivitiesParams, query: listActivitiesQuery },
  )
  .get("/activities/:activityId", async ({ params }) => ok(await getActivityService(params.activityId)), {
    params: activityIdParams,
  })
  .post(
    "/projects/:projectId/activities",
    async ({ params, body, auth, set }) => {
      const actor = { userId: auth.user.id, isAdmin: auth.user.canManageSiteConfiguration };
      const created = await createActivityService(params.projectId, body, actor);
      set.status = 201;
      return ok(created);
    },
    { params: projectActivitiesParams, body: createActivityBody },
  )
  .patch(
    "/activities/:activityId",
    async ({ params, body, auth }) => {
      const actor = { userId: auth.user.id, isAdmin: auth.user.canManageSiteConfiguration };
      return ok(await updateActivityService(params.activityId, body, actor));
    },
    { params: activityIdParams, body: updateActivityBody },
  );
