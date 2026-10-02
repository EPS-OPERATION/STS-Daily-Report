import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  createDailySiteMarkerService,
  listDailySiteMarkersService,
  updateDailySiteMarkerService,
  withdrawDailySiteMarkerService,
} from "./daily-site-marker.service.js";
import {
  createDailySiteMarkerBody,
  dailySiteMarkerIdParams,
  dailySiteMarkerListQuery,
  projectDailySiteMarkersParams,
  updateDailySiteMarkerBody,
} from "./daily-site-marker.schema.js";

export const dailySiteMarkerRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/daily-site-markers",
    async ({ params, query, auth }) => ok(await listDailySiteMarkersService(params.projectId, query, auth.user.id)),
    { params: projectDailySiteMarkersParams, query: dailySiteMarkerListQuery },
  )
  .post(
    "/projects/:projectId/daily-site-markers",
    async ({ params, body, auth, set }) => {
      set.status = 201;
      return ok(await createDailySiteMarkerService(params.projectId, auth.user.id, body));
    },
    { params: projectDailySiteMarkersParams, body: createDailySiteMarkerBody },
  )
  .patch(
    "/daily-site-markers/:dailySiteMarkerId",
    async ({ params, body, auth }) =>
      ok(await updateDailySiteMarkerService(params.dailySiteMarkerId, auth.user.id, body)),
    { params: dailySiteMarkerIdParams, body: updateDailySiteMarkerBody },
  )
  .post(
    "/daily-site-markers/:dailySiteMarkerId/withdraw",
    async ({ params, auth }) => ok(await withdrawDailySiteMarkerService(params.dailySiteMarkerId, auth.user.id)),
    { params: dailySiteMarkerIdParams },
  );
