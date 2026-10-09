import { and, eq, inArray, sql } from "drizzle-orm";
import {
  BUILDINGS,
  RETIRED_BUILDING_CODES,
  type BuildingCode,
  type InspectionType,
  type MachineType,
  type PermitType,
  type PositionCode,
  type RequestStatus,
  type SiteEquipmentType,
} from "@sts/shared";
import { getDb } from "@/db/client.js";
import {
  buildingMarkers,
  buildings,
  contractorMemberships,
  dailyReportAllocations,
  dailyReportCrews,
  dailyReportEquipment,
  dailyReportMachinery,
  dailyReportMaterials,
  dailyReportPermits,
  dailyReportPositions,
  dailyReportRoadUsage,
  dailyReports,
  inspectionRequests,
  safetyFindings,
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

// Development EPS (owner-side QAQC) login — moves Daily Requests on the QAQC board.
await db
  .insert(users)
  .values({
    id: "99999999-9999-4999-8999-999999999999",
    email: "eps@sts.local",
    displayName: "EPS QAQC",
    status: "active",
    role: "eps",
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

const SAMPLE_CONTRACTORS = SITE_CONTRACTORS.filter((c) => ["ZCE", "LCE", "UME"].includes(c.code));

// One login per sample contractor: contractor01→ZCE, 02→LCE, 03→UME (email only, no password).
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
// (the field report page has a contractor picker). Email only, like the others.
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

type SamplePlan = {
  contractorId: string;
  split: [number, number, number, number];
  positions: Partial<Record<PositionCode, number>>;
  equipment: Partial<Record<SiteEquipmentType, number>>;
  alloc: Array<{ b: BuildingCode; n: number; work: string; plan: number }>;
  permits: Array<{ b: BuildingCode; type: PermitType; workers: number }>;
  machines: Array<{ b: BuildingCode; type: MachineType; tag?: string; from: string; to: string; purpose: string }>;
  materials: Array<{ name: string; qty: number; unit: string }>;
};
const SAMPLE_PLANS: SamplePlan[] = [
  {
    contractorId: SAMPLE_CONTRACTORS[0]!.id,
    split: [6, 2, 20, 4],
    positions: { site_manager: 1, engineer: 2, foreman: 2, safety_officer: 1, welder: 6, fire_watch: 1, worker: 19 },
    equipment: { "Welding Machine": 4, "Hand Tool Equipment": 6, "Mobile Crane": 1, "Boom Lift": 1 },
    alloc: [
      { b: "BLR", n: 20, work: "Boiler structure erection", plan: 60 },
      { b: "TG", n: 12, work: "TG plate installation", plan: 70 },
    ],
    permits: [
      { b: "BLR", type: "hot_work", workers: 6 },
      { b: "BLR", type: "height", workers: 8 },
    ],
    machines: [
      { b: "BLR", type: "Mobile Crane 50T", tag: "CR-01", from: "08:00", to: "12:00", purpose: "Lift boiler steel line A–D" },
      { b: "BLR", type: "Boom Lift", from: "13:00", to: "17:00", purpose: "Weld platform L3" },
    ],
    materials: [
      { name: "เหล็กเส้น", qty: 2.5, unit: "ton" },
      { name: "ลวดผูกเหล็ก", qty: 30, unit: "kg" },
    ],
  },
  {
    contractorId: SAMPLE_CONTRACTORS[1]!.id,
    split: [10, 2, 18, 4],
    positions: { engineer: 1, foreman: 2, safety_officer: 1, crane_operator: 1, worker: 29 },
    equipment: { "Hand Tool Equipment": 5, "Mobile Crane": 1, Backhoe: 1, "Concrete Pump": 1 },
    alloc: [
      { b: "ACC", n: 18, work: "ACC concrete chipping", plan: 60 },
      { b: "CT", n: 6, work: "Cooling tower wall formwork", plan: 40 },
      { b: "BLR", n: 10, work: "Boiler cable tray", plan: 50 },
    ],
    permits: [{ b: "ACC", type: "lifting", workers: 4 }],
    machines: [{ b: "ACC", type: "Mobile Crane 50T", tag: "CR-01", from: "10:00", to: "15:00", purpose: "Set ACC fan deck panels" }],
    materials: [
      { name: "ปูนซีเมนต์", qty: 120, unit: "bag" },
      { name: "ทรายหยาบ", qty: 8, unit: "m³" },
    ],
  },
  {
    contractorId: SAMPLE_CONTRACTORS[2]!.id,
    split: [12, 3, 8, 0],
    positions: { engineer: 1, foreman: 1, safety_officer: 1, welder: 5, worker: 15 },
    equipment: { "Welding Machine": 3, "Boom Lift": 1 },
    alloc: [
      { b: "BLR", n: 15, work: "Boiler piping", plan: 45 },
      { b: "STK", n: 8, work: "Stack platform welding", plan: 55 },
    ],
    permits: [{ b: "STK", type: "height", workers: 8 }],
    machines: [{ b: "STK", type: "Boom Lift", from: "08:00", to: "17:00", purpose: "Stack platform welding" }],
    materials: [{ name: "คอนกรีตผสมเสร็จ", qty: 15, unit: "m³" }],
  },
];

const todayDate = new Date(`${today}T00:00:00Z`);
const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
// Current week up to today, plus 8 earlier weeks (Mon–Sat) so the manpower trend has history.
const SAMPLE_HISTORY_WEEKS = 8;
const weekDays: string[] = [];
for (let back = -(SAMPLE_HISTORY_WEEKS * 7 + mondayOffset); back <= 0; back++) {
  const d = new Date(todayDate);
  d.setUTCDate(d.getUTCDate() + back);
  if (back < -mondayOffset && d.getUTCDay() === 0) continue; // no Sunday work in past weeks
  weekDays.push(d.toISOString().slice(0, 10));
}
// Deterministic day-to-day swing in workers (-6..+6) — same every seed run.
const swing = (date: string, salt: number) => {
  let h = salt;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return (h % 13) - 6;
};

let sampleReports = 0;
for (const date of weekDays) {
  for (const plan of SAMPLE_PLANS) {
    // Apply the swing to workers only, keeping positions = nationality split = allocation.
    const delta = Math.max(-(plan.positions.worker ?? 0) + 1, swing(date, SAMPLE_PLANS.indexOf(plan) + 7));
    const [baseThaiMale, thaiFemale, foreignMale, foreignFemale] = plan.split;
    const thaiMale = Math.max(0, baseThaiMale + delta);
    const workerDelta = thaiMale - baseThaiMale;
    const inserted = await db
      .insert(dailyReports)
      .values({
        projectId: PROJECT_ID,
        contractorId: plan.contractorId,
        reportDate: date,
        thaiMale,
        thaiFemale,
        foreignMale,
        foreignFemale,
        startTime: "08:00",
        endTime: "17:00",
        workHours: 8,
        weather: "hot",
        temperatureC: 33,
        humidityPct: 75,
        morningStatus: "submitted",
        morningSubmittedAt: new Date(`${date}T01:00:00Z`),
      })
      .onConflictDoNothing()
      .returning({ id: dailyReports.id });
    const reportId = inserted[0]?.id;
    if (!reportId) continue; // already seeded — keep idempotent
    sampleReports++;
    await db.insert(dailyReportCrews).values({
      reportId,
      shift: "morning",
      discipline: "CE",
      thaiMale,
      thaiFemale,
      foreignMale,
      foreignFemale,
    });
    await db
      .insert(dailyReportPositions)
      .values(
        Object.entries(plan.positions).map(([position, headcount]) => ({
          reportId,
          position,
          headcount: headcount! + (position === "worker" ? workerDelta : 0),
        })),
      );
    await db
      .insert(dailyReportEquipment)
      .values(Object.entries(plan.equipment).map(([equipmentType, qty]) => ({ reportId, equipmentType, qty: qty! })));
    await db.insert(dailyReportMaterials).values(
      plan.materials.map((m) => ({ reportId, materialName: m.name, qty: String(m.qty), unit: m.unit })),
    );
    await db.insert(dailyReportAllocations).values(
      plan.alloc.map((a, i) => ({
        reportId,
        buildingId: bid(a.b),
        headcount: a.n + (i === 0 ? workerDelta : 0),
        workDescription: a.work,
        planPercent: a.plan,
        sortOrder: i,
      })),
    );
    await db
      .insert(dailyReportPermits)
      .values(
        plan.permits.map((p) => ({ reportId, targetDate: date, buildingId: bid(p.b), permitType: p.type, workers: p.workers })),
      );
    await db.insert(dailyReportMachinery).values(
      plan.machines.map((m) => ({
        reportId,
        // Samples model same-day bookings; real ones are raised the evening before (target = date + 1).
        targetDate: date,
        buildingId: bid(m.b),
        machineType: m.type,
        unitTag: m.tag ?? null,
        startTime: m.from,
        endTime: m.to,
        purpose: m.purpose,
      })),
    );
    // Two contractors want the same lane at overlapping times → road conflict in the sample data.
    if (plan.contractorId !== SAMPLE_CONTRACTORS[2]!.id) {
      const zce = plan.contractorId === SAMPLE_CONTRACTORS[0]!.id;
      await db.insert(dailyReportRoadUsage).values({
        reportId,
        targetDate: date,
        buildingId: bid(zce ? "BLR" : "ACC"),
        roadLocation: "Road R2 (Boiler–ACC)",
        startTime: zce ? "08:00" : "10:00",
        endTime: zce ? "11:00" : "13:00",
        purpose: zce ? "Crane outrigger setup" : "Concrete mixer staging",
      });
    }
  }
}

// Backfill materials for reports seeded before the materials table existed (idempotent).
{
  const existing = await db
    .select({ id: dailyReports.id, contractorId: dailyReports.contractorId })
    .from(dailyReports)
    .where(eq(dailyReports.projectId, PROJECT_ID));
  const withMaterials = new Set(
    (await db.select({ reportId: dailyReportMaterials.reportId }).from(dailyReportMaterials)).map((r) => r.reportId),
  );
  for (const r of existing) {
    if (withMaterials.has(r.id)) continue;
    const plan = SAMPLE_PLANS.find((p) => p.contractorId === r.contractorId);
    if (!plan) continue;
    await db
      .insert(dailyReportMaterials)
      .values(plan.materials.map((m) => ({ reportId: r.id, materialName: m.name, qty: String(m.qty), unit: m.unit })))
      .onConflictDoNothing();
  }
}

// --- Sample Daily Requests (QAQC inspection) across the kanban, idempotent by fixed id ---
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const SAMPLE_REQUESTS: Array<{
  id: string;
  c: number;
  b: BuildingCode;
  day: number;
  time: string;
  type: InspectionType;
  item: string;
  status: RequestStatus;
  readiness: "ready" | "preparing" | "not_ready";
  result?: "pass" | "fail";
  loc?: string;
  dwg?: string;
}> = [
  { id: "e1000000-0000-4000-8000-000000000001", c: 0, b: "BLR", day: 0, time: "09:00", type: "rebar", item: "Rebar B1 L2", status: "confirmed", readiness: "ready", loc: "Grid B1–B3", dwg: "STSBPP-C-BLR-201" },
  { id: "e1000000-0000-4000-8000-000000000002", c: 1, b: "ACC", day: 0, time: "10:30", type: "formwork", item: "Formwork ACC wall W3", status: "requested", readiness: "preparing", loc: "Wall W3 EL.+3.50", dwg: "STSBPP-C-ACC-114" },
  { id: "e1000000-0000-4000-8000-000000000003", c: 2, b: "STK", day: 1, time: "13:00", type: "concrete", item: "Concrete Stack base L3", status: "requested", readiness: "not_ready", loc: "Base slab L3", dwg: "STSBPP-C-STK-102" },
  { id: "e1000000-0000-4000-8000-000000000004", c: 0, b: "TG", day: -1, time: "14:00", type: "welding", item: "TG platform weld joints", status: "inspected", readiness: "ready", result: "fail", loc: "Platform EL.+8.00", dwg: "STSBPP-S-TG-305" },
  { id: "e1000000-0000-4000-8000-000000000005", c: 1, b: "CT", day: -2, time: "09:30", type: "survey", item: "Cooling tower setting-out", status: "closed", readiness: "ready", result: "pass", loc: "Foundation F1–F4" },
  // today
  { id: "e1000000-0000-4000-8000-000000000006", c: 2, b: "TG", day: 0, time: "08:30", type: "bolt_torque", item: "Anchor bolt torque TG pedestal", status: "confirmed", readiness: "ready", loc: "Pedestal P2", dwg: "STSBPP-S-TG-210" },
  { id: "e1000000-0000-4000-8000-000000000007", c: 0, b: "FGT", day: 0, time: "13:30", type: "steel_erection", item: "FGT support steel column C4–C6", status: "requested", readiness: "ready", loc: "Axis 4–6", dwg: "STSBPP-S-FGT-120" },
  { id: "e1000000-0000-4000-8000-000000000008", c: 1, b: "WTP", day: 0, time: "15:00", type: "piping", item: "Hydrotest raw water line 150A", status: "requested", readiness: "preparing", loc: "Pipe rack PR-2", dwg: "STSBPP-P-WTP-402" },
  // tomorrow
  { id: "e1000000-0000-4000-8000-000000000009", c: 0, b: "BLR", day: 1, time: "08:00", type: "concrete", item: "Concrete pour boiler pedestal B2", status: "requested", readiness: "ready", loc: "Pedestal B2", dwg: "STSBPP-C-BLR-205" },
  { id: "e1000000-0000-4000-8000-000000000010", c: 1, b: "ACC", day: 1, time: "09:30", type: "rebar", item: "Rebar ACC column C7–C9", status: "requested", readiness: "preparing", loc: "Column C7–C9", dwg: "STSBPP-C-ACC-121" },
  { id: "e1000000-0000-4000-8000-000000000011", c: 2, b: "CMP", day: 1, time: "10:30", type: "electrical", item: "Cable tray & cable pulling MCC-1", status: "requested", readiness: "ready", loc: "Compressor room", dwg: "STSBPP-E-CMP-501" },
  // history
  { id: "e1000000-0000-4000-8000-000000000012", c: 0, b: "BLR", day: -3, time: "10:00", type: "welding", item: "Boiler header butt welds", status: "closed", readiness: "ready", result: "pass", loc: "Header H1", dwg: "STSBPP-M-BLR-330" },
  { id: "e1000000-0000-4000-8000-000000000013", c: 2, b: "STK", day: -4, time: "14:30", type: "formwork", item: "Stack ring beam formwork", status: "closed", readiness: "ready", result: "pass", loc: "Ring beam EL.+6.00" },
  { id: "e1000000-0000-4000-8000-000000000014", c: 1, b: "ACC", day: -5, time: "09:00", type: "concrete", item: "ACC footing F12 pour", status: "inspected", readiness: "ready", result: "pass", loc: "Footing F12", dwg: "STSBPP-C-ACC-108" },
  { id: "e1000000-0000-4000-8000-000000000015", c: 0, b: "TG", day: -6, time: "11:00", type: "painting", item: "TG steel primer DFT check", status: "closed", readiness: "ready", result: "fail", loc: "Beams B10–B14", dwg: "STSBPP-S-TG-312" },
  { id: "e1000000-0000-4000-8000-000000000016", c: 2, b: "BMT", day: -7, time: "13:00", type: "survey", item: "Conveyor gallery setting-out", status: "closed", readiness: "ready", result: "pass", loc: "Trestle T1–T5" },
  { id: "e1000000-0000-4000-8000-000000000017", c: 0, b: "FAS", day: -9, time: "09:30", type: "rebar", item: "Fly ash silo wall rebar lift 2", status: "closed", readiness: "ready", result: "pass", loc: "Wall lift 2", dwg: "STSBPP-C-FAS-140" },
  { id: "e1000000-0000-4000-8000-000000000018", c: 1, b: "RWP", day: -11, time: "10:00", type: "piping", item: "Raw water pump suction line", status: "closed", readiness: "ready", result: "pass", loc: "Pump pit", dwg: "STSBPP-P-RWP-401" },
  { id: "e1000000-0000-4000-8000-000000000019", c: 2, b: "DOT", day: -13, time: "14:00", type: "bolt_torque", item: "Diesel tank anchor bolts", status: "closed", readiness: "ready", result: "pass", loc: "Tank T-01" },
  { id: "e1000000-0000-4000-8000-000000000020", c: 0, b: "BAB", day: -14, time: "08:30", type: "formwork", item: "Bottom ash bunker wall formwork", status: "closed", readiness: "ready", result: "pass", loc: "Wall W1–W2", dwg: "STSBPP-C-BAB-130" },
];
// Dates are relative to the seed day; re-seeding rolls the samples forward so
// today/tomorrow always have requests to show.
for (const r of SAMPLE_REQUESTS) {
  const inspectionDate = addDays(today, r.day);
  const row = {
    contractorId: SAMPLE_CONTRACTORS[r.c]!.id,
    buildingId: bid(r.b),
    reportDate: r.day > 0 ? addDays(today, r.day - 1) : inspectionDate,
    inspectionDate,
    inspectionTime: r.time,
    inspectionType: r.type,
    workItem: r.item,
    location: r.loc ?? null,
    drawingRef: r.dwg ?? null,
    readiness: r.readiness,
    status: r.status,
    result: r.result ?? null,
  };
  await db
    .insert(inspectionRequests)
    .values({ id: r.id, projectId: PROJECT_ID, ...row })
    .onConflictDoUpdate({ target: inspectionRequests.id, set: row });
}

// --- Sample safety line walk + contractor-reported accidents (dev only, idempotent) ---
const ZCE = SAMPLE_CONTRACTORS[0]!.id;
const LCE = SAMPLE_CONTRACTORS[1]!.id;
const UME = SAMPLE_CONTRACTORS[2]!.id;
const OPEN_HOLE = { obs: "พบช่องเปิดและหลุมลึกไม่ปิดล้อมพื้นที่", act: "ปิดล้อมพื้นที่ด้วย Pipe นั่งร้าน และติดป้ายเตือนอันตราย" };
const CABLE = { obs: "สายไฟวางพาดผ่านถนน โดยไม่ป้องกันหากรถเหยียบ", act: "ครอบด้วยเหล็กชั่วคราวเพื่อป้องกันรถเหยียบสายไฟชำรุด" };
const NO_HARNESS = { obs: "คนงานทำงานบนที่สูงไม่คล้องเข็มขัดนิรภัย", act: "หยุดงาน อบรม และตรวจเข็มขัดก่อนขึ้นทำงาน" };
const FINDINGS: Array<{ day: number; c: string; b: BuildingCode; t: "unsafe_act" | "unsafe_condition"; f: { obs: string; act: string }; open?: boolean }> = [
  { day: -2, c: ZCE, b: "TG", t: "unsafe_condition", f: OPEN_HOLE },
  { day: -2, c: ZCE, b: "TG", t: "unsafe_condition", f: OPEN_HOLE },
  { day: -2, c: ZCE, b: "TG", t: "unsafe_condition", f: OPEN_HOLE },
  { day: -2, c: ZCE, b: "TG", t: "unsafe_condition", f: OPEN_HOLE },
  { day: 0, c: ZCE, b: "TG", t: "unsafe_act", f: CABLE, open: true },
  { day: -9, c: LCE, b: "ACC", t: "unsafe_act", f: NO_HARNESS },
  { day: -16, c: UME, b: "STK", t: "unsafe_condition", f: OPEN_HOLE },
  { day: -23, c: LCE, b: "CT", t: "unsafe_condition", f: CABLE },
  { day: -30, c: ZCE, b: "BLR", t: "unsafe_act", f: NO_HARNESS },
  { day: -38, c: UME, b: "BLR", t: "unsafe_condition", f: OPEN_HOLE },
  { day: -45, c: LCE, b: "ACC", t: "unsafe_condition", f: OPEN_HOLE },
  { day: -52, c: ZCE, b: "TG", t: "unsafe_act", f: CABLE },
];
await db
  .insert(safetyFindings)
  .values(
    FINDINGS.map((x, i) => {
      const d = addDays(today, x.day);
      return {
        projectId: PROJECT_ID,
        itemNo: i + 1,
        observation: x.f.obs,
        buildingId: bid(x.b),
        actionToBeTaken: x.f.act,
        contractorId: x.c,
        inspectionDate: d,
        expectedCompleteDate: d,
        status: x.open ? "open" : "done",
        closedAt: x.open ? null : new Date(`${d}T10:00:00Z`),
        findingType: x.t,
      };
    }),
  )
  .onConflictDoNothing();

// A few categorised accidents on existing sample reports (property damage + near misses).
for (const [day, contractorId, category, note] of [
  [-50, LCE, "property_damage", "รถเครนชนรั้วชั่วคราวเสียหาย"],
  [-39, ZCE, "near_miss", "วัสดุตกจากที่สูง ไม่มีผู้บาดเจ็บ"],
  [-25, UME, "near_miss", "รถขุดถอยเกือบชนคนงาน"],
  [-11, ZCE, "near_miss", "สลิงยกของเสียดสีขาด ของไม่ตก"],
] as const) {
  await db
    .update(dailyReports)
    .set({ accidentOccurred: true, accidentCategory: category, accidentNote: note })
    .where(and(eq(dailyReports.contractorId, contractorId), eq(dailyReports.reportDate, addDays(today, day))));
}

console.log(
  `seed ok: 1 project, 6 contractors, 1 user, 1 membership, 21 zones, 1 plan, 16 areas, 4 activities, ${BUILDINGS.length} buildings, ${sampleReports} new sample daily reports`,
);
process.exit(0);
