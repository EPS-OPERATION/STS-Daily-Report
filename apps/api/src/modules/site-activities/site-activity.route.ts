import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { createActivityService, listActivitiesService, updateActivityService } from "./site-activity.service.js";
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
    async ({ params, query }) =>
      ok(
        await listActivitiesService(params.projectId, {
          date: query.date,
          zoneId: query.zoneId,
          contractorId: query.contractorId,
          status: query.status,
        }),
      ),
    { params: projectActivitiesParams, query: listActivitiesQuery },
  )
  .post(
    "/projects/:projectId/activities",
    async ({ params, body, auth, set }) => {
      const created = await createActivityService(params.projectId, body, auth.user.id);
      set.status = 201;
      return ok(created);
    },
    { params: projectActivitiesParams, body: createActivityBody },
  )
  .patch(
    "/activities/:activityId",
    async ({ params, body }) => ok(await updateActivityService(params.activityId, body)),
    { params: activityIdParams, body: updateActivityBody },
  );
