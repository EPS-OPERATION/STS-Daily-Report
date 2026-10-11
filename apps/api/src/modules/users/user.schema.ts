import { t } from "elysia";
export const userIdParams = t.Object({ id: t.String({ format: "uuid" }) });
export const listUsersQuery = t.Object({
  status: t.Optional(t.Union([t.Literal("pending"), t.Literal("active"), t.Literal("rejected")])),
  page: t.Optional(t.String()), pageSize: t.Optional(t.String()), search: t.Optional(t.String()),
});
export const approveBody = t.Object({ contractorId: t.Optional(t.String({ format: "uuid" })) }, { additionalProperties: false });
export const rejectBody = t.Object({ reason: t.String({ minLength: 1, maxLength: 500 }) }, { additionalProperties: false });
