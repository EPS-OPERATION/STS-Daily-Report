import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { API_PREFIX, HEALTH_PATH } from "@/config/constants.js";
import { getEnv } from "@/config/env.js";
import { authRoutes } from "@/auth/index.js";
import { contractorRoutes } from "@/modules/contractors/index.js";
import { errorPlugin } from "@/plugins/errors.js";

export function buildApp() {
  // Credentialed browser auth: allow only configured frontend origins, never "*".
  const origins = getEnv()
    .WEB_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const app = new Elysia()
    .use(cors({ origin: origins, credentials: true }))
    .use(errorPlugin)
    .get(HEALTH_PATH, () => ({ status: "ok" }))
    .group(API_PREFIX, (group) => group.use(authRoutes).use(contractorRoutes))
    .get("/", () => ({ status: "ok", service: "sts-api" }));
  return app;
}

export type App = ReturnType<typeof buildApp>;
