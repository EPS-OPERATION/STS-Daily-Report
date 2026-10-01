import { getDb } from "@/db/client.js";
import { users } from "@/db/schema/index.js";

// Development login only (no password): contractor@sts.local.
// Project and operational data are created through the application.
await getDb()
  .insert(users)
  .values({
    id: "44444444-4444-4444-8444-444444444444",
    email: "contractor@sts.local",
    displayName: "Contractor User",
    status: "active",
  })
  .onConflictDoUpdate({ target: users.email, set: { displayName: "Contractor User", status: "active" } });

console.log("seed ok: users only; no project or operational seed data");
process.exit(0);
