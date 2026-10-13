import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { colorBody, contractorParams, createBody, dateQuery, dayNoteBody, itemParams, projectParams, revisionQuery, updateBody } from "./coordination.schema.js";
import { coordinationColorService, coordinationReportService, coordinationService, deleteCoordinationService, saveCoordinationService, saveDayNoteService, setDayLockService } from "./coordination.service.js";

export const coordinationRoutes = new Elysia().use(requireAuth)
  .get("/projects/:projectId/coordination", async ({ auth, params, query }) => ok(await coordinationService(auth, params.projectId, query.date)), { params: projectParams, query: dateQuery })
  .get("/projects/:projectId/coordination/report", async ({ auth, params, query }) => ok(await coordinationReportService(auth, params.projectId, query.date)), { params: projectParams, query: dateQuery })
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
