import { lt } from "drizzle-orm";
import { getEnv } from "@/config/env.js";
import { getDb } from "@/db/client.js";
import { securityEvents, type SecurityEventType } from "@/db/schema/index.js";
import { clientIp } from "./client-ip.js";

export const SECURITY_EVENT_RETENTION_DAYS = 90;
const PURGE_EVERY_MS = 3_600_000;

type Server = { requestIP(request: Request): { address: string } | null } | null | undefined;

export interface SecurityEventInput {
  event: SecurityEventType;
  userId?: string | null;
  actorId?: string | null;
  detail?: Record<string, string | number | boolean | null>;
  request: Request;
  server: Server;
}

let lastPurge = 0;

/** Delete events past retention. Called opportunistically (at most hourly per process) so it works on hosts
 *  that sleep the process and need no cron. */
export async function purgeSecurityEvents(now = new Date()) {
  const cutoff = new Date(now.getTime() - SECURITY_EVENT_RETENTION_DAYS * 86_400_000);
  await getDb().delete(securityEvents).where(lt(securityEvents.createdAt, cutoff));
}

/** Best effort: a failure to log must never break login or an admin action. */
export async function recordSecurityEvent(input: SecurityEventInput) {
  try {
    const ip = clientIp(input.request.headers, input.server?.requestIP(input.request)?.address, getEnv().TRUST_PROXY);
    await getDb().insert(securityEvents).values({
      event: input.event,
      userId: input.userId ?? null,
      actorId: input.actorId ?? null,
      ip: ip === "unknown" ? null : ip,
      userAgent: input.request.headers.get("user-agent")?.slice(0, 300) ?? null,
      detail: input.detail ?? null,
    });
    if (Date.now() - lastPurge > PURGE_EVERY_MS) {
      lastPurge = Date.now();
      await purgeSecurityEvents();
    }
  } catch (err) {
    console.warn("[security-event] not recorded", input.event, err instanceof Error ? err.message : err);
  }
}
