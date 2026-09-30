import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { listZonesService } from "./zone.service.js";
import { listZonesQuery, projectIdParams } from "./zone.schema.js";

export const zoneRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/zones",
    async ({ params, query }) => ok(await listZonesService(params.projectId, query.status)),
    { params: projectIdParams, query: listZonesQuery },
  );
