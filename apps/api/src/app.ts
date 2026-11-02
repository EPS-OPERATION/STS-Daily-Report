import { cors } from "@elysiajs/cors";
import { coordinationRoutes } from "@/modules/site-coordination/index.js";
import { Elysia } from "elysia";
import { API_PREFIX, HEALTH_PATH } from "@/config/constants.js";
import { getEnv } from "@/config/env.js";
import { dbIsReady } from "@/db/health.js";
import { isPublicApi } from "@/config/public-api.js";
import { authRoutes } from "@/auth/index.js";
import { buildingRoutes } from "@/modules/buildings/index.js";
import { contractorRoutes } from "@/modules/contractors/index.js";
import { dailyReportRoutes } from "@/modules/daily-reports/index.js";
import { dailyRequestRoutes } from "@/modules/daily-requests/index.js";
import { reportSummaryRoutes } from "@/modules/report-summaries/index.js";
import { droneRoutes } from "@/modules/drone/index.js";
import { epsManpowerRoutes } from "@/modules/eps-manpower/index.js";
import { inspectionRequestRoutes } from "@/modules/inspection-requests/index.js";
import { safetyRoutes } from "@/modules/safety/index.js";
import { projectRoutes } from "@/modules/projects/index.js";
import { siteActivityRoutes } from "@/modules/site-activities/index.js";
import { sitePlanRoutes } from "@/modules/site-plans/index.js";
import { zoneRoutes } from "@/modules/zones/index.js";
import { userRoutes } from "@/modules/users/index.js";
import { reportStandardItemRoutes } from "@/modules/report-standard-items/index.js";
import { permitTypeRoutes } from "@/modules/permit-types/index.js";
import { weatherCronRoutes, weatherRoutes } from "@/modules/weather/index.js";
import { errorPlugin } from "@/plugins/errors.js";
import { securityHeaders } from "@/plugins/security-headers.js";
import { authenticateRequest } from "@/auth/request-auth.js";
import { AuthRequiredError } from "@/shared/errors/app-error.js";


export function buildApp() {
  // Credentialed browser auth: allow only configured frontend origins, never "*".
  const origins = getEnv()
    .WEB_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const app = new Elysia()
    .use(cors({ origin: origins, credentials: true }))
    .use(errorPlugin)
    .use(securityHeaders)
    // Hosted (production): every API call needs a session except the login itself.
    // Locally some summary reads stay open, as before.
    .onBeforeHandle(async ({ request, cookie }) => {
      const env = getEnv();
      if (env.NODE_ENV !== "production" || request.method === "OPTIONS") return;
      const path = new URL(request.url).pathname;
      if (!path.startsWith(API_PREFIX) || isPublicApi(request.method, path)) return;
      const jar = (cookie as Record<string, { value?: unknown } | undefined>)[env.SESSION_COOKIE_NAME];
      const token = typeof jar?.value === "string" ? jar.value : undefined;
      if (!(await authenticateRequest(request, token))) throw new AuthRequiredError();
    })
    .get(HEALTH_PATH, () => ({ status: "ok" }))
    // Readiness for uptime monitors: 503 when Postgres is unreachable (liveness above never touches it).
    .get(`${HEALTH_PATH}/ready`, async ({ set }) => {
      const ready = await dbIsReady();
      set.status = ready ? 200 : 503;
      return { status: ready ? "ok" : "unavailable", db: ready ? "ok" : "down" };
    })
    .group(API_PREFIX, (group) =>
      group.use(weatherCronRoutes).use(authRoutes).use(userRoutes).use(contractorRoutes).use(projectRoutes).use(zoneRoutes).use(siteActivityRoutes).use(sitePlanRoutes).use(buildingRoutes).use(dailyReportRoutes).use(reportSummaryRoutes).use(dailyRequestRoutes).use(inspectionRequestRoutes).use(safetyRoutes).use(coordinationRoutes).use(droneRoutes).use(reportStandardItemRoutes).use(permitTypeRoutes).use(weatherRoutes).use(epsManpowerRoutes),
    )
    .get("/", () => ({ status: "ok", service: "sts-api" }));
  return app;
}

export type App = ReturnType<typeof buildApp>;
