import { eq } from "drizzle-orm";
import { getDb } from "@/db/client.js";
import { users } from "@/db/schema/index.js";
import { InvalidLoginError } from "@/shared/errors/app-error.js";
import { findUserByEmail, listActiveContractorsForUser } from "./auth.repository.js";
import { createSession, revokeSessionToken, validateSessionToken } from "./session.service.js";
import type { AuthContext, AuthIdentity, MeResponse } from "./auth.types.js";

async function buildContext(userId: string): Promise<AuthContext> {
  const found = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  const user = found[0];
  if (!user || user.status !== "active") throw new InvalidLoginError();
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      canManageSiteConfiguration: user.canManageSiteConfiguration,
    },
    identity: { method: "session" },
  };
}

export async function loginWithEmail(email: string): Promise<{ context: AuthContext; token: string; expiresAt: Date }> {
  const user = await findUserByEmail(getDb(), email);
  if (!user || user.status !== "active") throw new InvalidLoginError();
  const { token, expiresAt } = await createSession(user.id);
  const context: AuthContext = {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      canManageSiteConfiguration: user.canManageSiteConfiguration,
    },
    identity: { method: "session" },
  };
  return { context, token, expiresAt };
}

export async function resolveAuthIdentity(rawToken: string | undefined): Promise<AuthIdentity | null> {
  if (!rawToken) return null;
  const valid = await validateSessionToken(rawToken);
  if (!valid) return null;
  try {
    const context = await buildContext(valid.userId);
    return { userId: context.user.id, email: context.user.email, method: "session" };
  } catch {
    return null;
  }
}

export async function loadAuthContext(identity: AuthIdentity): Promise<AuthContext> {
  return buildContext(identity.userId);
}

export async function logoutSession(rawToken: string | undefined): Promise<void> {
  await revokeSessionToken(rawToken ?? "");
}

export async function loadMe(identity: AuthIdentity): Promise<MeResponse> {
  const context = await loadAuthContext(identity);
  const contractors = await listActiveContractorsForUser(getDb(), identity.userId);
  return { data: { user: context.user, contractors } };
}
