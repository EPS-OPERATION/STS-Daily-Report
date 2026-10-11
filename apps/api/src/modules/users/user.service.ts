import type { AuthContext } from "@/auth/auth.types.js";
import { findUserById } from "@/auth/auth.repository.js";
import { generateSessionToken, hashSessionToken } from "@/auth/session.service.js";
import { insertResetToken, invalidateResetTokens } from "@/auth/password-reset.repository.js";
import { getEnv } from "@/config/env.js";
import { getDb } from "@/db/client.js";
import { assertEps } from "@/middleware/require-eps.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { activateMembership, decideUser, listUsers } from "./user.repository.js";
import type { ListUsersQuery } from "./user.type.js";

export async function listUsersService(auth: AuthContext, query: ListUsersQuery) {
  assertEps(auth);
  return listUsers(getDb(), query);
}
export async function decideUserService(auth: AuthContext, id: string, decision: "active" | "rejected", input: { contractorId?: string; reason?: string }) {
  assertEps(auth);
  const reason = input.reason?.trim();
  if (decision === "rejected" && !reason) throw new ValidationError("A rejection reason is required.");
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    if (user.status !== "pending" || user.role !== "contractor") throw new ConflictError("Only pending contractor registrations can be decided.");
    const contractorId = input.contractorId ?? user.requestedContractorId;
    if (decision === "active" && contractorId) {
      // A referenced contractor must exist before approval can grant its membership.
      const contractor = await getContractorById(tx, contractorId);
      if (!contractor) throw new ValidationError("Unknown contractor");
      await activateMembership(tx, id, contractorId);
    }
    await decideUser(tx, id, decision, auth.user.id, reason);
    return { id, status: decision };
  });
}
export async function issueResetLinkService(auth: AuthContext, id: string) {
  assertEps(auth);
  const env = getEnv();
  const base = new URL(env.WEB_URL ?? env.WEB_ORIGIN.split(",")[0]!.trim());
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    if (user.status !== "active") throw new ConflictError("Only active users can reset their password.");
    await invalidateResetTokens(tx, id);
    await insertResetToken(tx, id, hashSessionToken(token), expiresAt);
  });
  const url = new URL("/reset-password", base);
  url.searchParams.set("token", token);
  return { url: url.toString(), expiresAt };
}
