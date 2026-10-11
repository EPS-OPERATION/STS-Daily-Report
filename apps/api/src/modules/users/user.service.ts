import { isEpsAdmin } from "@sts/shared";
import type { AuthContext } from "@/auth/auth.types.js";
import { findUserById } from "@/auth/auth.repository.js";
import { generateSessionToken, hashSessionToken } from "@/auth/session.service.js";
import { insertResetToken, invalidateResetTokens } from "@/auth/password-reset.repository.js";
import { getEnv } from "@/config/env.js";
import { getDb } from "@/db/client.js";
import { assertEpsAdmin, assertEpsStaff } from "@/middleware/require-eps.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { activateMembership, countActiveMemberships, decideUser, listUsers, setUserRole, setUserStatus } from "./user.repository.js";
import type { ListUsersQuery } from "./user.type.js";

// eps_site sees ONLY the pending approval queue; eps_admin sees every list.
export async function listUsersService(auth: AuthContext, query: ListUsersQuery) {
  assertEpsStaff(auth);
  if (!isEpsAdmin(auth.user.role) && query.status !== "pending") {
    throw new ForbiddenError("Only an EPS administrator can browse user accounts");
  }
  return listUsers(getDb(), query);
}
export async function decideUserService(auth: AuthContext, id: string, decision: "active" | "rejected", input: { contractorId?: string; reason?: string }) {
  assertEpsStaff(auth);
  const reason = input.reason?.trim();
  if (decision === "rejected" && !reason) throw new ValidationError("A rejection reason is required.");
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    const isPending = user.status === "pending" && user.role === "contractor";
    // Approved contractors without a membership and a pending link request follow the same queue.
    const isLinkRequest = !isPending && user.status === "active" && user.role === "contractor"
      && Boolean(user.requestedContractorId) && (await countActiveMemberships(tx, id)) === 0;
    if (!isPending && !isLinkRequest) throw new ConflictError("Only pending registrations or contractor link requests can be decided.");
    if (isLinkRequest && decision === "rejected") throw new ConflictError("Link requests cannot be rejected; approve the chosen contractor instead.");
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
// Reset links stay with eps_admin: eps_site never browses active accounts.
export async function issueResetLinkService(auth: AuthContext, id: string) {
  assertEpsAdmin(auth);
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
// eps_admin: change another account's role. Self-change is blocked to avoid lockout.
export async function changeUserRoleService(auth: AuthContext, id: string, role: "contractor" | "eps_site" | "eps_admin") {
  assertEpsAdmin(auth);
  if (id === auth.user.id) throw new ValidationError("You cannot change your own role.");
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    if (user.status !== "active" && user.status !== "disabled") throw new ConflictError("Only active or disabled accounts can change role.");
    await setUserRole(tx, id, role);
    return { id, role };
  });
}
// eps_admin: disable/reactivate another account; disabling revokes its sessions.
export async function changeUserStatusService(auth: AuthContext, id: string, status: "active" | "disabled") {
  assertEpsAdmin(auth);
  if (id === auth.user.id) throw new ValidationError("You cannot change your own account status.");
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    if (status === "disabled" && user.status !== "active") throw new ConflictError("Only an active account can be disabled.");
    if (status === "active" && user.status !== "disabled") throw new ConflictError("Only a disabled account can be reactivated.");
    await setUserStatus(tx, id, status);
    return { id, status };
  });
}
