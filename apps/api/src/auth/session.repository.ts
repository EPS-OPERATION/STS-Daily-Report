import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { sessions, users } from "@/db/schema/index.js";
import type { QueryDb as Db } from "@/db/client.js";

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function insertSession(db: Db, input: NewSession) {
  const rows = await db.insert(sessions).values(input).returning();
  await recordActivity(db, input.userId);
  return rows[0]!;
}

// Usage log (user_activity_days): today's row for the user, +1 active minute when it already exists.
const ACTIVITY_UPSERT = (userId: string) => sql`
  INSERT INTO user_activity_days (user_id, day) VALUES (${userId}, (now() AT TIME ZONE 'Asia/Bangkok')::date)
  ON CONFLICT (user_id, day) DO UPDATE SET last_seen_at = now(), active_minutes = user_activity_days.active_minutes + 1`;

export async function recordActivity(db: Db, userId: string) {
  await db.execute(ACTIVITY_UPSERT(userId));
}

// Session and its user in one round trip: authentication runs on every request, so each extra query is paid per call.
export async function findSessionWithUser(db: Db, tokenHash: string) {
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

// Once a minute per session: refresh last_seen_at and log the day's activity in the same round trip.
export async function touchSession(db: Db, id: string, userId: string) {
  await db.execute(sql`WITH touched AS (UPDATE sessions SET last_seen_at = now() WHERE id = ${id}) ${ACTIVITY_UPSERT(userId)}`);
}

export async function revokeSessionByTokenHash(db: Db, tokenHash: string): Promise<boolean> {
  const rows = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  return rows.length > 0;
}

// Future periodic cleanup (no cron/queue in this phase).
export async function deleteExpiredSessions(db: Db): Promise<number> {
  const rows = await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).returning({ id: sessions.id });
  return rows.length;
}
