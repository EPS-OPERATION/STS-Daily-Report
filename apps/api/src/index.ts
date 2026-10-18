import { getEnv } from "@/config/env.js";
import { closeDb } from "@/db/client.js";
import { flushSentry, initSentry } from "@/observability/sentry.js";
import { buildApp } from "./app.js";
import { startWeatherCron } from "@/modules/weather/index.js";

const env = getEnv();
initSentry(env);
const app = buildApp();

app.listen(env.API_PORT, () => {
  console.log(`api listening on http://localhost:${env.API_PORT}`);
});

// Hourly site-weather pull (WEATHER_CRON, default on).
if (env.WEATHER_CRON && env.NODE_ENV !== "test") startWeatherCron();

// Container hosts send SIGTERM on scale-down/redeploy (Vercel allows 30s): stop accepting requests, close the DB pool.
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} received, shutting down`);
    void app.stop().finally(() => closeDb().finally(() => flushSentry().finally(() => process.exit(0))));
  });
}

export default app;
export type { App } from "./app.js";
