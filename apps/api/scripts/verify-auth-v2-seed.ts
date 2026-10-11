import { strict as assert } from "node:assert";
import { inArray } from "drizzle-orm";
import { getDb } from "../src/db/client.js";
import { users } from "../src/db/schema/user.schema.js";
import { DEMO_ACCOUNTS } from "../src/auth/demo-accounts.js";

const url = new URL(process.env.DATABASE_URL!);
assert(["localhost", "127.0.0.1"].includes(url.hostname) && url.port === "5432");
const db = getDb();
const ids = DEMO_ACCOUNTS.map((account) => account.id);
async function credentials() {
  const rows = await db.select({ id: users.id, passwordHash: users.passwordHash, username: users.username }).from(users).where(inArray(users.id, ids));
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}
const before = await credentials();
assert.equal(before.length, 6);
assert(before.every((u) => u.passwordHash && u.username));
const child = Bun.spawn([process.execPath, "run", "db:seed"], { stdout: "pipe", stderr: "pipe" });
const output = await new Response(child.stdout).text();
const error = await new Response(child.stderr).text();
assert.equal(await child.exited, 0, error);
assert.deepEqual(await credentials(), before);
console.log(output.trim());
console.log("PASS seed preserves all six credential hashes and usernames");
process.exit(0);
