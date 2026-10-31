import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { createMapBody, mapParams, reorderMapsBody, roadParams, roadSegmentBody, sectionBody, sectionParams, updateMapBody } from "./coordination.schema.js";
import { createMapService, deleteMapService, listMapsAdminService, reorderMapsService, updateMapService } from "./coordination-map.service.js";
import { deleteSectionService, saveSectionService } from "./coordination-section.service.js";
import { sectionLocationsService, sectionWorkService } from "./coordination-section-work.service.js";
import { deleteRoadSegmentService, listRoadSegmentsService, saveRoadSegmentService } from "./coordination.service.js";
import { colorBody, contractorParams, createBody, createItemTypeBody, dateQuery, dayNoteBody, itemParams, itemTypeParams, projectParams, reorderItemTypesBody, reportQuery, revisionQuery, updateBody, updateItemTypeBody } from "./coordination.schema.js";
import { coordinationColorService, coordinationReportService, coordinationService, coordinationVersionService, deleteCoordinationService, saveCoordinationService, saveDayNoteService, setDayLockService } from "./coordination.service.js";
import { createItemTypeService, deleteItemTypeService, listItemTypesService, reorderItemTypesService, updateItemTypeService } from "./coordination-item-type.service.js";

export const coordinationRoutes = new Elysia().use(requireAuth)
  .get("/projects/:projectId/coordination/item-types", async ({ auth, params }) => ok(await listItemTypesService(auth, params.projectId)), { params: projectParams })
  .post("/projects/:projectId/coordination/item-types", async ({ auth, params, body, set }) => {
    const row = await createItemTypeService(auth, params.projectId, body);
    set.status = 201; return ok(row);
  }, { params: projectParams, body: createItemTypeBody })
  .put("/projects/:projectId/coordination/item-types/order", async ({ auth, params, body }) => ok(await reorderItemTypesService(auth, params.projectId, body.ids)), { params: projectParams, body: reorderItemTypesBody })
  .patch("/projects/:projectId/coordination/item-types/:id", async ({ auth, params, body }) => ok(await updateItemTypeService(auth, params.projectId, params.id, body)), { params: itemTypeParams, body: updateItemTypeBody })
  .delete("/projects/:projectId/coordination/item-types/:id", async ({ auth, params, set }) => {
    await deleteItemTypeService(auth, params.projectId, params.id); set.status = 204;
  }, { params: itemTypeParams })
  .get("/projects/:projectId/coordination/maps", async ({ auth, params }) => ok(await listMapsAdminService(auth, params.projectId)), { params: projectParams })
  .post("/projects/:projectId/coordination/maps", async ({ auth, params, body, set }) => {
    const row = await createMapService(auth, params.projectId, body);
    set.status = 201; return ok(row);
  }, { params: projectParams, body: createMapBody })
  .put("/projects/:projectId/coordination/maps/order", async ({ auth, params, body, set }) => {
    await reorderMapsService(auth, params.projectId, body.ids); set.status = 204;
  }, { params: projectParams, body: reorderMapsBody })
  .patch("/projects/:projectId/coordination/maps/:id", async ({ auth, params, body }) => ok(await updateMapService(auth, params.projectId, params.id, body)), { params: mapParams, body: updateMapBody })
  .delete("/projects/:projectId/coordination/maps/:id", async ({ auth, params, set }) => {
    await deleteMapService(auth, params.projectId, params.id); set.status = 204;
  }, { params: mapParams })
  // Daily-report rows placed on the route sections of one map (read-only; loaded apart from the map polling).
  .get("/projects/:projectId/coordination/section-work", async ({ auth, params, query }) => ok(await sectionWorkService(auth, params.projectId, query.date, query.mapId)), { params: projectParams, query: reportQuery })
  .get("/projects/:projectId/coordination/sections", async ({ auth, params }) => ok(await sectionLocationsService(auth, params.projectId)), { params: projectParams })
  .post("/projects/:projectId/coordination/sections", async ({ auth, params, body, set }) => {
    const row = await saveSectionService(auth, params.projectId, body);
    set.status = 201; return ok(row);
  }, { params: projectParams, body: sectionBody })
  .patch("/projects/:projectId/coordination/sections/:id", async ({ auth, params, body }) => ok(await saveSectionService(auth, params.projectId, body, params.id)), { params: sectionParams, body: sectionBody })
  .delete("/projects/:projectId/coordination/sections/:id", async ({ auth, params, set }) => {
    await deleteSectionService(auth, params.projectId, params.id); set.status = 204;
  }, { params: sectionParams })
  .get("/projects/:projectId/coordination/roads", async ({ auth, params }) => ok(await listRoadSegmentsService(auth, params.projectId)), { params: projectParams })
  .post("/projects/:projectId/coordination/roads", async ({ auth, params, body, set }) => {
    const row = await saveRoadSegmentService(auth, params.projectId, body);
    set.status = 201; return ok(row);
  }, { params: projectParams, body: roadSegmentBody })
  .patch("/projects/:projectId/coordination/roads/:id", async ({ auth, params, body }) => ok(await saveRoadSegmentService(auth, params.projectId, body, params.id)), { params: roadParams, body: roadSegmentBody })
  .delete("/projects/:projectId/coordination/roads/:id", async ({ auth, params, set }) => {
    await deleteRoadSegmentService(auth, params.projectId, params.id); set.status = 204;
  }, { params: roadParams })
  .get("/projects/:projectId/coordination", async ({ auth, params, query }) => ok(await coordinationService(auth, params.projectId, query.date)), { params: projectParams, query: dateQuery })
  .get("/projects/:projectId/coordination/version", async ({ auth, params, query }) => ok(await coordinationVersionService(auth, params.projectId, query.date)), { params: projectParams, query: dateQuery })
  .get("/projects/:projectId/coordination/report", async ({ auth, params, query }) => ok(await coordinationReportService(auth, params.projectId, query.date, query.mapId)), { params: projectParams, query: reportQuery })
  .post("/projects/:projectId/coordination/items", async ({ auth, params, body, set }) => {
    const item = await saveCoordinationService(auth, params.projectId, body);
    set.status = 201; return ok(item);
  }, { params: projectParams, body: createBody })
  .patch("/projects/:projectId/coordination/items/:id", async ({ auth, params, body }) => {
    const { revision, ...input } = body;
    return ok(await saveCoordinationService(auth, params.projectId, input, params.id, revision));
  }, { params: itemParams, body: updateBody })
  .delete("/projects/:projectId/coordination/items/:id", async ({ auth, params, query, set }) => {
    await deleteCoordinationService(auth, params.projectId, params.id, query.revision); set.status = 204;
  }, { params: itemParams, query: revisionQuery })
  .put("/projects/:projectId/coordination/lock", async ({ auth, params, query }) =>
    ok(await setDayLockService(auth, params.projectId, query.date, true)), { params: projectParams, query: dateQuery })
  .delete("/projects/:projectId/coordination/lock", async ({ auth, params, query }) =>
    ok(await setDayLockService(auth, params.projectId, query.date, false)), { params: projectParams, query: dateQuery })
  .put("/projects/:projectId/coordination/day-note", async ({ auth, params, query, body }) =>
    ok(await saveDayNoteService(auth, params.projectId, query.date, body.note)), { params: projectParams, query: dateQuery, body: dayNoteBody })
  .patch("/projects/:projectId/coordination/contractors/:contractorId", async ({ auth, params, body }) =>
    ok(await coordinationColorService(auth, params.projectId, params.contractorId, body.color, body.revision)), { params: contractorParams, body: colorBody });
