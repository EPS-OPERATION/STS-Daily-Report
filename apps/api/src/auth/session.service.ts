import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/db/client.js";
import { getEnv } from "@/config/env.js";
import { findSessionByTokenHash, insertSession, revokeSessionByTokenHash, touchSession } from "./session.repository.js";

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

export async function createSession(userId: string): Promise<CreatedSession> {
  const { SESSION_TTL_HOURS } = getEnv();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3_600_000);
  await insertSession(getDb(), { userId, tokenHash: hashSessionToken(token), expiresAt });
  return { token, expiresAt };
}

export interface ValidSession {
  sessionId: string;
  userId: string;
}

export async function validateSessionToken(rawToken: string): Promise<ValidSession | null> {
  if (!rawToken) return null;
  const row = await findSessionByTokenHash(getDb(), hashSessionToken(rawToken));
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  await touchSession(getDb(), row.id);
  return { sessionId: row.id, userId: row.userId };
}

export async function revokeSessionToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await revokeSessionByTokenHash(getDb(), hashSessionToken(rawToken));
}
