import { t } from "elysia";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password.js";

const password = t.String({ minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH });
export const loginBody = t.Union([
  t.Object({ identifier: t.String({ minLength: 1, maxLength: 320 }), password: t.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  // Accept email-keyed clients too; both fields go through the same password check.
  t.Object({ email: t.String({ minLength: 3, maxLength: 320 }), password: t.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
]);
export const registerBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320 }), username: t.String({ minLength: 3, maxLength: 40 }), password,
  accountType: t.Optional(t.Union([t.Literal("contractor"), t.Literal("eps")])),
  contractorId: t.Optional(t.String({ format: "uuid" })), companyName: t.Optional(t.String({ maxLength: 200 })),
}, { additionalProperties: false });
export const resetPasswordBody = t.Object({ token: t.String({ minLength: 1, maxLength: 200 }), password }, { additionalProperties: false });
