import assert from "node:assert/strict";
import postgres from "postgres";
import {
  createActivityService,
  listActivitiesService,
} from "../../src/modules/site-activities/site-activity.service.js";
import { createFacilityService } from "../../src/modules/facilities/facility.service.js";
import {
  archiveFacilityPartService,
  createFacilityPartService,
} from "../../src/modules/facilities/facility-part.service.js";

const db = postgres(process.env["DATABASE_URL"]!, { max: 1 });

async function fails(operation: () => Promise<unknown>, code: string) {
  let received: string | undefined;
  try {
    await operation();
  } catch (error) {
    const failure = error as { code?: string; cause?: { code?: string } };
    received = failure.code ?? failure.cause?.code;
  }
  assert.equal(received, code);
}

try {
  const project = crypto.randomUUID(),
    otherProject = crypto.randomUUID();
  await db`INSERT INTO projects(id,code,name) VALUES (${project},'R','Reuse Project'),(${otherProject},'RQ','Other Reuse Project')`;
  const contractorA = crypto.randomUUID(),
    contractorB = crypto.randomUUID(),
    contractorC = crypto.randomUUID();
  await db`INSERT INTO contractors(id,code,name) VALUES (${contractorA},'RA','Reuse A'),(${contractorB},'RB','Reuse B'),(${contractorC},'RC','Reuse C')`;
  await db`INSERT INTO project_contractors(project_id,contractor_id) VALUES (${project},${contractorA}),(${project},${contractorB}),(${otherProject},${contractorC})`;
  const member = crypto.randomUUID(),
    outsider = crypto.randomUUID(),
    admin = crypto.randomUUID();
  await db`INSERT INTO users(id,email,can_manage_site_configuration) VALUES (${member},'reuse-member@sts.test',false),(${outsider},'reuse-outsider@sts.test',false),(${admin},'reuse-admin@sts.test',true)`;
  await db`INSERT INTO contractor_memberships(user_id,contractor_id,status) VALUES (${member},${contractorA},'active'),(${member},${contractorB},'inactive')`;
  const memberActor = { userId: member, isAdmin: false };
  const outsiderActor = { userId: outsider, isAdmin: false };
  const adminActor = { userId: admin, isAdmin: true };

  const acc = await createFacilityService(project, { name: "ACC", code: "ACC" });
  const otherAcc = await createFacilityService(otherProject, { name: "Other ACC", code: "ACC" });
  const cell = await createFacilityPartService(acc.id, { code: "C1", name: "Cooling Cell 1" });

  const base = { facilityId: acc.id, contractorId: contractorA, title: "Pipe Installation" };
  const oldPipe = await createActivityService(
    project,
    { ...base, workDate: "2026-09-28", manpower: 12, progressPercent: 40 },
    adminActor,
  );
  const midScaffold = await createActivityService(
    project,
    { ...base, contractorId: contractorB, workDate: "2026-09-29", title: "Scaffolding", manpower: 6 },
    adminActor,
  );
  const newPipe = await createActivityService(
    project,
    { ...base, facilityPartId: cell.id, workDate: "2026-09-30", manpower: 8, progressPercent: 55 },
    adminActor,
  );
  const todayPipe = await createActivityService(project, { ...base, workDate: "2026-10-02" }, adminActor);
  await createActivityService(
    otherProject,
    { facilityId: otherAcc.id, contractorId: contractorC, workDate: "2026-09-29", title: "Pipe Installation" },
    adminActor,
  );

  // 1-2. Recent query by Facility excludes today and other Facilities/Projects.
  const recent = await listActivitiesService(project, { facilityId: acc.id, before: "2026-10-02", pageSize: 10 });
  const recentIds = recent.rows.map((row) => row.id).sort();
  assert.deepEqual(recentIds, [oldPipe.id, midScaffold.id, newPipe.id].sort());
  // 3. Contractor filtering narrows the recent set.
  const onlyB = await listActivitiesService(project, {
    facilityId: acc.id,
    contractorId: contractorB,
    before: "2026-10-02",
  });
  assert.deepEqual(
    onlyB.rows.map((row) => row.id),
    [midScaffold.id],
  );
  // 4. Part filtering narrows to part work.
  const onlyPart = await listActivitiesService(project, {
    facilityId: acc.id,
    facilityPartId: cell.id,
    before: "2026-10-02",
  });
  assert.deepEqual(
    onlyPart.rows.map((row) => row.id),
    [newPipe.id],
  );
  // 5. Limit works while totals still describe the whole recent set.
  const limited = await listActivitiesService(project, { facilityId: acc.id, before: "2026-10-02", pageSize: 2 });
  assert.equal(limited.total, 3);
  assert.equal(limited.rows.length, 2);
  // 6. Invalid before values are rejected like other date filters.
  await fails(() => listActivitiesService(project, { facilityId: acc.id, before: "not-a-date" }), "VALIDATION_ERROR");
  // 7. Archived data stays readable: archiving the Part keeps history but blocks new Part work.
  await archiveFacilityPartService(cell.id);
  assert.equal(
    (await listActivitiesService(project, { facilityId: acc.id, facilityPartId: cell.id })).rows.length,
    1,
  );
  await fails(
    () =>
      createActivityService(
        project,
        { ...base, facilityId: acc.id, facilityPartId: cell.id, workDate: "2026-10-02" },
        adminActor,
      ),
    "VALIDATION_ERROR",
  );
  // 8. Reuse creates a new record and never mutates the source.
  const copy = await createActivityService(
    project,
    {
      facilityId: acc.id,
      contractorId: contractorA,
      workDate: "2026-10-02",
      title: oldPipe.title,
      description: "copied",
      status: oldPipe.status,
      manpower: 8,
      progressPercent: 55,
    },
    memberActor,
  );
  assert.notEqual(copy.id, oldPipe.id);
  const reread = await listActivitiesService(project, { facilityId: acc.id, before: "2026-10-03" });
  assert.ok(reread.rows.some((row) => row.id === todayPipe.id && row.manpower === 0));
  // 9-10. Contractor authorization still enforced on the reuse path.
  await fails(
    () => createActivityService(project, { ...base, workDate: "2026-10-02" }, outsiderActor),
    "FORBIDDEN",
  );
  await fails(
    () => createActivityService(project, { ...base, contractorId: contractorB, workDate: "2026-10-02" }, memberActor),
    "FORBIDDEN",
  );
  console.log("activity reuse behavior verified");
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
