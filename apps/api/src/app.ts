import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { API_PREFIX, HEALTH_PATH } from "@/config/constants.js";
import { contractorRoutes } from "@/modules/contractors/index.js";
import { errorPlugin } from "@/plugins/errors.js";

export function buildApp() {
  const app = new Elysia()
    .use(cors()) // centralized CORS; tighten origins when auth lands
    .use(errorPlugin)
    .get(HEALTH_PATH, () => ({ status: "ok" }))
    .group(API_PREFIX, (group) => group.use(contractorRoutes))
    .get("/", () => ({ status: "ok", service: "sts-api" }));
  return app;
}

export type App = ReturnType<typeof buildApp>;
