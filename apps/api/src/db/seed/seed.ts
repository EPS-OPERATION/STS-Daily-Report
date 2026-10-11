import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { BUILDINGS, RETIRED_BUILDING_CODES, type BuildingCode } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { getEnv } from "@/config/env.js";
import { DEMO_ACCOUNTS } from "@/auth/demo-accounts.js";
import { hashPassword } from "@/auth/password.js";
import {
  buildingMarkers,
  buildings,
  contractorMemberships,
  contractors,
  projectContractors,
  projects,
  sitePlans,
  users,
  zoneMapAreas,
  zones,
} from "@/db/schema/index.js";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
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

// Demo identities exist only in development or on hosted demos (ALLOW_DEMO_LOGIN).
// Real deploys insert only the bootstrap EPS administrator below.
const env = getEnv();
const seedDemoUsers = env.NODE_ENV === "development" || env.ALLOW_DEMO_LOGIN;

if (seedDemoUsers) {
  // Development login only (no password until the development seed fills one in).
  await db
    .insert(users)
    .values({
      id: USER_CONTRACTOR,
      email: "contractor@sts.local",
      displayName: "Contractor User",
      status: "active",
    })
    .onConflictDoNothing({ target: users.id });

  // EPS operations staff (limited) — dev/demo login for testing the pending-only scope.
  await db
    .insert(users)
    .values({
      id: "99999999-9999-4999-8999-999999999998",
      email: "eps-site@sts.local",
      displayName: "EPS Site Staff",
      status: "active",
      role: "eps_site",
    })
    .onConflictDoNothing({ target: users.id });
}

// Bootstrap EPS administrator — needed on every deploy; scripts/bootstrap-eps-password.ts sets its password.
await db
  .insert(users)
  .values({
    id: "99999999-9999-4999-8999-999999999999",
    email: "eps@sts.local",
    displayName: "EPS QAQC",
    status: "active",
    role: "eps_admin",
  })
  .onConflictDoNothing({ target: users.id });


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

// --- Buildings (15 facilities in site order; allocation uses these, not WBS) ---
await db
  .insert(buildings)
  .values(
    BUILDINGS.map((b, i) => ({
      projectId: PROJECT_ID,
      code: b.code,
      name: b.name,
      nameTh: b.nameTh,
      sortOrder: (i + 1) * 10,
      status: "active",
    })),
  )
  // Re-running the seed re-applies names and order (the list changed in Oct 2026).
  .onConflictDoUpdate({
    target: [buildings.projectId, buildings.code],
    set: { name: sql`excluded.name`, nameTh: sql`excluded.name_th`, sortOrder: sql`excluded.sort_order`, status: "active" },
  });
// Retired facilities stay in the table (old reports reference them) but leave every picker.
await db
  .update(buildings)
  .set({ status: "inactive" })
  .where(inArray(buildings.code, [...RETIRED_BUILDING_CODES]));

const buildingIdByCode = new Map(
  (await db.select({ id: buildings.id, code: buildings.code }).from(buildings)).map((b) => [b.code, b.id]),
);
const bid = (code: BuildingCode) => buildingIdByCode.get(code)!;

// Starting marker positions (0..1 of each image). Admins move them on /site-plan/config;
// re-seeding never overwrites a placed marker. Positions = the leader-line dots baked
// into site-model-iso.png (overview) and site-model-topdown.png (top view); plan = BLD.CODE
// letters on site-plan-drawing.png (CAD G A0.02).
const MARKER_SEED: Record<BuildingCode, { overview: [number, number]; topview: [number, number]; plan: [number, number] }> = {
  RWP: { overview: [0.508, 0.212], topview: [0.169, 0.185], plan: [0.81, 0.89] },
  WTK: { overview: [0.373, 0.264], topview: [0.144, 0.331], plan: [0.866, 0.593] },
  WTP: { overview: [0.324, 0.3], topview: [0.133, 0.465], plan: [0.866, 0.482] },
  CT: { overview: [0.268, 0.388], topview: [0.161, 0.615], plan: [0.849, 0.369] },
  CMP: { overview: [0.194, 0.457], topview: [0.17, 0.712], plan: [0.85, 0.318] },
  ACC: { overview: [0.22, 0.6], topview: [0.26, 0.74], plan: [0.725, 0.274] },
  TG: { overview: [0.4, 0.5], topview: [0.3, 0.52], plan: [0.713, 0.489] },
  TR: { overview: [0.49, 0.36], topview: [0.317, 0.4], plan: [0.744, 0.545] },
  BLR: { overview: [0.756, 0.414], topview: [0.465, 0.179], plan: [0.601, 0.493] },
  BMT: { overview: [0.953, 0.54], topview: [0.617, 0.19], plan: [0.48, 0.718] },
  BAB: { overview: [0.814, 0.574], topview: [0.54, 0.283], plan: [0.528, 0.664] },
  FAS: { overview: [0.753, 0.655], topview: [0.532, 0.457], plan: [0.515, 0.62] },
  DOT: { overview: [0.635, 0.814], topview: [0.524, 0.576], plan: [0.528, 0.48] },
  FGT: { overview: [0.584, 0.805], topview: [0.466, 0.578], plan: [0.56, 0.38] },
  STK: { overview: [0.485, 0.822], topview: [0.446, 0.707], plan: [0.588, 0.326] },
};
await db
  .insert(buildingMarkers)
  .values(
    Object.entries(MARKER_SEED).flatMap(([code, m]) =>
      (["overview", "topview", "plan"] as const).map((view) => ({
        buildingId: bid(code as BuildingCode),
        view,
        x: m[view][0],
        y: m[view][1],
      })),
    ),
  )
  .onConflictDoNothing();

// --- All 23 contractors for STS project (per official Discipline list) ---
const SITE_CONTRACTORS = [
  { id: "c0010000-0000-4000-8000-000000000001", code: "BEE", name: "Blue White - Electrical" },
  { id: "c0010000-0000-4000-8000-000000000002", code: "EPS", name: "Eco Plant Services" },
  { id: "c0010000-0000-4000-8000-000000000003", code: "FCE", name: "Fast steel - Civil" },
  { id: "c0010000-0000-4000-8000-000000000004", code: "FEE", name: "Fast steel - Electrical" },
  { id: "c0010000-0000-4000-8000-000000000005", code: "KME", name: "Khwan Rungrueang - Mechanical" },
  { id: "77777777-7777-4777-8777-777777777777", code: "LCE", name: "L-tab - Civil" },
  { id: "c0010000-0000-4000-8000-000000000007", code: "PEE", name: "Pattara - Electrical" },
  { id: "c0010000-0000-4000-8000-000000000008", code: "QCI", name: "Unique Conveyor - Control&Instrument" },
  { id: "c0010000-0000-4000-8000-000000000009", code: "QEE", name: "Unique Conveyor - Electrical" },
  { id: "c0010000-0000-4000-8000-000000000010", code: "QME", name: "Unique Conveyor - Mechanical" },
  { id: "c0010000-0000-4000-8000-000000000011", code: "RME", name: "Ruangsan Engineer - Mechanical" },
  { id: "c0010000-0000-4000-8000-000000000012", code: "SCE", name: "Szone - Civil" },
  { id: "c0010000-0000-4000-8000-000000000013", code: "SCI", name: "Sinoma - Control&Instrument" },
  { id: "c0010000-0000-4000-8000-000000000014", code: "SCM", name: "Sinoma - Commissioning" },
  { id: "c0010000-0000-4000-8000-000000000015", code: "SEE", name: "Sinoma - Electrical" },
  { id: "c0010000-0000-4000-8000-000000000016", code: "SFP", name: "Sinoma - Fire Fighting & Protection" },
  { id: "c0010000-0000-4000-8000-000000000017", code: "SGE", name: "Sinoma - General" },
  { id: "c0010000-0000-4000-8000-000000000018", code: "SIN", name: "Sinoma - Thermal Insulation" },
  { id: "c0010000-0000-4000-8000-000000000019", code: "SME", name: "Sinoma - Mechanical" },
  { id: "c0010000-0000-4000-8000-000000000020", code: "SPI", name: "Sinoma - Piping" },
  { id: "88888888-8888-4888-8888-888888888888", code: "UME", name: "Utai Seya - Mechanical" },
  { id: "c0010000-0000-4000-8000-000000000022", code: "UPP", name: "Utai Seya - Piping" },
  { id: "66666666-6666-4666-8666-666666666666", code: "ZCE", name: "Zhongtian - Civil" },
];

for (const c of SITE_CONTRACTORS) {
  await db
    .insert(contractors)
    .values(c)
    .onConflictDoUpdate({
      target: contractors.id,
      set: { code: c.code, name: c.name },
    });
}
await db
  .insert(projectContractors)
  .values(SITE_CONTRACTORS.map((c) => ({ projectId: PROJECT_ID, contractorId: c.id })))
  .onConflictDoNothing();

if (seedDemoUsers) {
  const SAMPLE_CONTRACTORS = SITE_CONTRACTORS.filter((c) => ["ZCE", "LCE", "UME"].includes(c.code));

  // One login per sample contractor: contractor01→ZCE, 02→LCE, 03→UME.
  const SAMPLE_USERS = SAMPLE_CONTRACTORS.map((c, i) => ({
    id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${i + 1}`,
    email: `contractor0${i + 1}@sts.local`,
    displayName: `Contractor 0${i + 1} (${c.code})`,
    status: "active" as const,
    contractorId: c.id,
  }));
  await db
    .insert(users)
    .values(SAMPLE_USERS.map(({ contractorId: _, ...u }) => u))
    .onConflictDoNothing({ target: users.id });
  for (const u of SAMPLE_USERS) {
    await db.delete(contractorMemberships).where(eq(contractorMemberships.userId, u.id));
    await db
      .insert(contractorMemberships)
      .values({ userId: u.id, contractorId: u.contractorId, status: "active" as const });
  }

  // Shared trial login: one account that can report for every contractor on the project
  // (the field report page has a contractor picker).
  const TRIAL_USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-0000000000f1";
  await db
    .insert(users)
    .values({ id: TRIAL_USER_ID, email: "trial@sts.local", displayName: "Trial (all contractors)", status: "active" })
    .onConflictDoNothing({ target: users.id });

  for (const userId of [TRIAL_USER_ID, USER_CONTRACTOR]) {
    await db.delete(contractorMemberships).where(eq(contractorMemberships.userId, userId));
    await db
      .insert(contractorMemberships)
      .values(
        SITE_CONTRACTORS.map((c) => ({
          userId,
          contractorId: c.id,
          status: "active" as const,
        })),
      );
  }
}

// (Sample daily reports, QAQC inspection requests and safety findings were
// removed on 2026-10-11 so the seeded database is deploy-ready. Restore from
// git history if demo data is needed.)

// Local credentials only; running seed again never replaces a changed password.
if (getEnv().NODE_ENV === "development") {
  const passwordHash = await hashPassword("sts123456");
  for (const account of DEMO_ACCOUNTS) {
    await db.update(users).set({ passwordHash }).where(and(eq(users.id, account.id), isNull(users.passwordHash)));
    await db.update(users).set({ username: account.username }).where(and(eq(users.id, account.id), isNull(users.username)));
  }
}

console.log(
  `seed ok: 1 project, ${SITE_CONTRACTORS.length} site contractors, 21 zones, 1 site plan, 16 areas, ${BUILDINGS.length} buildings + markers — users: eps admin${seedDemoUsers ? " + dev demo logins (eps-site/contractor/trial/contractor01-03)" : ""}, no sample reports`,
);
process.exit(0);
