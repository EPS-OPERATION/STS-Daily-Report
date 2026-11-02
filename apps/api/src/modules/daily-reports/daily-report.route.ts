import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { projectIdParams } from "@/shared/http/params.js";
import {
  deletePhotoService,
  ensureDraftService,
  getCurrentReportService,
  listReviewQueueService,
  printReportService,
  reviewReportService,
  uploadPhotoService,
} from "./daily-report.service.js";
import { submitEveningService, submitMorningService } from "./daily-report.submit.js";
import {
  currentReportQuery,
  eveningBody,
  morningBody,
  photoParams,
  photoUploadBody,
  reportIdParams,
  reportKeyBody,
  reviewBody,
  reviewQueueQuery,
} from "./daily-report.schema.js";

export const dailyReportRoutes = new Elysia()
  .use(requireAuth)
  .get(
    "/projects/:projectId/daily-reports/review-queue",
    async ({ params, query, auth }) => ok(await listReviewQueueService(auth, params.projectId, query)),
    { params: projectIdParams, query: reviewQueueQuery },
  )
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
    "/projects/:projectId/daily-reports/evening",
    async ({ params, body, auth }) => ok(await submitEveningService(auth, params.projectId, body)),
    { params: projectIdParams, body: eveningBody },
  )
  .post(
    "/projects/:projectId/daily-reports/draft",
    async ({ params, body, auth }) => ok(await ensureDraftService(auth, params.projectId, body.date, body.contractorId)),
    { params: projectIdParams, body: reportKeyBody },
  )
  .get(
    "/daily-reports/:reportId/print",
    async ({ params, auth }) => ok(await printReportService(auth, params.reportId)),
    { params: reportIdParams },
  )
  .post(
    "/daily-reports/:reportId/review",
    async ({ params, body, auth }) => ok(await reviewReportService(auth, params.reportId, body)),
    { params: reportIdParams, body: reviewBody },
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
