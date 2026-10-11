import { isEpsAdmin } from "@sts/shared";
import { getDb } from "../src/db/client.js";
import { findUserByEmail, findUserById } from "../src/auth/auth.repository.js";
import { hashPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../src/auth/password.js";
import { replacePassword } from "../src/auth/password-reset.repository.js";

// Explicit operator action for a passwordless seeded EPS administrator. No default production password.
const email = process.env.EPS_BOOTSTRAP_EMAIL;
const password = process.env.EPS_BOOTSTRAP_PASSWORD;
if (!email || !password || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
  throw new Error("Set EPS_BOOTSTRAP_EMAIL and EPS_BOOTSTRAP_PASSWORD (8–128 characters) in the process environment.");
}
const db = getDb();
const found = await findUserByEmail(db, email);
if (!found || !isEpsAdmin(found.role) || found.status !== "active") throw new Error("An existing active EPS administrator account is required.");
const hash = await hashPassword(password);
await db.transaction(async (tx) => {
  const user = await findUserById(tx, found.id, true);
  if (!user || !isEpsAdmin(user.role) || user.status !== "active" || user.passwordHash) throw new Error("Only a passwordless active EPS administrator account can be bootstrapped.");
  await replacePassword(tx, user.id, hash);
});
console.log("EPS admin password initialized; previous sessions revoked. No credential values were logged.");
process.exit(0);
