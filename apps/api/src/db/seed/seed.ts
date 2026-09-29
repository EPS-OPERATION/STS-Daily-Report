import { getDb } from "@/db/client.js";
import { contractorMemberships, contractors, projectContractors, projects, users } from "@/db/schema/index.js";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const CONTRACTOR_A = "22222222-2222-4222-8222-222222222222";
const CONTRACTOR_B = "33333333-3333-4333-8333-333333333333";
const USER_CONTRACTOR = "44444444-4444-4444-8444-444444444444";

const db = getDb();

await db
  .insert(projects)
  .values({
    id: PROJECT_ID,
    code: "STS-001",
    name: "Example Site",
    description: "Seed project proving project <-> contractor many-to-many.",
    status: "active",
  })
  .onConflictDoNothing({ target: projects.id });

await db
  .insert(contractors)
  .values([
    { id: CONTRACTOR_A, code: "CTR-001", name: "Example Contractor A" },
    { id: CONTRACTOR_B, code: "CTR-002", name: "Example Contractor B" },
  ])
  .onConflictDoNothing({ target: contractors.id });

await db
  .insert(projectContractors)
  .values([
    { projectId: PROJECT_ID, contractorId: CONTRACTOR_A },
    { projectId: PROJECT_ID, contractorId: CONTRACTOR_B },
  ])
  .onConflictDoNothing();

// Development login only (no password): contractor@sts.local
await db
  .insert(users)
  .values({
    id: USER_CONTRACTOR,
    email: "contractor@sts.local",
    displayName: "Contractor User",
    status: "active",
  })
  .onConflictDoNothing({ target: users.id });

await db
  .insert(contractorMemberships)
  .values([{ userId: USER_CONTRACTOR, contractorId: CONTRACTOR_A, status: "active" }])
  .onConflictDoNothing();

console.log("seed ok: 1 project, 2 contractors, 2 links, 1 user, 1 membership");
process.exit(0);
