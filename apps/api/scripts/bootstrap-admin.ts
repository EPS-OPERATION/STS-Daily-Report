import { isEpsAdmin } from "@sts/shared";
import { getDb } from "../src/db/client.js";
import { findUserByEmail } from "../src/auth/auth.repository.js";
import { hashPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../src/auth/password.js";
import { replacePassword } from "../src/auth/password-reset.repository.js";
import { users } from "../src/db/schema/index.js";

// Operator-run bootstrap for the FIRST EPS administrator (seed inserts no users).
// Creates the account when missing; initializes the password of an existing
// passwordless active eps_admin. Never overwrites an existing password.
const email = process.env.EPS_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.EPS_BOOTSTRAP_PASSWORD;
if (!email || !password || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
  throw new Error("Set EPS_BOOTSTRAP_EMAIL and EPS_BOOTSTRAP_PASSWORD (8–128 characters) in the process environment.");
}
const db = getDb();
const existing = await findUserByEmail(db, email);
const hash = await hashPassword(password);
if (!existing) {
  const candidate = email.split("@")[0]!.replace(/[^a-z0-9._-]/g, "").slice(0, 20);
  const username = candidate.length >= 3 ? candidate : null;
  try {
    await db.insert(users).values({ email, username, displayName: "EPS Administrator", role: "eps_admin", status: "active", passwordHash: hash });
  } catch (error) {
    // Username already taken by another account: create without one (login still works by email).
    const cause = (error as { cause?: { code?: string; constraint_name?: string }; code?: string; constraint_name?: string });
    const inner = cause.cause ?? cause;
    if (inner.code === "23505" && inner.constraint_name?.includes("username")) {
      await db.insert(users).values({ email, username: null, displayName: "EPS Administrator", role: "eps_admin", status: "active", passwordHash: hash });
    } else {
      throw error;
    }
  }
  console.log("EPS administrator created. No credential values were logged.");
} else {
  if (!isEpsAdmin(existing.role) || existing.status !== "active" || existing.passwordHash) {
    throw new Error("An existing account with this email cannot be bootstrapped (not an active passwordless EPS administrator).");
  }
  await replacePassword(db, existing.id, hash);
  console.log("EPS administrator password initialized; previous sessions revoked. No credential values were logged.");
}
process.exit(0);
