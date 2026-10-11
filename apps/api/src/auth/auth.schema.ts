import { t } from "elysia";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password.js";

const password = t.String({ minLength: MIN_PASSWORD_LENGTH, maxLength: MAX_PASSWORD_LENGTH });
export const loginBody = t.Union([
  t.Object({ identifier: t.String({ minLength: 1, maxLength: 320 }), password: t.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  // Accept password-bearing legacy clients too; a supplied password never selects demo login.
  t.Object({ email: t.String({ minLength: 3, maxLength: 320 }), password: t.String({ minLength: 1, maxLength: 128 }) }, { additionalProperties: false }),
  t.Object({ email: t.String({ minLength: 3, maxLength: 320 }), accessCode: t.Optional(t.String({ maxLength: 200 })) }, { additionalProperties: false }),
]);
export const registerBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320 }), username: t.String({ minLength: 3, maxLength: 40 }), password,
  contractorId: t.Optional(t.String({ format: "uuid" })), companyName: t.Optional(t.String({ maxLength: 200 })),
}, { additionalProperties: false });
export const resetPasswordBody = t.Object({ token: t.String({ minLength: 1, maxLength: 200 }), password }, { additionalProperties: false });
export const linkRequestBody = t.Object({ contractorId: t.String({ format: "uuid" }) }, { additionalProperties: false });
