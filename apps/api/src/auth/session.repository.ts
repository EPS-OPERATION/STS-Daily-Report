import { and, eq, isNull, lt } from "drizzle-orm";
import { sessions, users } from "@/db/schema/index.js";
import type { QueryDb as Db } from "@/db/client.js";

export interface NewSession {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function insertSession(db: Db, input: NewSession) {
  const rows = await db.insert(sessions).values(input).returning();
  return rows[0]!;
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

export async function touchSession(db: Db, id: string) {
  await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, id));
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
