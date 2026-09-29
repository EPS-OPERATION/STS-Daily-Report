import { t } from "elysia";

export const loginBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320 }),
});
