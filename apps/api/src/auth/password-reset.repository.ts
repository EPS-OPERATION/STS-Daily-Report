import { and, eq, isNull, sql } from "drizzle-orm";
import type { QueryDb } from "@/db/client.js";
import { passwordResetTokens, sessions, users } from "@/db/schema/index.js";

export async function findResetToken(db: QueryDb, hash: string) {
  const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hash)).limit(1);
  return rows[0] ?? null;
}
export async function invalidateResetTokens(db: QueryDb, userId: string) {
  await db.update(passwordResetTokens).set({ usedAt: sql`now()` })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}
export async function insertResetToken(db: QueryDb, userId: string, tokenHash: string, expiresAt: Date) {
  await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
}
export async function consumeResetToken(db: QueryDb, id: string) {
  const rows = await db.update(passwordResetTokens).set({ usedAt: sql`now()` }).where(and(
    eq(passwordResetTokens.id, id), isNull(passwordResetTokens.usedAt), sql`${passwordResetTokens.expiresAt} > now()`,
  )).returning({ id: passwordResetTokens.id });
  return rows.length === 1;
}
export async function replacePassword(db: QueryDb, userId: string, passwordHash: string) {
  await db.update(users).set({ passwordHash, updatedAt: sql`now()` }).where(eq(users.id, userId));
  await db.update(sessions).set({ revokedAt: sql`now()` })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
