import { Elysia } from "elysia";
import { getEnv } from "@/config/env.js";
import { requireAuth } from "@/middleware/require-auth.js";
import { AuthRequiredError, NotFoundError } from "@/shared/errors/app-error.js";
import { ok } from "@/shared/http/response.js";
import { atQuery, compareQuery, hourlyQuery, projectParams } from "./weather.schema.js";
import { compareWeatherService, hourlyWeatherService, syncAllProjectsService, weatherAtService, weatherNowService } from "./weather.service.js";

// External hourly scheduler (e.g. Supabase pg_cron): Bearer CRON_SECRET. Off when CRON_SECRET is unset.
export const weatherCronRoutes = new Elysia().post("/internal/weather/sync", async ({ headers }) => {
  const secret = getEnv().CRON_SECRET;
  if (!secret) throw new NotFoundError("Not found");
  if (headers.authorization !== `Bearer ${secret}`) throw new AuthRequiredError("Invalid cron secret");
  return ok(await syncAllProjectsService());
});

// Signed-in only: a read may trigger a fetch from the weather provider.
export const weatherRoutes = new Elysia()
  .use(requireAuth)
  .get("/projects/:projectId/weather/hourly", async ({ params, query }) => ok(await hourlyWeatherService(params.projectId, query.from, query.to)), {
    params: projectParams,
    query: hourlyQuery,
  })
  // Contractor-reported weather vs recorded hours, per sent morning report.
  .get(
    "/projects/:projectId/weather/compare",
    async ({ params, query }) =>
      ok(await compareWeatherService(params.projectId, query.from, query.to, query.contractors ? query.contractors.split(",").filter(Boolean) : undefined)),
    { params: projectParams, query: compareQuery },
  )
  // Weather right now at the site (model "current", 15-min) — the morning form of today's report.
  .get("/projects/:projectId/weather/now", async ({ params }) => ok(await weatherNowService(params.projectId)), { params: projectParams })
  .get("/projects/:projectId/weather/at", async ({ params, query }) => ok(await weatherAtService(params.projectId, query.date, query.time)), {
    params: projectParams,
    query: atQuery,
  });
