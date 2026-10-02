import assert from "node:assert/strict";
import { buildApp } from "../../src/app.js";
import { getMapViewRecord } from "../../src/modules/site-maps/site-map.repository.js";
import { getDb } from "../../src/db/client.js";
import { getStorage } from "../../src/shared/storage/index.js";

const [projectId, otherProjectId, contractorId, adminEmail, operatorEmail, contractor2] = Bun.argv.slice(2);
const app = buildApp();
const objects: string[] = [];

async function request(method: string, path: string, cookie?: string, body?: unknown) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined && !(body instanceof FormData)) headers.set("content-type", "application/json");
  return app.handle(
    new Request("http://localhost/api/v1" + path, {
      method,
      headers,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }),
  );
}

async function login(email: string, allowed: boolean) {
  const response = await request("POST", "/auth/login", undefined, { email });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.data.user.canManageSiteConfiguration, allowed);
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie);
  return cookie;
}

async function create(path: string, cookie: string, body: unknown) {
  const response = await request("POST", path, cookie, body);
  const payload = await response.json();
  assert.equal(response.status, 201, JSON.stringify(payload));
  return payload.data;
}

try {
  const operator = await login(operatorEmail!, false);
  const admin = await login(adminEmail!, true);
  assert.equal((await request("POST", "/projects", operator, { code: "DENIED", name: "Denied" })).status, 403);
  const newProject = await create("/projects", admin, {
    code: " http-fixture ",
    name: "First-run Project",
    description: "Created through API",
  });
  assert.equal(newProject.code, "HTTP-FIXTURE");
  assert.equal((await request("PATCH", `/projects/${newProject.id}`, operator, { name: "Denied" })).status, 403);
  assert.equal((await request("PATCH", `/projects/${newProject.id}`, admin, { name: "Updated Project" })).status, 200);
  assert.equal(
    (await (await request("GET", `/projects/${newProject.id}`, operator)).json()).data.name,
    "Updated Project",
  );
  assert.equal(
    (await request("PUT", `/projects/${newProject.id}/contractors`, operator, { contractorIds: [contractorId] }))
      .status,
    403,
  );
  assert.equal(
    (await request("PUT", `/projects/${newProject.id}/contractors`, admin, { contractorIds: [contractorId] })).status,
    200,
  );
  assert.equal(
    (await request("PUT", `/projects/${newProject.id}/contractors`, admin, { contractorIds: [crypto.randomUUID()] }))
      .status,
    400,
  );
  assert.equal(
    (await (await request("GET", `/projects/${newProject.id}/contractors`, operator)).json()).data[0].id,
    contractorId,
  );
  const unmapped = await create(`/projects/${newProject.id}/facilities`, admin, { name: "Facility without a Map" });
  const unmappedWork = await create(`/projects/${newProject.id}/activities`, operator, {
    facilityId: unmapped.id,
    contractorId,
    workDate: "2026-10-01",
    title: "Work without a Map",
  });
  assert.equal(unmappedWork.facility.id, unmapped.id);
  assert.equal(unmappedWork.zone, null);
  assert.equal((await (await request("GET", `/projects/${newProject.id}/site-maps`, operator)).json()).data.length, 0);
  assert.equal(
    (await request("POST", `/projects/${projectId}/site-maps`, undefined, { name: "Forbidden" })).status,
    401,
  );
  assert.equal(
    (await request("POST", `/projects/${projectId}/site-maps`, operator, { name: "Forbidden" })).status,
    403,
  );
  assert.equal(
    (await request("POST", `/projects/${projectId}/facilities`, operator, { name: "Forbidden" })).status,
    403,
  );
  assert.equal((await request("GET", `/projects/${projectId}/facilities`, operator)).status, 200);
  const map = await create(`/projects/${projectId}/site-maps`, admin, { name: "HTTP Map" });
  const view = await create(`/site-maps/${map.id}/views`, admin, { name: "Overview" });
  const facility = await create(`/projects/${projectId}/facilities`, admin, { name: "API Facility", code: "API-01" });
  assert.equal("legacyZoneId" in facility, false);
  const conflict = await request("POST", `/projects/${projectId}/facilities`, admin, {
    name: "Duplicate",
    code: "API-01",
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, "CONFLICT");
  const otherFacilities = await (await request("GET", `/projects/${otherProjectId}/facilities`, admin)).json();
  const foreign = otherFacilities.data[0];
  assert.ok(foreign);
  const markerPath = `/site-map-views/${view.id}/markers`;
  assert.equal(
    (await request("PUT", markerPath, operator, { markers: [{ facilityId: facility.id, x: 0.2, y: 0.3 }] })).status,
    403,
  );
  assert.equal(
    (
      await request("PUT", markerPath, admin, {
        markers: [
          { facilityId: facility.id, x: 0.2, y: 0.3 },
          { facilityId: foreign.id, x: 0.4, y: 0.5 },
        ],
      })
    ).status,
    400,
  );
  assert.equal((await (await request("GET", markerPath, operator)).json()).data.length, 0);
  assert.equal(
    (await request("PUT", markerPath, admin, { markers: [{ facilityId: facility.id, x: 0.2, y: 0.3 }] })).status,
    200,
  );
  const marker = (await (await request("GET", markerPath, operator)).json()).data[0];
  assert.equal(marker.facilityId, facility.id);
  assert.equal(
    (await request("PUT", markerPath, admin, { markers: [{ facilityId: facility.id, x: 0.4, y: 0.5 }] })).status,
    200,
  );
  assert.equal((await (await request("GET", markerPath, operator)).json()).data[0].id, marker.id);
  assert.equal((await request("PATCH", `/site-maps/${map.id}`, operator, { name: "Denied" })).status, 403);
  assert.equal((await request("DELETE", `/site-maps/${map.id}`, operator)).status, 403);
  assert.equal((await request("POST", `/site-maps/${map.id}/views`, operator, { name: "Denied" })).status, 403);
  assert.equal((await request("PATCH", `/site-map-views/${view.id}`, operator, { name: "Denied" })).status, 403);
  assert.equal((await request("DELETE", `/site-map-views/${view.id}`, operator)).status, 403);
  assert.equal((await request("PATCH", `/facilities/${facility.id}`, operator, { name: "Denied" })).status, 403);
  assert.equal((await request("DELETE", `/facilities/${facility.id}`, operator)).status, 403);
  assert.equal(
    (await request("POST", `/facilities/${facility.id}/parts`, operator, { code: "X", name: "Denied" })).status,
    403,
  );
  const part = await create(`/facilities/${facility.id}/parts`, admin, { code: "C1", name: "Cooling Cell 1" });
  assert.equal(part.facilityId, facility.id);
  assert.equal((await request("PATCH", `/facility-parts/${part.id}`, operator, { name: "Denied" })).status, 403);
  assert.equal((await request("DELETE", `/facility-parts/${part.id}`, operator)).status, 403);
  assert.equal((await request("PUT", `/site-plans/${map.id}/points`, operator, { locations: [] })).status, 403);
  assert.equal(
    (await request("PUT", `/site-plans/${map.id}/areas`, operator, { areas: [], deleteAreaIds: [] })).status,
    403,
  );
  assert.equal(
    (await request("PUT", `/projects/${projectId}/zones/${crypto.randomUUID()}/parts`, operator, { parts: [] })).status,
    403,
  );

  const fields = {
    facilityId: facility.id,
    contractorId,
    workDate: "2026-10-01",
    title: "Whole facility",
    manpower: 10,
  };
  const whole = await create(`/projects/${projectId}/activities`, operator, fields);
  assert.equal(whole.zone, null);
  assert.equal(whole.facilityPart, null);
  const work = await create(`/projects/${projectId}/activities`, operator, {
    ...fields,
    facilityPartId: part.id,
    title: "Part work",
    manpower: 8,
    status: "blocked",
  });
  assert.equal(work.facilityPart.id, part.id);
  const listing = await (
    await request(
      "GET",
      `/projects/${projectId}/activities?workDate=2026-10-01&facilityId=${facility.id}&pageSize=1`,
      operator,
    )
  ).json();
  assert.equal(listing.meta.total, 2);
  assert.equal(listing.data.length, 1);
  assert.equal(listing.data[0].status, "blocked");
  const summary = await (
    await request(
      "GET",
      `/projects/${projectId}/activity-summaries?workDate=2026-10-01&facilityId=${facility.id}`,
      operator,
    )
  ).json();
  assert.deepEqual(summary.data[0], {
    facilityId: facility.id,
    activityCount: 2,
    contractorCount: 1,
    manpowerCount: 18,
    highestPriorityStatus: "blocked",
  });
  const filtered = await (
    await request(
      "GET",
      `/projects/${projectId}/activity-summaries?workDate=2026-10-01&facilityId=${facility.id}&status=active`,
      operator,
    )
  ).json();
  assert.equal(filtered.data[0].activityCount, 1);
  assert.equal(filtered.data[0].highestPriorityStatus, "active");
  assert.equal((await request("GET", `/activities/${work.id}`, operator)).status, 200);
  assert.equal(
    (await request("GET", `/projects/${projectId}/activities?facilityId=${foreign.id}`, operator)).status,
    400,
  );
  assert.equal(
    (
      await request("POST", `/projects/${projectId}/activities`, operator, {
        ...fields,
        contractorId: contractor2,
        title: "Unassigned contractor",
      })
    ).status,
    403,
  );
  const adminFiled = await create(`/projects/${projectId}/activities`, admin, {
    ...fields,
    contractorId: contractor2,
    title: "Admin filed for unassigned contractor",
  });
  assert.equal(adminFiled.contractor.id, contractor2);
  assert.equal(
    (await request("PATCH", `/activities/${work.id}`, operator, { title: "Renamed by member" })).status,
    200,
  );
  assert.equal(
    (await request("PATCH", `/activities/${work.id}`, operator, { contractorId: contractor2 })).status,
    403,
  );
  assert.equal(
    (await request("PATCH", `/activities/${work.id}`, admin, { contractorId: contractor2 })).status,
    200,
  );

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlJkAAAAASUVORK5CYII=",
    "base64",
  );
  const imageForm = () => {
    const form = new FormData();
    form.set("file", new File([png], "map.png", { type: "image/png" }));
    form.set("width", "1");
    form.set("height", "1");
    return form;
  };
  assert.equal((await request("POST", `/site-map-views/${view.id}/image`, operator, imageForm())).status, 403);
  assert.equal((await (await request("GET", `/site-map-views/${view.id}`, operator)).json()).data.imageUrl, null);
  const uploaded = await request("POST", `/site-map-views/${view.id}/image`, admin, imageForm());
  const uploadedPayload = await uploaded.json();
  assert.equal(uploaded.status, 200, JSON.stringify(uploadedPayload));
  const stored = await getMapViewRecord(getDb(), view.id);
  assert.ok(stored?.imageObjectKey?.startsWith(`projects/${projectId}/`));
  objects.push(stored!.imageObjectKey!);
  assert.equal(stored!.width, 1);
  assert.equal(stored!.height, 1);
  const bytes = await fetch(uploadedPayload.data.imageUrl);
  assert.equal(bytes.status, 200);
  assert.deepEqual(Buffer.from(await bytes.arrayBuffer()), png);
  const replaced = await request("POST", `/site-map-views/${view.id}/image`, admin, imageForm());
  assert.equal(replaced.status, 200);
  const replacement = await getMapViewRecord(getDb(), view.id);
  assert.notEqual(replacement!.imageObjectKey, stored!.imageObjectKey);
  objects.push(replacement!.imageObjectKey!);
  assert.equal((await request("POST", `/site-map-views/${view.id}/image`, operator, imageForm())).status, 403);
  assert.equal((await getMapViewRecord(getDb(), view.id))!.imageObjectKey, replacement!.imageObjectKey);
  assert.equal((await request("DELETE", `/facility-parts/${part.id}`, admin)).status, 204);
  assert.equal(
    (await (await request("GET", `/activities/${work.id}`, operator)).json()).data.facilityPart.isActive,
    false,
  );
  assert.equal(
    (await request("POST", `/projects/${projectId}/activities`, operator, { ...fields, facilityPartId: part.id }))
      .status,
    400,
  );
  await create(`/projects/${projectId}/activities`, operator, fields);
  assert.equal((await request("DELETE", `${markerPath}/${facility.id}`, admin)).status, 204);
  assert.equal((await (await request("GET", markerPath, operator)).json()).data.length, 0);
  assert.equal((await request("GET", `/facilities/${facility.id}`, operator)).status, 200);
  assert.equal((await request("GET", `/activities/${work.id}`, operator)).status, 200);
  assert.equal((await request("DELETE", `/facilities/${facility.id}`, admin)).status, 204);
  assert.equal((await (await request("GET", `/facilities/${facility.id}`, operator)).json()).data.isActive, false);
  assert.equal((await request("GET", `/activities/${work.id}`, operator)).status, 200);
  console.log("Authenticated Facility APIs, permission boundaries, SQL filtering and MinIO persistence verified");
  for (const key of objects) await getStorage().remove(key);
  process.exit(0);
} catch (error) {
  console.error(error);
  for (const key of objects)
    await getStorage()
      .remove(key)
      .catch(() => undefined);
  process.exit(1);
}
