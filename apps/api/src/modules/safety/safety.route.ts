import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  createFindingService,
  deleteFindingService,
  listFindingsService,
  safetyStatsService,
  updateFindingService,
  uploadFindingPhotoService,
} from "./safety.service.js";
import { findingBody, findingParams, photoBody, photoParams, projectIdParams, rangeQuery } from "./safety.schema.js";

// Safety line walk (EPS-only writes, checked in the service) + statistics.
export const safetyRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/safety/findings",
    async ({ params, query }) => ok(await listFindingsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: rangeQuery },
  )
  .get(
    "/projects/:projectId/safety/stats",
    async ({ params, query }) => ok(await safetyStatsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: rangeQuery },
  )
  .post(
    "/projects/:projectId/safety/findings",
    async ({ params, body, auth, set }) => {
      const res = await createFindingService(auth, params.projectId, body);
      set.status = 201;
      return ok(res);
    },
    { params: projectIdParams, body: findingBody },
  )
  .put(
    "/projects/:projectId/safety/findings/:findingId",
    async ({ params, body, auth }) => ok(await updateFindingService(auth, params.projectId, params.findingId, body)),
    { params: findingParams, body: findingBody },
  )
  .delete(
    "/projects/:projectId/safety/findings/:findingId",
    async ({ params, auth, set }) => {
      await deleteFindingService(auth, params.projectId, params.findingId);
      set.status = 204;
      return null;
    },
    { params: findingParams },
  )
  .post(
    "/projects/:projectId/safety/findings/:findingId/photos/:kind",
    async ({ params, body, auth }) =>
      ok(await uploadFindingPhotoService(auth, params.projectId, params.findingId, params.kind, body.file)),
    { params: photoParams, body: photoBody },
  );
