import { Elysia } from "elysia";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok } from "@/shared/http/response.js";
import { ValidationError } from "@/shared/errors/app-error.js";
import {
  deletePhotoService,
  ensureDraftService,
  getCurrentReportService,
  manpowerSummaryService,
  materialsService,
  siteDayService,
  dailyRequestsService,
  manpowerTrendService,
  positionMixService,
  listReviewQueueService,
  reviewReportService,
  submitEveningService,
  submitMorningService,
  uploadPhotoService,
  weeklySummaryService,
} from "./daily-report.service.js";
import {
  currentReportQuery,
  eveningBody,
  materialsQuery,
  morningBody,
  photoParams,
  photoUploadBody,
  projectIdParams,
  reportIdParams,
  reportKeyBody,
  reviewBody,
  reviewQueueQuery,
  weeklySummaryQuery,
  manpowerTrendQuery,
  dateRangeQuery,
  siteDayQuery,
} from "./daily-report.schema.js";

export const dailyReportRoutes = new Elysia()
  // Aggregated, contractor-level data only (no signatures/photos) — open read like other summaries.
  .get(
    "/projects/:projectId/weekly-summary",
    async ({ params, query }) => ok(await weeklySummaryService(params.projectId, query.weekStart)),
    { params: projectIdParams, query: weeklySummaryQuery },
  )
  // Chart data for the weekly meeting page (aggregates only, open like the weekly summary).
  .get(
    "/projects/:projectId/position-mix",
    async ({ params, query }) => ok(await positionMixService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  .get(
    "/projects/:projectId/daily-requests",
    async ({ params, query }) => ok(await dailyRequestsService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  // EPS materials dashboard (aggregated rows only, open like the weekly summary).
  .get(
    "/projects/:projectId/daily-reports/materials",
    async ({ params, query }) => ok(await materialsService(params.projectId, query)),
    { params: projectIdParams, query: materialsQuery },
  )
  .get(
    "/projects/:projectId/site-day",
    async ({ params, query }) => {
      const from = query.from ?? query.date ?? query.to;
      const to = query.to ?? query.date ?? query.from;
      if (!from || !to) throw new ValidationError("Give date, or from and to");
      return ok(await siteDayService(params.projectId, from <= to ? from : to, from <= to ? to : from));
    },
    { params: projectIdParams, query: siteDayQuery },
  )
  .get(
    "/projects/:projectId/manpower-summary",
    async ({ params, query }) => ok(await manpowerSummaryService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  .get(
    "/projects/:projectId/manpower-trend",
    async ({ params, query }) => ok(await manpowerTrendService(params.projectId, query.until, query.weeks ?? 12)),
    { params: projectIdParams, query: manpowerTrendQuery },
  )
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
