import { sql } from "drizzle-orm";

// Readiness: can the API reach Postgres right now? (GET /health/ready; /health stays a cheap liveness check.)
// `run` is injectable so the timeout and failure paths are testable without a database.
async function ping() {
  const { getDb } = await import("./client.js");
  return getDb().execute(sql`select 1`);
}

export async function dbIsReady(run: () => Promise<unknown> = ping, timeoutMs = 3000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("database readiness timeout")), timeoutMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
