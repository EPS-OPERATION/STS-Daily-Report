import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  createRequestService,
  deleteRequestService,
  listRequestsService,
  transitionRequestService,
  updateRequestService,
} from "./inspection-request.service.js";
import {
  createRequestBody,
  listRequestsQuery,
  projectIdParams,
  requestIdParams,
  transitionBody,
  updateRequestBody,
} from "./inspection-request.schema.js";

// Daily Requests (QAQC inspection requests). All routes need a session:
// visibility depends on role (EPS = all contractors, contractor = own only).
export const inspectionRequestRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/inspection-requests",
    async ({ params, query, auth }) => ok(await listRequestsService(auth, params.projectId, query)),
    { params: projectIdParams, query: listRequestsQuery },
  )
  .post(
    "/projects/:projectId/inspection-requests",
    async ({ params, body, auth, set }) => {
      const created = await createRequestService(auth, params.projectId, body);
      set.status = 201;
      return ok(created);
    },
    { params: projectIdParams, body: createRequestBody },
  )
  .put(
    "/inspection-requests/:requestId",
    async ({ params, body, auth }) => ok(await updateRequestService(auth, params.requestId, body)),
    { params: requestIdParams, body: updateRequestBody },
  )
  .delete(
    "/inspection-requests/:requestId",
    async ({ params, auth, set }) => {
      await deleteRequestService(auth, params.requestId);
      set.status = 204;
      return null;
    },
    { params: requestIdParams },
  )
  .post(
    "/inspection-requests/:requestId/transition",
    async ({ params, body, auth }) => ok(await transitionRequestService(auth, params.requestId, body)),
    { params: requestIdParams, body: transitionBody },
  );
