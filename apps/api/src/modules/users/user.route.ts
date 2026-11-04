import { Elysia } from "elysia";
import { normalizePagination } from "@sts/shared";
import { recordSecurityEvent } from "@/auth/security-event.js";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok, paginated } from "@/shared/http/response.js";
import { approveBody, userActivityQuery, changeRoleBody, changeStatusBody, createUserBody, linkUserBody, listUsersQuery, rejectBody, userIdParams } from "./user.schema.js";
import { changeUserRoleService, changeUserStatusService, createUserService, decideUserService, issueResetLinkService, linkUserService, listUsersService, userActivityService } from "./user.service.js";

export const userRoutes = new Elysia({ prefix: "/users" }).use(requireAuth)
  .onAfterHandle(({ set }) => { set.headers["cache-control"] = "no-store"; })
  .get("/", async ({ auth, query }) => {
    const p = normalizePagination(query);
    const { rows, total } = await listUsersService(auth, { ...p, status: query.status, projectId: query.projectId, contractorId: query.contractorId });
    return paginated(rows, p.page, p.pageSize, total);
  }, { query: listUsersQuery })
  .get("/activity", async ({ auth, query }) => ok(await userActivityService(auth, query.from, query.to)), { query: userActivityQuery })
  .post("/", async ({ auth, body, set }) => {
    set.status = 201;
    return ok(await createUserService(auth, body));
  }, { body: createUserBody })
  .post("/:id/approve", async ({ auth, params, body, request, server }) => {
    const result = await decideUserService(auth, params.id, "active", body);
    await recordSecurityEvent({ event: "registration_approved", userId: params.id, actorId: auth.user.id, request, server });
    return ok(result);
  }, { params: userIdParams, body: approveBody })
  .post("/:id/reject", async ({ auth, params, body, request, server }) => {
    const result = await decideUserService(auth, params.id, "rejected", body);
    await recordSecurityEvent({ event: "registration_rejected", userId: params.id, actorId: auth.user.id, request, server });
    return ok(result);
  }, { params: userIdParams, body: rejectBody })
  .post("/:id/link", async ({ auth, params, body }) => ok(await linkUserService(auth, params.id, body)), { params: userIdParams, body: linkUserBody })
  .post("/:id/reset-password", async ({ auth, params, request, server }) => {
    const result = await issueResetLinkService(auth, params.id);
    await recordSecurityEvent({ event: "password_reset_issued", userId: params.id, actorId: auth.user.id, request, server });
    return ok(result);
  }, { params: userIdParams })
  .patch("/:id/role", async ({ auth, params, body, request, server }) => {
    const result = await changeUserRoleService(auth, params.id, body.role);
    await recordSecurityEvent({ event: "role_changed", userId: params.id, actorId: auth.user.id, detail: { role: body.role }, request, server });
    return ok(result);
  }, { params: userIdParams, body: changeRoleBody })
  .patch("/:id/status", async ({ auth, params, body, request, server }) => {
    const result = await changeUserStatusService(auth, params.id, body.status);
    await recordSecurityEvent({ event: "status_changed", userId: params.id, actorId: auth.user.id, detail: { status: body.status }, request, server });
    return ok(result);
  }, { params: userIdParams, body: changeStatusBody });
