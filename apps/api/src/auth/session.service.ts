import { createHash, randomBytes } from "node:crypto";
import { getDb, type QueryDb } from "@/db/client.js";
import { getEnv } from "@/config/env.js";
import {
  findSessionWithUser,
  insertSession,
  revokeSessionByTokenHash,
  touchSession,
} from "./session.repository.js";

export function generateSessionToken(): string {
  // 256 bits of secure randomness, base64url-encoded for cookies.
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
}

export async function createSession(userId: string, db: QueryDb = getDb()): Promise<CreatedSession> {
  const { SESSION_TTL_HOURS } = getEnv();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000);
  await insertSession(db, { userId, tokenHash: hashSessionToken(token), expiresAt });
  return { token, expiresAt };
}

export interface ValidSession {
  sessionId: string;
  userId: string;
  user: NonNullable<Awaited<ReturnType<typeof findSessionWithUser>>>["user"];
}

// last_seen_at is a coarse "recently used" marker: refresh it at most once a minute, not on every request.
const TOUCH_AFTER_MS = 60_000;

export async function validateSessionToken(rawToken: string): Promise<ValidSession | null> {
  if (!rawToken) return null;
  const row = await findSessionWithUser(getDb(), hashSessionToken(rawToken));
  if (!row) return null;
  const { session, user } = row;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_AFTER_MS) await touchSession(getDb(), session.id, session.userId);
  return { sessionId: session.id, userId: session.userId, user };
}

export async function revokeSessionToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await revokeSessionByTokenHash(getDb(), hashSessionToken(rawToken));
}
