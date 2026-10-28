import { t } from "elysia";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/auth/password.js";
export const userIdParams = t.Object({ id: t.String({ format: "uuid" }) });
export const listUsersQuery = t.Object({
  status: t.Optional(t.Union([t.Literal("pending"), t.Literal("active"), t.Literal("rejected"), t.Literal("disabled")])),
  page: t.Optional(t.String()), pageSize: t.Optional(t.String()), search: t.Optional(t.String()),
  projectId: t.Optional(t.String({ format: "uuid" })),
  contractorId: t.Optional(t.String({ format: "uuid" })),
});
export const userActivityQuery = t.Object({
  from: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  to: t.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});
export const approveBody = t.Object({ contractorId: t.Optional(t.String({ format: "uuid" })), projectId: t.Optional(t.String({ format: "uuid" })) }, { additionalProperties: false });
export const rejectBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }) }, { additionalProperties: false });
export const changeRoleBody = t.Object(
  { role: t.Union([t.Literal("contractor"), t.Literal("eps_site"), t.Literal("eps_admin")]) },
  { additionalProperties: false },
);
export const changeStatusBody = t.Object(
  { status: t.Union([t.Literal("active"), t.Literal("disabled")]) },
  { additionalProperties: false },
);
export const linkUserBody = t.Object({ contractorId: t.String({ format: "uuid" }), projectId: t.Optional(t.String({ format: "uuid" })) }, { additionalProperties: false });
// eps_admin creates an account directly: active at once, password set by the admin.
export const createUserBody = t.Object(
  {
    email: t.String({ minLength: 3, maxLength: 320 }),
    username: t.String({ minLength: 3, maxLength: 40 }),
    displayName: t.Optional(t.String({ maxLength: 120 })),
    password: t.String({ minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH }),
    role: t.Union([t.Literal("contractor"), t.Literal("eps_site"), t.Literal("eps_admin")]),
    contractorId: t.Optional(t.String({ format: "uuid" })),
    projectId: t.Optional(t.String({ format: "uuid" })),
  },
  { additionalProperties: false },
);
