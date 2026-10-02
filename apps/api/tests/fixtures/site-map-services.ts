import assert from "node:assert/strict";
import {
  createActivityService,
  getActivityService,
  listActivitiesService,
  listFacilitySummariesService,
  updateActivityService,
} from "../../src/modules/site-activities/site-activity.service.js";
import {
  archiveFacilityPartService,
  createFacilityPartService,
  listFacilityPartsService,
  updateFacilityPartService,
} from "../../src/modules/facilities/facility-part.service.js";
import {
  archiveFacilityService,
  createFacilityService,
  getFacilityService,
  listFacilitiesService,
  updateFacilityService,
} from "../../src/modules/facilities/facility.service.js";
import {
  createMapViewService,
  createSiteMapService,
  listFacilityMarkersService,
  listMapViewsService,
  listSiteMapsService,
  saveFacilityMarkersService,
  updateMapViewService,
  updateSiteMapService,
} from "../../src/modules/site-maps/site-map.service.js";

const projectId = Bun.argv[2]!;
const otherProjectId = Bun.argv[3]!;
const contractorId = Bun.argv[4]!;
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
  const acc = await createFacilityService(projectId, { name: " ACC ", code: "acc" });
  const tr = await createFacilityService(projectId, { name: "TR" });
  const other = await createFacilityService(otherProjectId, { name: "Other ACC", code: "ACC" });
  assert.equal(acc.name, "ACC");
  assert.equal(acc.code, "ACC");
  assert.equal("legacyZoneId" in acc, false);
  await fails(() => createFacilityService(projectId, { name: "Duplicate code", code: "ACC" }), "23505");
  await fails(() => createFacilityService(projectId, { name: "  " }), "VALIDATION_ERROR");
  const renamed = await updateFacilityService(acc.id, { name: "ACC renamed" });
  assert.equal(renamed!.key, acc.key);
  assert.equal(renamed!.id, acc.id);
  assert.deepEqual(
    (await listFacilitiesService(otherProjectId)).map((row) => row.id),
    [other.id],
  );
  const accPart = await createFacilityPartService(acc.id, { code: " a ", name: " ACC Part A " });
  const trPart = await createFacilityPartService(tr.id, { code: "A", name: "TR Part A" });
  assert.equal(accPart.facilityId, acc.id);
  assert.equal(trPart.facilityId, tr.id);
  assert.equal("zoneId" in trPart, false);
  assert.equal("mapX" in trPart, false);
  await fails(() => createFacilityPartService(acc.id, { code: "A", name: "Duplicate" }), "23505");
  const renamedPart = await updateFacilityPartService(accPart.id, { name: "Cooling Cell 1" });
  assert.equal(renamedPart!.id, accPart.id);
  await archiveFacilityPartService(accPart.id);
  assert.equal((await listFacilityPartsService(acc.id)).length, 0);
  assert.equal((await listFacilityPartsService(acc.id, "all")).length, 1);
  assert.equal((await listFacilityPartsService(tr.id)).length, 1);

  await updateFacilityPartService(accPart.id, { isActive: true });
  const activityInput = { contractorId, workDate: "2026-10-01", title: "Facility work" };
  await fails(() => createActivityService(projectId, activityInput, { userId: null, isAdmin: true }), "VALIDATION_ERROR");
  await fails(
    () => createActivityService(projectId, { ...activityInput, facilityId: acc.id, workDate: "2026-02-30" }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  const accWhole = await createActivityService(projectId, { ...activityInput, facilityId: acc.id, manpower: 10 }, { userId: null, isAdmin: true });
  const accWork = await createActivityService(
    projectId,
    { ...activityInput, facilityId: acc.id, facilityPartId: accPart.id, manpower: 8, status: "blocked" },
    { userId: null, isAdmin: true },
  );
  await createActivityService(
    projectId,
    { ...activityInput, facilityId: tr.id, manpower: 5, status: "completed" },
    { userId: null, isAdmin: true },
  );
  await createActivityService(
    projectId,
    { ...activityInput, facilityId: tr.id, facilityPartId: trPart.id, manpower: 2, status: "attention" },
    { userId: null, isAdmin: true },
  );
  assert.equal(accWhole.facilityPart, null);
  const trWork = await listActivitiesService(projectId, {
    workDate: activityInput.workDate,
    facilityId: tr.id,
    pageSize: 1,
  });
  assert.equal(trWork.total, 2);
  assert.equal(trWork.rows.length, 1);
  assert.equal(trWork.rows[0]!.zone, null);
  assert.equal(trWork.rows[0]!.facility!.id, tr.id);
  const summaries = await listFacilitySummariesService(projectId, { workDate: activityInput.workDate });
  assert.deepEqual(
    summaries.find((row) => row.facilityId === acc.id),
    { facilityId: acc.id, activityCount: 2, contractorCount: 1, manpowerCount: 18, highestPriorityStatus: "blocked" },
  );
  assert.deepEqual(
    summaries.find((row) => row.facilityId === tr.id),
    { facilityId: tr.id, activityCount: 2, contractorCount: 1, manpowerCount: 7, highestPriorityStatus: "attention" },
  );
  const filtered = await listFacilitySummariesService(projectId, {
    workDate: activityInput.workDate,
    status: "attention",
  });
  assert.deepEqual(
    filtered.map((row) => [row.facilityId, row.activityCount, row.manpowerCount, row.highestPriorityStatus]),
    [[tr.id, 1, 2, "attention"]],
  );
  await fails(
    () => createActivityService(projectId, { ...activityInput, facilityId: acc.id, facilityPartId: trPart.id }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  await fails(
    () => createActivityService(projectId, { ...activityInput, facilityId: other.id }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  await fails(
    () => createActivityService(otherProjectId, { ...activityInput, facilityId: other.id }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  await fails(
    () => createActivityService(projectId, { ...activityInput, facilityId: tr.id, zoneId: crypto.randomUUID() }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  await fails(
    () => listActivitiesService(projectId, { facilityId: acc.id, facilityPartId: trPart.id }),
    "VALIDATION_ERROR",
  );
  assert.equal((await listActivitiesService(projectId, { facilityPartId: accPart.id })).total, 1);
  const moved = await updateActivityService(accWork.id, { facilityId: tr.id }, { userId: null, isAdmin: true });
  assert.equal(moved.facility!.id, tr.id);
  assert.equal(moved.facilityPart, null);
  assert.equal((await getActivityService(accWork.id)).id, accWork.id);
  await archiveFacilityPartService(trPart.id);
  await fails(
    () => createActivityService(projectId, { ...activityInput, facilityId: tr.id, facilityPartId: trPart.id }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  await createActivityService(projectId, { ...activityInput, facilityId: tr.id }, { userId: null, isAdmin: true });

  const master = await createSiteMapService(projectId, { name: "Master" });
  const expansion = await createSiteMapService(projectId, { name: "Expansion" });
  const otherMap = await createSiteMapService(otherProjectId, { name: "Other Map" });
  assert.equal(master.isDefault, true);
  assert.equal(expansion.isDefault, false);
  await updateSiteMapService(expansion.id, { isDefault: true });
  assert.deepEqual(
    (await listSiteMapsService(projectId)).filter((row) => row.isDefault).map((row) => row.id),
    [expansion.id],
  );
  assert.equal((await listSiteMapsService(otherProjectId))[0]!.isDefault, true);

  const overview = await createMapViewService(master.id, { name: "Overview" });
  const top = await createMapViewService(master.id, { name: "Top View" });
  const drone = await createMapViewService(master.id, { name: "Drone" });
  const secondOverview = await createMapViewService(expansion.id, { name: "Overview" });
  const otherView = await createMapViewService(otherMap.id, { name: "Overview" });
  assert.equal(overview.key, "overview");
  assert.equal(drone.key, "drone");
  assert.equal(overview.imageUrl, null);
  await fails(() => createMapViewService(master.id, { name: "Overview" }), "23505");
  assert.notEqual(secondOverview.id, overview.id);
  assert.notEqual(otherView.id, overview.id);

  const first = await saveFacilityMarkersService(overview.id, [{ facilityId: acc.id, x: 0.2, y: 0.3 }]);
  await saveFacilityMarkersService(top.id, [{ facilityId: acc.id, x: 0.4, y: 0.5 }]);
  const updated = await saveFacilityMarkersService(overview.id, [
    { facilityId: acc.id, x: 0.25, y: 0.35 },
    { facilityId: tr.id, x: 0.5, y: 0.6 },
  ]);
  assert.equal(updated.find((row) => row.facilityId === acc.id)!.id, first[0]!.id);
  await saveFacilityMarkersService(secondOverview.id, [{ facilityId: acc.id, x: 0.8, y: 0.3 }]);
  assert.equal((await listFacilitiesService(projectId)).filter((row) => row.id === acc.id).length, 1);
  await fails(
    () =>
      saveFacilityMarkersService(overview.id, [
        { facilityId: acc.id, x: 0.99, y: 0.99 },
        { facilityId: other.id, x: 0.1, y: 0.1 },
      ]),
    "VALIDATION_ERROR",
  );
  assert.equal((await listFacilityMarkersService(overview.id)).find((row) => row.facilityId === acc.id)!.x, 0.25);
  await fails(
    () => saveFacilityMarkersService(overview.id, [{ facilityId: acc.id, x: 1.2, y: 0.2 }]),
    "VALIDATION_ERROR",
  );
  await fails(
    () => saveFacilityMarkersService(overview.id, [{ facilityId: acc.id, x: null, y: 0.2 }]),
    "VALIDATION_ERROR",
  );
  await fails(
    () =>
      saveFacilityMarkersService(overview.id, [
        { facilityId: acc.id, x: 0.1, y: 0.2 },
        { facilityId: acc.id, x: 0.3, y: 0.4 },
      ]),
    "VALIDATION_ERROR",
  );
  await saveFacilityMarkersService(overview.id, [{ facilityId: acc.id, x: null, y: null }]);
  assert.equal(
    (await listFacilityMarkersService(overview.id)).some((row) => row.facilityId === acc.id),
    false,
  );
  assert.equal((await getFacilityService(acc.id)).isActive, true);
  assert.equal((await listFacilityMarkersService(top.id))[0]!.facilityId, acc.id);
  await updateMapViewService(drone.id, { isActive: false });
  assert.equal((await listMapViewsService(master.id)).length, 2);
  assert.equal((await listMapViewsService(master.id, "all")).length, 3);
  await archiveFacilityService(tr.id);
  await fails(
    () => createActivityService(projectId, { ...activityInput, facilityId: tr.id }, { userId: null, isAdmin: true }),
    "VALIDATION_ERROR",
  );
  assert.equal((await getActivityService(accWork.id)).facility!.id, tr.id);
  assert.equal((await listFacilityMarkersService(overview.id)).length, 0);
  assert.equal((await listFacilityMarkersService(overview.id, true)).length, 1);
  assert.equal((await getFacilityService(tr.id)).isActive, false);
  await updateSiteMapService(expansion.id, { isActive: false });
  assert.deepEqual(
    (await listSiteMapsService(projectId)).map((row) => row.id),
    [master.id],
  );
  console.log("Facility/Map/View/Marker service persistence and isolation verified");
  const emptyMap = await createSiteMapService(projectId, { name: "Empty native Map" });
  assert.equal((await listMapViewsService(emptyMap.id)).length, 0);
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
