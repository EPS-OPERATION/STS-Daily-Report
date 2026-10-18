import { cors } from "@elysiajs/cors";
import { coordinationRoutes } from "@/modules/site-coordination/index.js";
import { Elysia } from "elysia";
import { API_PREFIX, HEALTH_PATH } from "@/config/constants.js";
import { getEnv } from "@/config/env.js";
import { authRoutes } from "@/auth/index.js";
import { buildingRoutes } from "@/modules/buildings/index.js";
import { contractorRoutes } from "@/modules/contractors/index.js";
import { dailyReportRoutes } from "@/modules/daily-reports/index.js";
import { droneRoutes } from "@/modules/drone/index.js";
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
import { resolveAuthIdentity } from "@/auth/auth.service.js";
import { AuthRequiredError } from "@/shared/errors/app-error.js";

const PUBLIC_API = new Set([
  `POST ${API_PREFIX}/auth/login`, `GET ${API_PREFIX}/auth/config`, `POST ${API_PREFIX}/auth/logout`,
  `POST ${API_PREFIX}/auth/register`, `POST ${API_PREFIX}/auth/reset-password`, `GET ${API_PREFIX}/auth/registration-options`,
]);

export function buildApp() {
  // Credentialed browser auth: allow only configured frontend origins, never "*".
  const origins = getEnv()
    .WEB_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const app = new Elysia()
    .use(cors({ origin: origins, credentials: true }))
    .use(errorPlugin)
    // Hosted (production): every API call needs a session except the login itself.
    // Locally some summary reads stay open, as before.
    .onBeforeHandle(async ({ request, cookie }) => {
      const env = getEnv();
      if (env.NODE_ENV !== "production" || request.method === "OPTIONS") return;
      const path = new URL(request.url).pathname;
      if (!path.startsWith(API_PREFIX) || PUBLIC_API.has(`${request.method} ${path.replace(/\/$/, "")}`)) return;
      const jar = (cookie as Record<string, { value?: unknown } | undefined>)[env.SESSION_COOKIE_NAME];
      const token = typeof jar?.value === "string" ? jar.value : undefined;
      if (!(await resolveAuthIdentity(token))) throw new AuthRequiredError();
    })
    .get(HEALTH_PATH, () => ({ status: "ok" }))
    .group(API_PREFIX, (group) =>
      group.use(weatherCronRoutes).use(authRoutes).use(userRoutes).use(contractorRoutes).use(projectRoutes).use(zoneRoutes).use(siteActivityRoutes).use(sitePlanRoutes).use(buildingRoutes).use(dailyReportRoutes).use(inspectionRequestRoutes).use(safetyRoutes).use(coordinationRoutes).use(droneRoutes).use(reportStandardItemRoutes).use(permitTypeRoutes).use(weatherRoutes),
    )
    .get("/", () => ({ status: "ok", service: "sts-api" }));
  return app;
}

export type App = ReturnType<typeof buildApp>;
