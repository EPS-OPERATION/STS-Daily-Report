import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  createBuildingService,
  createPartService,
  listBuildingsAdminService,
  reorderBuildingsService,
  updateBuildingService,
  deletePartService,
  listBuildingsService,
  placeMarkerService,
  placePartMarkerService,
  removeMarkerService,
  removePartMarkerService,
  siteMapService,
  updatePartService,
} from "./building.service.js";
import {
  buildingCreateBody,
  buildingOrderBody,
  buildingParams,
  buildingUpdateBody,
  markerBody,
  markerParams,
  partBody,
  partMarkerParams,
  partParams,
  projectIdParams,
} from "./building.schema.js";

export const buildingRoutes = new Elysia()
  .get("/projects/:projectId/buildings", async ({ params }) => ok(await listBuildingsService(params.projectId)), {
    params: projectIdParams,
  })
  .get("/projects/:projectId/site-map", async ({ params }) => ok(await siteMapService(params.projectId)), {
    params: projectIdParams,
  })
  // Marker placement is EPS-only (checked in the service).
  .use(requireAuth)
  // Building list management: eps_admin only (checked in the service). Hide = status inactive; no delete.
  .get("/projects/:projectId/buildings/manage", async ({ params, auth }) => ok(await listBuildingsAdminService(auth, params.projectId)), {
    params: projectIdParams,
  })
  .post(
    "/projects/:projectId/buildings",
    async ({ params, body, auth, set }) => {
      const res = await createBuildingService(auth, params.projectId, body);
      set.status = 201;
      return ok(res);
    },
    { params: projectIdParams, body: buildingCreateBody },
  )
  .put(
    "/projects/:projectId/buildings/order",
    async ({ params, body, auth }) => ok(await reorderBuildingsService(auth, params.projectId, body.ids)),
    { params: projectIdParams, body: buildingOrderBody },
  )
  .patch(
    "/projects/:projectId/buildings/:buildingId",
    async ({ params, body, auth }) => ok(await updateBuildingService(auth, params.projectId, params.buildingId, body)),
    { params: buildingParams, body: buildingUpdateBody },
  )
  .put(
    "/projects/:projectId/buildings/:buildingId/markers/:view",
    async ({ params, body, auth }) =>
      ok(await placeMarkerService(auth, params.projectId, params.buildingId, params.view, body.x, body.y)),
    { params: markerParams, body: markerBody },
  )
  .delete(
    "/projects/:projectId/buildings/:buildingId/markers/:view",
    async ({ params, auth }) => ok(await removeMarkerService(auth, params.projectId, params.buildingId, params.view)),
    { params: markerParams },
  )
  // Work parts (EPS-only, checked in the service). Writes return the full site map.
  .post(
    "/projects/:projectId/buildings/:buildingId/parts",
    async ({ params, body, auth, set }) => {
      const res = await createPartService(auth, params.projectId, params.buildingId, body);
      set.status = 201;
      return ok(res);
    },
    { params: buildingParams, body: partBody },
  )
  .put(
    "/projects/:projectId/parts/:partId",
    async ({ params, body, auth }) => ok(await updatePartService(auth, params.projectId, params.partId, body)),
    { params: partParams, body: partBody },
  )
  .delete(
    "/projects/:projectId/parts/:partId",
    async ({ params, auth }) => ok(await deletePartService(auth, params.projectId, params.partId)),
    { params: partParams },
  )
  .put(
    "/projects/:projectId/parts/:partId/markers/:view",
    async ({ params, body, auth }) =>
      ok(await placePartMarkerService(auth, params.projectId, params.partId, params.view, body.x, body.y)),
    { params: partMarkerParams, body: markerBody },
  )
  .delete(
    "/projects/:projectId/parts/:partId/markers/:view",
    async ({ params, auth }) => ok(await removePartMarkerService(auth, params.projectId, params.partId, params.view)),
    { params: partMarkerParams },
  );
