import { getDb } from "@/db/client.js";
import {
  contractorMemberships,
  contractors,
  projectContractors,
  projects,
  siteActivities,
  sitePlans,
  users,
  zoneMapAreas,
  zones,
} from "@/db/schema/index.js";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const CONTRACTOR_A = "22222222-2222-4222-8222-222222222222";
const CONTRACTOR_B = "33333333-3333-4333-8333-333333333333";
const CONTRACTOR_C = "55555555-5555-4555-8555-555555555555";
const USER_CONTRACTOR = "44444444-4444-4444-8444-444444444444";

const ZONE_1 = "a1111111-1111-4111-8111-111111111111";
const ZONE_2 = "a2222222-2222-4222-8222-222222222222";
const ZONE_3 = "a3333333-3333-4333-8333-333333333333";
const ZONE_4 = "a4444444-4444-4444-8444-444444444444";
const ZONE_5 = "a5555555-5555-4555-8555-555555555555";
const ZONE_6 = "a6666666-6666-4666-8666-666666666666";
const SITE_PLAN = "b1111111-1111-4111-8111-111111111111";

// Child zones per the master WBS (areas are mapped on top-level zones only for V1).
const ZONE_CHILDREN: Array<{ id: string; parent: string; code: string; name: string; sort: number }> = [
  { id: "d1100001-1111-4111-8111-111111111111", parent: ZONE_1, code: "1.1", name: "Biomass Storage", sort: 11 },
  { id: "d1200001-1111-4111-8111-111111111111", parent: ZONE_1, code: "1.2", name: "Biomass Transport", sort: 12 },
  { id: "d2100001-2222-4222-8222-222222222222", parent: ZONE_2, code: "2.1", name: "Furnace & Boiler", sort: 21 },
  { id: "d2200001-2222-4222-8222-222222222222", parent: ZONE_2, code: "2.2", name: "Diesel Oil Tank", sort: 23 },
  { id: "d2300001-2222-4222-8222-222222222222", parent: ZONE_2, code: "2.3", name: "Bottom Ash Bunker", sort: 24 },
  { id: "d2400001-2222-4222-8222-222222222222", parent: ZONE_2, code: "2.4", name: "Fly Ash Silo", sort: 25 },
  { id: "d3100001-3333-4333-8333-333333333333", parent: ZONE_3, code: "3.1", name: "Flue Gas Treatment", sort: 31 },
  { id: "d3200001-3333-4333-8333-333333333333", parent: ZONE_3, code: "3.2", name: "Stack", sort: 32 },
  { id: "d4100001-4444-4444-8444-444444444444", parent: ZONE_4, code: "4.1", name: "Turbine Generator Building", sort: 41 },
  { id: "d5100001-5555-4555-8555-555555555555", parent: ZONE_5, code: "5.1", name: "Air Cooled Condenser", sort: 51 },
  { id: "d6100001-6666-4666-8666-666666666666", parent: ZONE_6, code: "6.1", name: "Raw Water Pond & Pump", sort: 61 },
  { id: "d6200001-6666-4666-8666-666666666666", parent: ZONE_6, code: "6.2", name: "Service Water Tank & Pump House", sort: 62 },
  { id: "d6300001-6666-4666-8666-666666666666", parent: ZONE_6, code: "6.3", name: "Water Treatment Plant & Chemical Storage", sort: 63 },
  { id: "d6400001-6666-4666-8666-666666666666", parent: ZONE_6, code: "6.4", name: "Auxiliary Cooling Tower", sort: 64 },
  { id: "d6500001-6666-4666-8666-666666666666", parent: ZONE_6, code: "6.5", name: "Compressor Room", sort: 65 },
];

const db = getDb();

await db
  .insert(projects)
  .values({
    id: PROJECT_ID,
    code: "STS-001",
    name: "STS Biomass Power Plant",
    description: "Seed project for the site-plan vertical slice.",
    status: "active",
  })
  .onConflictDoUpdate({
    target: projects.id,
    set: { name: "STS Biomass Power Plant", description: "Seed project for the site-plan vertical slice." },
  });

await db
  .insert(contractors)
  .values([
    { id: CONTRACTOR_A, code: "CTR-001", name: "Example Contractor A" },
    { id: CONTRACTOR_B, code: "CTR-002", name: "Example Contractor B" },
    { id: CONTRACTOR_C, code: "CTR-003", name: "XYZ Engineering" },
  ])
  .onConflictDoNothing({ target: contractors.id });

await db
  .insert(projectContractors)
  .values([
    { projectId: PROJECT_ID, contractorId: CONTRACTOR_A },
    { projectId: PROJECT_ID, contractorId: CONTRACTOR_B },
    { projectId: PROJECT_ID, contractorId: CONTRACTOR_C },
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

// --- Site-plan vertical slice ---
await db
  .insert(zones)
  .values([
    { id: ZONE_1, projectId: PROJECT_ID, code: "1", name: "Biomass Area", sortOrder: 10 },
    { id: ZONE_2, projectId: PROJECT_ID, code: "2", name: "Furnace & Boiler Area", sortOrder: 20 },
    { id: ZONE_3, projectId: PROJECT_ID, code: "3", name: "Flue Gas Area", sortOrder: 30 },
    { id: ZONE_4, projectId: PROJECT_ID, code: "4", name: "Turbine Generator", sortOrder: 40 },
    { id: ZONE_5, projectId: PROJECT_ID, code: "5", name: "Air Cooled Condenser", sortOrder: 50 },
    { id: ZONE_6, projectId: PROJECT_ID, code: "6", name: "Utilities / Water", sortOrder: 60 },
    ...ZONE_CHILDREN.map((z) => ({
      id: z.id,
      projectId: PROJECT_ID,
      parentId: z.parent,
      code: z.code,
      name: z.name,
      sortOrder: z.sort,
    })),
  ])
  .onConflictDoNothing({ target: zones.id });

await db
  .insert(sitePlans)
  .values({ id: SITE_PLAN, projectId: PROJECT_ID, name: "Master Layout", isDefault: true })
  .onConflictDoNothing({ target: sitePlans.id });

// Hand-mapped operational regions traced from the monochrome master
// layout (1586x992). Normalized 0..1 boxes per physical facility — never
// synthetic subdivision. Zones without a known location stay UNMAPPED
// (2.2, 2.3, 2.4, 5.1, 6.4) rather than getting invented geometry.
const box = (x0: number, y0: number, x1: number, y1: number) => ({
  type: "polygon" as const,
  points: [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ],
});

const areaRows = (sitePlanId: string) =>
  [
    { zone: ZONE_1, g: box(0.184, 0.312, 0.435, 0.629) },
    { zone: ZONE_2, g: box(0.455, 0.23, 0.56, 0.64) },
    { zone: ZONE_3, g: box(0.455, 0.16, 0.56, 0.28) },
    { zone: ZONE_4, g: box(0.58, 0.172, 0.68, 0.536) },
    { zone: ZONE_5, g: box(0.604, 0.187, 0.674, 0.288) },
    { zone: ZONE_6, g: box(0.6, 0.2, 0.82, 0.98) },
    { zone: "d1100001-1111-4111-8111-111111111111", g: box(0.184, 0.312, 0.435, 0.5) },
    { zone: "d1200001-1111-4111-8111-111111111111", g: box(0.203, 0.583, 0.549, 0.613) },
    { zone: "d2100001-2222-4222-8222-222222222222", g: box(0.46, 0.28, 0.557, 0.6) },
    { zone: "d3100001-3333-4333-8333-333333333333", g: box(0.46, 0.16, 0.56, 0.24) },
    { zone: "d3200001-3333-4333-8333-333333333333", g: box(0.51, 0.24, 0.54, 0.28) },
    { zone: "d4100001-4444-4444-8444-444444444444", g: box(0.58, 0.298, 0.679, 0.528) },
    { zone: "d6100001-6666-4666-8666-666666666666", g: box(0.602, 0.573, 0.816, 0.98) },
    { zone: "d6200001-6666-4666-8666-666666666666", g: box(0.688, 0.3, 0.807, 0.38) },
    { zone: "d6300001-6666-4666-8666-666666666666", g: box(0.688, 0.38, 0.807, 0.46) },
    { zone: "d6500001-6666-4666-8666-666666666666", g: box(0.688, 0.46, 0.807, 0.536) },
  ].map((c) => ({ sitePlanId, zoneId: c.zone, geometry: c.g, defaultGeometry: c.g }));

await db
  .insert(zoneMapAreas)
  .values(areaRows(SITE_PLAN))
  .onConflictDoNothing();

// Overlapping work: zone 2 hosts three contractors on the same day.
const today = (() => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
})();

await db
  .insert(siteActivities)
  .values([
    {
      id: "c1111111-1111-4111-8111-111111111111",
      projectId: PROJECT_ID,
      zoneId: ZONE_2,
      contractorId: CONTRACTOR_A,
      workDate: today,
      title: "Boiler Structure Installation",
      status: "active",
      manpower: 18,
      progressPercent: 65,
      startTime: "08:00",
      endTime: "17:00",
      createdBy: USER_CONTRACTOR,
    },
    {
      id: "c2222222-2222-4222-8222-222222222222",
      projectId: PROJECT_ID,
      zoneId: ZONE_2,
      contractorId: CONTRACTOR_B,
      workDate: today,
      title: "Electrical Cable Tray",
      status: "attention",
      manpower: 8,
      progressPercent: 40,
      startTime: "10:30",
      endTime: "16:00",
      createdBy: USER_CONTRACTOR,
    },
    {
      id: "c3333333-3333-4333-8333-333333333333",
      projectId: PROJECT_ID,
      zoneId: ZONE_2,
      contractorId: CONTRACTOR_C,
      workDate: today,
      title: "Piping Installation",
      status: "active",
      manpower: 12,
      progressPercent: 52,
      createdBy: USER_CONTRACTOR,
    },
    {
      id: "c4444444-4444-4444-8444-444444444444",
      projectId: PROJECT_ID,
      zoneId: ZONE_4,
      contractorId: CONTRACTOR_B,
      workDate: today,
      title: "Stack Concrete Pour",
      status: "blocked",
      manpower: 24,
      progressPercent: 35,
      startTime: "08:00",
      endTime: "18:00",
      createdBy: USER_CONTRACTOR,
    },
  ])
  .onConflictDoNothing({ target: siteActivities.id });

console.log("seed ok: 1 project, 3 contractors, 3 links, 1 user, 1 membership, 21 zones, 1 plan, 16 areas, 4 activities");
process.exit(0);
