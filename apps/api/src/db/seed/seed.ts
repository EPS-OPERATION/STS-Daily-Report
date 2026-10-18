import { eq, inArray, sql } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { BUILDINGS, RETIRED_BUILDING_CODES, type BuildingCode, DEFAULT_SITE_LOCATION } from "@sts/shared";
import { getDb } from "@/db/client.js";
import { coordinationMaps } from "@/db/schema/coordination.schema.js";
import {
  buildingMarkers,
  buildings,
  contractors,
  droneLogs,
  projectContractors,
  projects,
  sitePlans,
  zoneMapAreas,
  zones,
} from "@/db/schema/index.js";
import { getStorage } from "@/shared/storage/index.js";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

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
    // Site location for recorded hourly weather (Thi Wang, Thung Song).
    latitude: DEFAULT_SITE_LOCATION.latitude,
    longitude: DEFAULT_SITE_LOCATION.longitude,
  })
  .onConflictDoUpdate({
    target: projects.id,
    set: {
      name: "STS Biomass Power Plant",
      description: "Seed project for the site-plan vertical slice.",
      latitude: DEFAULT_SITE_LOCATION.latitude,
      longitude: DEFAULT_SITE_LOCATION.longitude,
    },
  });

// No user accounts are seeded (dev or production). Create the first EPS
// administrator explicitly with:
//   EPS_BOOTSTRAP_EMAIL=you@company.com EPS_BOOTSTRAP_PASSWORD=... bun apps/api/scripts/bootstrap-admin.ts
// Contractors self-register and are approved/linked from /admin/users.


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

// (Sample daily reports, QAQC inspection requests and safety findings were
// removed on 2026-10-11 so the seeded database is deploy-ready. Restore from
// git history if demo data is needed.)

// Dedicated coordination image; does not change WBS or facility marker backgrounds.
await db.insert(coordinationMaps).values({ projectId: PROJECT_ID, imagePath: "/site-plan/STS_KY_Layout_Plan.png", width: 6542, height: 4951 }).onConflictDoNothing();

// --- Demo drone photo logs (dev seed only) ---
// Real site photos committed at apps/web/public/drone; the seed uploads their
// bytes to object storage and points drone_logs at them, so /progress shows a
// baseline + comparison round out of the box. Re-runs skip existing keys;
// storage failures warn instead of failing the whole seed.
const DEMO_DRONE_FLIGHTS = [
  {
    file: "flight-2026-09-05.jpg",
    logDate: "2026-09-05",
    title: "บินสำรวจรอบกันยายน — ภาพรวมไซต์งาน",
    description: "ภาพถ่ายทางอากาศรอบที่ 1: โซน Boiler, TG, ACC และงานโยธา",
    capturedBy: "EPS Drone Team",
    tags: ["overview"],
  },
  {
    file: "flight-2026-10-01.jpg",
    logDate: "2026-10-01",
    title: "บินสำรวจรอบตุลาคม — เปรียบเทียบความก้าวหน้า",
    description: "ภาพถ่ายทางอากาศรอบที่ 2 สำหรับเลื่อนเปรียบเทียบกับรอบกันยายน",
    capturedBy: "EPS Drone Team",
    tags: ["overview", "comparison"],
  },
];

const existingDroneKeys = new Set(
  (await db.select({ objectKey: droneLogs.objectKey }).from(droneLogs).where(eq(droneLogs.projectId, PROJECT_ID))).map(
    (r) => r.objectKey,
  ),
);
let demoDrone = 0;
try {
  const storage = getStorage();
  for (const f of DEMO_DRONE_FLIGHTS) {
    const objectKey = `demo/drone/${f.file}`;
    if (existingDroneKeys.has(objectKey)) continue;
    const bytes = await readFile(new URL(`../../../../web/public/drone/${f.file}`, import.meta.url));
    await storage.upload({ key: objectKey, body: new Uint8Array(bytes), contentType: "image/jpeg" });
    await db
      .insert(droneLogs)
      .values({
        projectId: PROJECT_ID,
        logDate: f.logDate,
        title: f.title,
        description: f.description,
        capturedBy: f.capturedBy,
        tags: f.tags,
        objectKey,
        fileName: f.file,
        contentType: "image/jpeg",
        sizeBytes: bytes.length,
        createdBy: null,
      })
      .onConflictDoNothing({ target: droneLogs.objectKey });
    demoDrone++;
  }
} catch (err) {
  console.warn("seed: skipping demo drone logs (storage unavailable):", err instanceof Error ? err.message : err);
}

console.log(
  `seed ok: 1 project, ${SITE_CONTRACTORS.length} site contractors, 21 zones, 1 site plan, 16 areas, ${BUILDINGS.length} buildings + markers, ${demoDrone} demo drone logs — no users (bootstrap the first admin with scripts/bootstrap-admin.ts), no sample reports`,
);
process.exit(0);
