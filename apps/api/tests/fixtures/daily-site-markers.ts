import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { buildApp } from "../../src/app.js";
import { getDb } from "../../src/db/client.js";

const ids = JSON.parse(Bun.argv[2]!) as Record<string, string>;
const emails = JSON.parse(Bun.argv[3]!) as Record<string, string>;
const app = buildApp();

async function request(method: string, path: string, cookie?: string, body?: unknown) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  return app.handle(
    new Request("http://localhost/api/v1" + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

async function login(email: string) {
  const response = await request("POST", "/auth/login", undefined, { email });
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

async function create(cookie: string, body: unknown) {
  const response = await request("POST", `/projects/${ids.project}/daily-site-markers`, cookie, body);
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  return payload.data;
}

try {
  const creator = await login(emails.creator!);
  const peer = await login(emails.peer!);
  const userB = await login(emails.userB!);
  const outsider = await login(emails.outsider!);
  const inactiveMember = await login(emails.inactiveMember!);
  const configUser = await login(emails.configUser!);
  const path = `/projects/${ids.project}/daily-site-markers`;
  const body = {
    siteMapViewId: ids.topView,
    workDate: "2026-10-02",
    contractorId: ids.contractorA,
    iconKey: "crane",
    comment: "Crane operating until 17:00.",
    x: 0.2,
    y: 0.3,
    facilityId: ids.facility,
  };

  assert.equal((await request("POST", path, undefined, body)).status, 401);
  assert.equal((await request("POST", path, outsider, body)).status, 403);
  assert.equal((await request("POST", path, inactiveMember, body)).status, 403);
  assert.equal((await request("POST", path, configUser, body)).status, 403);
  assert.equal((await request("POST", path, userB, body)).status, 403);
  assert.equal((await request("POST", path, creator, { ...body, siteMapViewId: ids.overviewView })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, siteMapViewId: ids.otherView })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, contractorId: ids.unassignedContractor })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, facilityId: ids.otherFacility })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, iconKey: "arbitrary-component" })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, comment: "  " })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, x: 1.1 })).status, 400);
  assert.equal((await request("POST", path, creator, { ...body, workDate: "2026-02-30" })).status, 400);

  const first = await create(creator, body);
  assert.equal(first.createdBy.id, ids.creator);
  assert.equal(first.createdBy.displayName, "Somchai P.");
  assert.equal(first.contractor.id, ids.contractorA);
  assert.equal(first.facility.id, ids.facility);
  assert.equal(first.x, body.x);
  assert.equal(first.y, body.y);
  assert.equal(first.canEdit, true);
  assert.equal(first.canWithdraw, true);

  const second = await create(userB, {
    ...body,
    contractorId: ids.contractorB,
    iconKey: "truck",
    comment: "Concrete delivery between 15:00 and 16:00.",
    facilityId: null,
  });
  assert.equal(second.facility, null);
  assert.equal(second.canEdit, true);

  const list = (await (await request("GET", `${path}?siteMapViewId=${ids.topView}&workDate=2026-10-02`, peer)).json())
    .data;
  assert.equal(list.length, 2);
  assert.equal(list.find((row: { id: string }) => row.id === first.id).canEdit, false);
  assert.equal(list.find((row: { id: string }) => row.id === second.id).contractor.id, ids.contractorB);
  assert.equal(
    (await (await request("GET", `${path}?siteMapViewId=${ids.topView}&workDate=2026-10-03`, peer)).json()).data.length,
    0,
  );
  const otherProjectPath = `/projects/${ids.otherProject}/daily-site-markers?siteMapViewId=${ids.otherView}&workDate=2026-10-02`;
  assert.equal((await (await request("GET", otherProjectPath, peer)).json()).data.length, 0);
  assert.equal(
    (await request("GET", `${path}?siteMapViewId=${ids.overviewView}&workDate=2026-10-02`, peer)).status,
    400,
  );
  assert.equal(
    (
      await (
        await request(
          "GET",
          `${path}?siteMapViewId=${ids.topView}&workDate=2026-10-02&contractorId=${ids.contractorA}`,
          peer,
        )
      ).json()
    ).data.length,
    1,
  );

  assert.equal((await request("PATCH", `/daily-site-markers/${first.id}`, peer, { comment: "Peer edit" })).status, 403);
  assert.equal(
    (await request("PATCH", `/daily-site-markers/${first.id}`, userB, { comment: "Other company edit" })).status,
    403,
  );
  await getDb().execute(
    sql`UPDATE contractor_memberships SET status='inactive' WHERE user_id=${ids.creator} AND contractor_id=${ids.contractorA}`,
  );
  assert.equal(
    (await request("PATCH", `/daily-site-markers/${first.id}`, creator, { comment: "Membership ended" })).status,
    403,
  );
  await getDb().execute(
    sql`UPDATE contractor_memberships SET status='active' WHERE user_id=${ids.creator} AND contractor_id=${ids.contractorA}`,
  );

  const edited = (
    await (
      await request("PATCH", `/daily-site-markers/${first.id}`, creator, {
        iconKey: "equipment",
        comment: "Crane repositioned.",
        x: 0.25,
        y: 0.35,
        facilityId: null,
      })
    ).json()
  ).data;
  assert.equal(edited.iconKey, "equipment");
  assert.equal(edited.comment, "Crane repositioned.");
  assert.equal(edited.x, 0.25);
  assert.equal(edited.y, 0.35);
  assert.equal(edited.updatedBy.id, ids.creator);
  assert.equal(edited.facility, null);
  assert.equal(
    (await request("PATCH", `/daily-site-markers/${first.id}`, creator, { contractorId: ids.contractorB })).status,
    400,
  );

  assert.equal((await request("POST", `/daily-site-markers/${first.id}/withdraw`, peer)).status, 403);
  const withdrawn = (await (await request("POST", `/daily-site-markers/${first.id}/withdraw`, creator)).json()).data;
  assert.equal(withdrawn.status, "withdrawn");
  assert.ok(withdrawn.withdrawnAt);
  assert.equal(withdrawn.canEdit, false);
  assert.equal(
    (await (await request("GET", `${path}?siteMapViewId=${ids.topView}&workDate=2026-10-02`, peer)).json()).data.length,
    1,
  );
  const history = (
    await (await request("GET", `${path}?siteMapViewId=${ids.topView}&workDate=2026-10-02&status=all`, peer)).json()
  ).data;
  assert.equal(history.length, 2);
  assert.ok(history.some((row: { id: string; status: string }) => row.id === first.id && row.status === "withdrawn"));
  assert.equal(
    (await request("PATCH", `/daily-site-markers/${first.id}`, creator, { comment: "After withdraw" })).status,
    409,
  );

  const counts = (
    await getDb().execute(sql`SELECT
    (SELECT count(*)::int FROM site_activities) AS activities,
    (SELECT count(*)::int FROM facility_map_markers) AS facility_markers,
    (SELECT count(*)::int FROM daily_site_markers) AS daily_markers`)
  )[0] as Record<string, number>;
  assert.deepEqual(counts, { activities: 0, facility_markers: 1, daily_markers: 2 });
  console.log("daily marker authorization and persistence verified");
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
