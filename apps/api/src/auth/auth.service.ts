import { getDb } from "@/db/client.js";
import { getEnv } from "@/config/env.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";
import { listContractorsService } from "@/modules/contractors/contractor.service.js";
import { ConflictError, ForbiddenError, InvalidLoginError, RateLimitedError, ValidationError } from "@/shared/errors/app-error.js";
import { toUserRole } from "@sts/shared";
import { countAuthAttempt, findUserByEmail, findUserById, findUserByIdentifier, insertRegisteredUser, listActiveContractorsForUser, normalizeEmail, updateRequestedContractor } from "./auth.repository.js";
import { DEMO_ACCOUNTS } from "./demo-accounts.js";
import { hashPassword, verifyPassword } from "./password.js";
import { hashSessionToken } from "./session.service.js";
import { createSession, revokeSessionToken, validateSessionToken } from "./session.service.js";
import type { AuthContext, AuthIdentity, MeResponse } from "./auth.types.js";

async function buildContext(userId: string): Promise<AuthContext> {
  const user = await findUserById(getDb(), userId);
  if (!user || user.status !== "active") throw new InvalidLoginError();
  return {
    user: { id: user.id, email: user.email, displayName: user.displayName, role: toUserRole(user.role) },
    identity: { method: "session" },
  };
}

export async function loginWithEmail(
  email: string,
): Promise<{ context: AuthContext; token: string; expiresAt: Date }> {
  const user = await findUserByEmail(getDb(), email);
  if (!demoLoginEnabled() || !user || user.status !== "active" || !DEMO_ACCOUNTS.some((d) => d.id === user.id && d.email === user.email)) throw new InvalidLoginError();
  const { token, expiresAt } = await createSession(user.id);
  const context: AuthContext = {
    user: { id: user.id, email: user.email, displayName: user.displayName, role: toUserRole(user.role) },
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

export function demoLoginEnabled() {
  const env = getEnv();
  return env.ALLOW_DEMO_LOGIN || (env.NODE_ENV !== "production" && env.AUTH_PROVIDER === "local-email");
}
export async function limitAuthAttempts(kind: string, key: string, limit: number) {
  if (await countAuthAttempt(getDb(), `${kind}:${hashSessionToken(key)}`) > limit) throw new RateLimitedError();
}
export async function loginWithPassword(identifier: string, password: string) {
  const db = getDb();
  const user = await findUserByIdentifier(db, identifier);
  if (!(await verifyPassword(password, user?.passwordHash)) || !user) throw new InvalidLoginError("Invalid email, username or password.");
  return db.transaction(async (tx) => {
    const current = await findUserById(tx, user.id, true);
    if (!current || current.passwordHash !== user.passwordHash) throw new InvalidLoginError("Invalid email, username or password.");
    if (current.status === "pending") throw new ForbiddenError("บัญชีอยู่ระหว่างรอการอนุมัติ");
    if (current.status === "rejected") throw new ForbiddenError(`บัญชีถูกปฏิเสธ: ${current.rejectionReason ?? "กรุณาติดต่อผู้ดูแลระบบ"}`);
    if (current.status === "disabled") throw new ForbiddenError("บัญชีถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
    if (current.status !== "active") throw new InvalidLoginError("Invalid email, username or password.");
    const session = await createSession(current.id, tx);
    const context: AuthContext = {
      user: { id: current.id, email: current.email, displayName: current.displayName, role: toUserRole(current.role) },
      identity: { method: "session" },
    };
    return { context, ...session };
  });
}
export interface RegisterInput { email: string; username: string; password: string; contractorId?: string; companyName?: string }
export async function registerUser(input: RegisterInput) {
  const db = getDb();
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Enter a valid email address.");
  const username = input.username.trim().toLowerCase();
  const companyName = input.companyName?.trim();
  if (!/^[a-z0-9._-]{3,20}$/.test(username)) throw new ValidationError("Username must be 3–20 characters: a–z, 0–9, dot, underscore or hyphen.");
  if (Boolean(input.contractorId) === Boolean(companyName)) throw new ValidationError("Choose exactly one contractor or enter a company name.");
  if (input.contractorId && !(await getContractorById(db, input.contractorId))) throw new ValidationError("Unknown contractor");
  const passwordHash = await hashPassword(input.password);
  try {
    await insertRegisteredUser(db, {
      email, username, passwordHash, displayName: username, role: "contractor", status: "pending",
      requestedContractorId: input.contractorId ?? null, requestedCompanyName: companyName ?? null,
    });
  } catch (error) {
    const outer = error as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } };
    const cause = outer.cause ?? outer;
    if (cause.code === "23505") throw new ConflictError(cause.constraint_name?.includes("username") ? "Username is already registered." : "Email is already registered.");
    throw error;
  }
  return { status: "pending" as const };
}
export async function registrationOptions(query: { page: number; pageSize: number; search?: string }) {
  const result = await listContractorsService({ ...query, sort: "name", order: "asc" });
  return { rows: result.rows.map(({ id, code, name }) => ({ id, code, name })), total: result.total };
}

// Approved-but-unlinked contractors may propose their company; EPS approves the link afterward.
export async function requestContractorLink(auth: AuthContext, contractorId: string) {
  if (auth.user.role !== "contractor") throw new ForbiddenError("Only contractor accounts can request a company link.");
  const db = getDb();
  if ((await listActiveContractorsForUser(db, auth.user.id)).length > 0) {
    throw new ConflictError("Your account is already linked to a contractor.");
  }
  if (!(await getContractorById(db, contractorId))) throw new ValidationError("Unknown contractor");
  await updateRequestedContractor(db, auth.user.id, contractorId);
  return { requestedContractorId: contractorId };
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
