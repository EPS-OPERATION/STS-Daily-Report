import type { AuthContext } from "@/auth/auth.types.js";
import { findUserById } from "@/auth/auth.repository.js";
import { generateSessionToken, hashSessionToken } from "@/auth/session.service.js";
import { insertResetToken, invalidateResetTokens } from "@/auth/password-reset.repository.js";
import { getEnv } from "@/config/env.js";
import type { QueryDb } from "@/db/client.js";
import { getDb } from "@/db/client.js";
import { assertEpsAdmin } from "@/middleware/require-eps.js";
import { getContractorById } from "@/modules/contractors/contractor.repository.js";
import { ConflictError, NotFoundError, ValidationError } from "@/shared/errors/app-error.js";
import { activateMembership, countActiveMemberships, decideUser, listProjectIdsForContractor, listUsers, setUserRole, setUserStatus } from "./user.repository.js";
import type { ListUsersQuery } from "./user.type.js";

// User management (approvals included) is eps_admin-only; eps_site stays operational.
export async function listUsersService(auth: AuthContext, query: ListUsersQuery) {
  assertEpsAdmin(auth);
  return listUsers(getDb(), query);
}
// Membership needs a project: use the explicit one, or the contractor's only project.
async function resolveContractorProject(db: QueryDb, contractorId: string, projectId?: string) {
  const projectIds = await listProjectIdsForContractor(db, contractorId);
  if (projectId) {
    if (!projectIds.includes(projectId)) throw new ValidationError("Contractor is not assigned to this project", { contractorId, projectId });
    return projectId;
  }
  if (projectIds.length === 1) return projectIds[0]!;
  if (projectIds.length === 0) throw new ValidationError("Contractor is not assigned to any project", { contractorId });
  throw new ValidationError("Contractor belongs to several projects — select one", { contractorId });
}
export async function decideUserService(auth: AuthContext, id: string, decision: "active" | "rejected", input: { contractorId?: string; projectId?: string; reason?: string }) {
  assertEpsAdmin(auth);
  const reason = input.reason?.trim();
  if (decision === "rejected" && !reason) throw new ValidationError("A rejection reason is required.");
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    if (user.status !== "pending" || user.role !== "contractor") throw new ConflictError("Only pending contractor registrations can be decided.");
    const contractorId = input.contractorId ?? user.requestedContractorId;
    if (decision === "active" && contractorId) {
      // A referenced contractor must exist and belong to the chosen project before approval.
      const contractor = await getContractorById(tx, contractorId);
      if (!contractor) throw new ValidationError("Unknown contractor");
      const projectId = await resolveContractorProject(tx, contractorId, input.projectId);
      await activateMembership(tx, id, contractorId, projectId);
    }
    await decideUser(tx, id, decision, auth.user.id, reason);
    return { id, status: decision };
  });
}
// eps_admin: link an approved contractor account to its company for one project.
export async function linkUserService(auth: AuthContext, id: string, input: { contractorId: string; projectId?: string }) {
  assertEpsAdmin(auth);
  return getDb().transaction(async (tx) => {
    const user = await findUserById(tx, id, true);
    if (!user) throw new NotFoundError("User not found");
    if (user.role !== "contractor") throw new ConflictError("Only contractor accounts can be linked to a contractor.");
    if (user.status !== "active") throw new ConflictError("Only active accounts can be linked to a contractor.");
    const contractor = await getContractorById(tx, input.contractorId);
    if (!contractor) throw new ValidationError("Unknown contractor");
    const projectId = await resolveContractorProject(tx, input.contractorId, input.projectId);
    if ((await countActiveMemberships(tx, id, projectId)) > 0) throw new ConflictError("This account is already linked to a contractor in this project.");
    await activateMembership(tx, id, input.contractorId, projectId);
    return { id, contractorId: input.contractorId, projectId };
  });
}
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
