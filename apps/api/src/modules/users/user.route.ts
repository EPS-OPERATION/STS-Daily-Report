import { Elysia } from "elysia";
import { normalizePagination } from "@sts/shared";
import { requireAuth } from "@/middleware/require-auth.js";
import { ok, paginated } from "@/shared/http/response.js";
import { approveBody, changeRoleBody, changeStatusBody, linkUserBody, listUsersQuery, rejectBody, userIdParams } from "./user.schema.js";
import { changeUserRoleService, changeUserStatusService, decideUserService, issueResetLinkService, linkUserService, listUsersService } from "./user.service.js";

export const userRoutes = new Elysia({ prefix: "/users" }).use(requireAuth)
  .onAfterHandle(({ set }) => { set.headers["cache-control"] = "no-store"; })
  .get("/", async ({ auth, query }) => {
    const p = normalizePagination(query);
    const { rows, total } = await listUsersService(auth, { ...p, status: query.status });
    return paginated(rows, p.page, p.pageSize, total);
  }, { query: listUsersQuery })
  .post("/:id/approve", async ({ auth, params, body }) => ok(await decideUserService(auth, params.id, "active", body)), { params: userIdParams, body: approveBody })
  .post("/:id/reject", async ({ auth, params, body }) => ok(await decideUserService(auth, params.id, "rejected", body)), { params: userIdParams, body: rejectBody })
  .post("/:id/link", async ({ auth, params, body }) => ok(await linkUserService(auth, params.id, body.contractorId)), { params: userIdParams, body: linkUserBody })
  .post("/:id/reset-password", async ({ auth, params }) => ok(await issueResetLinkService(auth, params.id)), { params: userIdParams })
  .patch("/:id/role", async ({ auth, params, body }) => ok(await changeUserRoleService(auth, params.id, body.role)), { params: userIdParams, body: changeRoleBody })
  .patch("/:id/status", async ({ auth, params, body }) => ok(await changeUserStatusService(auth, params.id, body.status)), { params: userIdParams, body: changeStatusBody });
