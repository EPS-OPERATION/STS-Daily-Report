import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { requireSiteConfiguration } from "@/middleware/require-site-configuration.js";
import { ok } from "@/shared/http/response.js";
import { listProjectZonePartsService, saveZonePartsService } from "./zone-part.service.js";
import { projectZonePartsParams, saveZonePartsBody, saveZonePartsParams } from "./zone-part.schema.js";

export const zonePartRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/zone-parts",
    async ({ params }) => ok(await listProjectZonePartsService(params.projectId)),
    { params: projectZonePartsParams },
  )
  .put(
    "/projects/:projectId/zones/:zoneId/parts",
    async ({ params, body }) => ok(await saveZonePartsService(params.projectId, params.zoneId, body.parts)),
    { params: saveZonePartsParams, body: saveZonePartsBody, beforeHandle: requireSiteConfiguration },
  );
