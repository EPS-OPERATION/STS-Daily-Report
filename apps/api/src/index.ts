import { getEnv } from "@/config/env.js";
import { buildApp } from "./app.js";
import { startWeatherCron } from "@/modules/weather/index.js";

const env = getEnv();
const app = buildApp();

app.listen(env.API_PORT, () => {
  console.log(`api listening on http://localhost:${env.API_PORT}`);
});

// Hourly site-weather pull (WEATHER_CRON, default on).
if (env.WEATHER_CRON && env.NODE_ENV !== "test") startWeatherCron();

export default app;
export type { App } from "./app.js";
