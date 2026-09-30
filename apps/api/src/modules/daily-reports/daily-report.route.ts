import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import {
  deletePhotoService,
  getCurrentReportService,
  submitEveningService,
  submitMorningService,
  uploadPhotoService,
  weeklySummaryService,
} from "./daily-report.service.js";
import {
  currentReportQuery,
  eveningBody,
  morningBody,
  photoParams,
  photoUploadBody,
  projectIdParams,
  reportIdParams,
  weeklySummaryQuery,
} from "./daily-report.schema.js";

export const dailyReportRoutes = new Elysia()
  // Aggregated, contractor-level data only (no signatures/photos) — open read like other summaries.
  .get(
    "/projects/:projectId/weekly-summary",
    async ({ params, query }) => ok(await weeklySummaryService(params.projectId, query.weekStart)),
    { params: projectIdParams, query: weeklySummaryQuery },
  )
  .use(requireAuth)
  .get(
    "/projects/:projectId/daily-reports/current",
    async ({ params, query, auth }) =>
      ok(await getCurrentReportService(auth, params.projectId, query.date, query.contractorId)),
    { params: projectIdParams, query: currentReportQuery },
  )
  .put(
    "/projects/:projectId/daily-reports/morning",
    async ({ params, body, auth }) => ok(await submitMorningService(auth, params.projectId, body)),
    { params: projectIdParams, body: morningBody },
  )
  .put(
    "/daily-reports/:reportId/evening",
    async ({ params, body, auth }) => ok(await submitEveningService(auth, params.reportId, body)),
    { params: reportIdParams, body: eveningBody },
  )
  .post(
    "/daily-reports/:reportId/photos",
    async ({ params, body, auth, set }) => {
      const created = await uploadPhotoService(auth, params.reportId, body);
      set.status = 201;
      return ok(created);
    },
    { params: reportIdParams, body: photoUploadBody },
  )
  .delete(
    "/daily-reports/:reportId/photos/:photoId",
    async ({ params, auth, set }) => {
      await deletePhotoService(auth, params.reportId, params.photoId);
      set.status = 204;
      return null;
    },
    { params: photoParams },
  );
