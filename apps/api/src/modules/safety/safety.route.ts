import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  createFindingService,
  deleteFindingService,
  listFindingsService,
  renumberWeekService,
  safetyStatsService,
  updateFindingService,
  uploadFindingPhotoService,
} from "./safety.service.js";
import { findingBody, findingParams, photoBody, photoParams, projectIdParams, rainLogBody, rainLogParams, rangeQuery, renumberWeekBody } from "./safety.schema.js";
import { createRainLogService, deleteRainLogService, listRainLogsService, updateRainLogService } from "./rain-log.service.js";
import { safetyStatBody, safetyStatEntryParams, safetyBaselineBody, safetyBaselineQuery } from "./safety-stat.schema.js";
import { requestMeta } from "@/shared/integrity.js";
import {
  deleteSafetyStatEntryService,
  listSafetyStatEntriesService,
  listSafetyStatVersionsService,
  saveSafetyStatEntryService, saveSafetyBaselineService, getSafetyBaselineService, listSafetyBaselineVersionsService } from "./safety-stat.service.js";

// Safety line walk (EPS-only writes, checked in the service) + statistics.
export const safetyRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/safety/findings",
    async ({ params, query }) => ok(await listFindingsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: rangeQuery },
  )
  .get(
    "/projects/:projectId/safety/rain-logs",
    async ({ params, query }) => ok(await listRainLogsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: rangeQuery },
  )
  .post(
    "/projects/:projectId/safety/rain-logs",
    async ({ params, body, auth, set }) => {
      const res = await createRainLogService(auth, params.projectId, body);
      set.status = 201;
      return ok(res);
    },
    { params: projectIdParams, body: rainLogBody },
  )
  .put(
    "/projects/:projectId/safety/rain-logs/:logId",
    async ({ params, body, auth }) => ok(await updateRainLogService(auth, params.projectId, params.logId, body)),
    { params: rainLogParams, body: rainLogBody },
  )
  .delete(
    "/projects/:projectId/safety/rain-logs/:logId",
    async ({ params, auth, set }) => {
      await deleteRainLogService(auth, params.projectId, params.logId);
      set.status = 204;
      return null;
    },
    { params: rainLogParams },
  )
  .get(
    "/projects/:projectId/safety/stats",
    async ({ params, query }) => ok(await safetyStatsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: rangeQuery },
  )
  // Safety history before the app (EPS): project start, last LTI, and the project's total man-hours to a date.
  .get(
    "/projects/:projectId/safety/baseline",
    async ({ params, query, auth }) => ok(await getSafetyBaselineService(auth, params.projectId, query.asOf)),
    { params: projectIdParams, query: safetyBaselineQuery },
  )
  .put(
    "/projects/:projectId/safety/baseline",
    async ({ params, body, auth, request, server }) => ok(await saveSafetyBaselineService(auth, params.projectId, body, requestMeta(request, server))),
    { params: projectIdParams, body: safetyBaselineBody },
  )
  .get(
    "/projects/:projectId/safety/baseline/versions",
    async ({ params, auth }) => ok(await listSafetyBaselineVersionsService(auth, params.projectId)),
    { params: projectIdParams },
  )
  // EPS manual daily values for dates with no contractor report (man-hours, inspections, accidents).
  .get(
    "/projects/:projectId/safety/stat-entries",
    async ({ params, query, auth }) => ok(await listSafetyStatEntriesService(auth, params.projectId, query.from, query.to)),
    { params: projectIdParams, query: rangeQuery },
  )
  .put(
    "/projects/:projectId/safety/stat-entries",
    async ({ params, body, auth, request, server }) =>
      ok(await saveSafetyStatEntryService(auth, params.projectId, body, requestMeta(request, server))),
    { params: projectIdParams, body: safetyStatBody },
  )
  // Append-only edit history of one stat entry (newest last; the UI shows newest first).
  .get(
    "/projects/:projectId/safety/stat-entries/:entryId/versions",
    async ({ params, auth }) => ok(await listSafetyStatVersionsService(auth, params.projectId, params.entryId)),
    { params: safetyStatEntryParams },
  )
  .delete(
    "/projects/:projectId/safety/stat-entries/:entryId",
    async ({ params, auth, set }) => {
      await deleteSafetyStatEntryService(auth, params.projectId, params.entryId);
      set.status = 204;
      return null;
    },
    { params: safetyStatEntryParams },
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
  .post(
    "/projects/:projectId/safety/findings/renumber-week",
    async ({ params, body, auth }) => ok(await renumberWeekService(auth, params.projectId, body.date)),
    { params: projectIdParams, body: renumberWeekBody },
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
