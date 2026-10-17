import { syncAllProjectsService } from "./weather.service.js";

// In-process hourly weather pull: every hour at HH:05 (Asia/Bangkok has no DST, so UTC minute 05 works),
// plus once shortly after start so a fresh deploy fills the gap at once. Runs while the API process lives
// (Docker); hosts that sleep the process should call POST /api/v1/internal/weather/sync hourly instead.
const MINUTE = 5;
const HOUR_MS = 3_600_000;

async function run(reason: string) {
  try {
    const r = await syncAllProjectsService();
    console.log(`[weather-cron] ${reason}: ${r.projects} project(s) synced${r.failed.length ? `, failed: ${r.failed.join(", ")}` : ""}`);
  } catch (err) {
    console.warn("[weather-cron] run failed", err instanceof Error ? err.message : err);
  }
}

export function msUntilNextRun(now = new Date()) {
  const next = new Date(now);
  next.setUTCMinutes(MINUTE, 0, 0);
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + HOUR_MS);
  return next.getTime() - now.getTime();
}

export function startWeatherCron() {
  setTimeout(() => void run("startup"), 10_000);
  const tick = () => {
    void run("hourly");
    setTimeout(tick, msUntilNextRun());
  };
  setTimeout(tick, msUntilNextRun());
  console.log(`[weather-cron] scheduled every hour at :${String(MINUTE).padStart(2, "0")}`);
}
