// Dead-man's-switch ping (Healthchecks.io style): GET <url> after a success, <url>/fail after a failure.
// Never throws: monitoring must not be able to break the job it watches.
export function heartbeatUrl(base: string, ok: boolean): string {
  const clean = base.replace(/\/+$/, "");
  return ok ? clean : `${clean}/fail`;
}

export async function pingHeartbeat(base: string | undefined, ok = true): Promise<void> {
  if (!base) return;
  try {
    await fetch(heartbeatUrl(base, ok), { signal: AbortSignal.timeout(5000) });
  } catch {
    // The monitor will notice the missing ping.
  }
}
