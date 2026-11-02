import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { deleteDroneLogService, listDroneLogsService, uploadDroneLogService } from "./drone.service.js";
import { droneIdParams, listQuery, projectIdParams, uploadBody } from "./drone.schema.js";

export const droneRoutes = new Elysia({ prefix: "/drone" })
  // Survey log reads are open (aggregated, like the other summaries).
  .get(
    "/projects/:projectId/logs",
    async ({ params, query }) => ok(await listDroneLogsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: listQuery },
  )
  .use(requireAuth)
  .post(
    "/projects/:projectId/logs",
    async ({ params, body, auth, set }) => {
      const created = await uploadDroneLogService(auth, params.projectId, body);
      set.status = 201;
      return ok(created);
    },
    { params: projectIdParams, body: uploadBody },
  )
  .delete(
    "/logs/:id",
    async ({ params, auth, set }) => {
      await deleteDroneLogService(auth, params.id);
      set.status = 204;
      return null;
    },
    { params: droneIdParams },
  );
