import { getDb } from "../src/db/client.js";
import { findUserByEmail, findUserById } from "../src/auth/auth.repository.js";
import { hashPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../src/auth/password.js";
import { replacePassword } from "../src/auth/password-reset.repository.js";

// Explicit operator action for a passwordless seeded EPS account. No default production password.
const email = process.env.EPS_BOOTSTRAP_EMAIL;
const password = process.env.EPS_BOOTSTRAP_PASSWORD;
if (!email || !password || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
  throw new Error("Set EPS_BOOTSTRAP_EMAIL and EPS_BOOTSTRAP_PASSWORD (8–128 characters) in the process environment.");
}
const db = getDb();
const found = await findUserByEmail(db, email);
if (!found || found.role !== "eps" || found.status !== "active") throw new Error("An existing active EPS account is required.");
const hash = await hashPassword(password);
await db.transaction(async (tx) => {
  const user = await findUserById(tx, found.id, true);
  if (!user || user.role !== "eps" || user.status !== "active" || user.passwordHash) throw new Error("Only a passwordless active EPS account can be bootstrapped.");
  await replacePassword(tx, user.id, hash);
});
console.log("EPS password initialized; previous sessions revoked. No credential values were logged.");
process.exit(0);
