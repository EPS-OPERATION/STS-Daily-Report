import { Elysia } from "elysia";
import { ok } from "@/shared/http/response.js";
import { ValidationError } from "@/shared/errors/app-error.js";
import { dateRangeQuery, projectIdParams } from "@/shared/http/params.js";
import {
  manpowerSummaryService,
  manpowerTrendService,
  materialsService,
  positionMixService,
  siteDayService,
  weeklySummaryService,
} from "./report-summary.service.js";
import { manpowerTrendQuery, materialsQuery, siteDayQuery, weeklySummaryQuery } from "./report-summary.schema.js";

// Aggregated, contractor-level data only (no signatures/photos) — open reads, like the other summaries.
export const reportSummaryRoutes = new Elysia()
  .get(
    "/projects/:projectId/weekly-summary",
    async ({ params, query }) => ok(await weeklySummaryService(params.projectId, query.weekStart)),
    { params: projectIdParams, query: weeklySummaryQuery },
  )
  // Chart data for the weekly meeting page.
  .get(
    "/projects/:projectId/position-mix",
    async ({ params, query }) => ok(await positionMixService(params.projectId, query.from, query.to)),
    { params: projectIdParams, query: dateRangeQuery },
  )
  // EPS materials dashboard.
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
  );
