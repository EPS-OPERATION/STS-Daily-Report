import { PASSWORD_RULE_MESSAGE, checkPassword } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { ValidationError } from "@/shared/errors/app-error.js";
import { findUserById } from "./auth.repository.js";
import { hashPassword } from "./password.js";
import { consumeResetToken, findResetToken, invalidateResetTokens, replacePassword } from "./password-reset.repository.js";
import { hashSessionToken } from "./session.service.js";

const invalidToken = () => new ValidationError("This reset link is invalid or expired. Please contact your administrator.");
export async function resetPassword(token: string, password: string) {
  if (!checkPassword(password).valid) throw new ValidationError(PASSWORD_RULE_MESSAGE);
  const db = getDb();
  const found = await findResetToken(db, hashSessionToken(token));
  if (!found || found.usedAt || found.expiresAt.getTime() <= Date.now()) throw invalidToken();
  const hash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const user = await findUserById(tx, found.userId, true);
    if (!user || user.status !== "active" || !(await consumeResetToken(tx, found.id))) throw invalidToken();
    await replacePassword(tx, user.id, hash);
    await invalidateResetTokens(tx, user.id);
  });
  return { ok: true };
}
