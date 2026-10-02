import { boolean, check, date, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buildings } from "./building.schema.js";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";
import { users } from "./user.schema.js";

// One row = one contractor's report for one calendar day (morning check-in +
// evening check-out). report_date is a DATE (never UTC-shifted). Headcount is
// split by nationality/gender; total = sum of the four and must equal the sum of
// building allocations when the morning shift is submitted.
export const dailyReports = pgTable(
  "daily_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    reportDate: date("report_date").notNull(),
    // General info (morning). work_hours = normal hours per person, excl. OT.
    startTime: text("start_time"),
    endTime: text("end_time"),
    workHours: numeric("work_hours", { precision: 4, scale: 1, mode: "number" }),
    disciplines: text("disciplines").array().notNull().default(sql`'{}'::text[]`),
    weather: text("weather"),
    temperatureC: numeric("temperature_c", { precision: 4, scale: 1, mode: "number" }),
    humidityPct: integer("humidity_pct"),
    thaiMale: integer("thai_male").notNull().default(0),
    thaiFemale: integer("thai_female").notNull().default(0),
    foreignMale: integer("foreign_male").notNull().default(0),
    foreignFemale: integer("foreign_female").notNull().default(0),
    morningStatus: text("morning_status").notNull().default("draft"),
    morningSubmittedAt: timestamp("morning_submitted_at", { withTimezone: true }),
    morningSubmittedBy: uuid("morning_submitted_by").references(() => users.id, { onDelete: "set null" }),
    otHours: numeric("ot_hours", { precision: 4, scale: 1, mode: "number" }),
    accidentOccurred: boolean("accident_occurred"),
    accidentNote: text("accident_note"),
    // One of ACCIDENT_CATEGORIES (lti / non_lti / property_damage / near_miss / emergency).
    accidentCategory: text("accident_category"),
    eveningStatus: text("evening_status").notNull().default("draft"),
    eveningSubmittedAt: timestamp("evening_submitted_at", { withTimezone: true }),
    eveningSubmittedBy: uuid("evening_submitted_by").references(() => users.id, { onDelete: "set null" }),
    signatureName: text("signature_name"),
    // PNG data URL from the tap-to-sign pad (small; bytes of real photos go to MinIO).
    signatureData: text("signature_data"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    // EPS review (owner-side QAQC). Contractors submit shifts; only EPS staff
    // move review_status via the review endpoint (role guard in service).
    reviewStatus: text("review_status").notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("daily_reports_project_contractor_date_unique").on(t.projectId, t.contractorId, t.reportDate),
    check(
      "daily_reports_headcount_check",
      sql`${t.thaiMale} >= 0 AND ${t.thaiFemale} >= 0 AND ${t.foreignMale} >= 0 AND ${t.foreignFemale} >= 0`,
    ),
    check("daily_reports_ot_check", sql`${t.otHours} IS NULL OR (${t.otHours} >= 0 AND ${t.otHours} <= 24)`),
    check("daily_reports_work_hours_check", sql`${t.workHours} IS NULL OR (${t.workHours} >= 0 AND ${t.workHours} <= 24)`),
    check("daily_reports_humidity_check", sql`${t.humidityPct} IS NULL OR (${t.humidityPct} BETWEEN 0 AND 100)`),
    check(
      "daily_reports_weather_check",
      sql`${t.weather} IS NULL OR ${t.weather} IN ('thunderstorm', 'rain', 'hot', 'windy', 'normal')`,
    ),
    check(
      "daily_reports_accident_category_check",
      sql`${t.accidentCategory} IS NULL OR ${t.accidentCategory} IN ('lti', 'non_lti', 'property_damage', 'near_miss', 'emergency')`,
    ),
    check("daily_reports_morning_status_check", sql`${t.morningStatus} IN ('draft', 'submitted')`),
    check("daily_reports_evening_status_check", sql`${t.eveningStatus} IN ('draft', 'submitted')`),
    check("daily_reports_review_status_check", sql`${t.reviewStatus} IN ('pending', 'approved', 'rejected')`),
    index("daily_reports_project_date_idx").on(t.projectId, t.reportDate),
  ],
);

// Manpower by position — the primary headcount. Sum must equal the nationality split.
export const dailyReportPositions = pgTable(
  "daily_report_positions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    position: text("position").notNull(),
    headcount: integer("headcount").notNull(),
  },
  (t) => [
    unique("daily_report_positions_report_position_unique").on(t.reportId, t.position),
    check("daily_report_positions_headcount_check", sql`${t.headcount} > 0`),
  ],
);

// Machines / tools on site today with quantity (not time-booked).
export const dailyReportEquipment = pgTable(
  "daily_report_equipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    equipmentType: text("equipment_type").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [
    unique("daily_report_equipment_report_type_unique").on(t.reportId, t.equipmentType),
    check("daily_report_equipment_qty_check", sql`${t.qty} > 0`),
  ],
);

// Materials on site today (evening check-out) with quantity + unit.
// Free-text names — contractors type what was delivered/used.
export const dailyReportMaterials = pgTable(
  "daily_report_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    materialName: text("material_name").notNull(),
    qty: numeric("qty").notNull(),
    unit: text("unit").notNull().default("pcs"),
  },
  (t) => [
    unique("daily_report_materials_report_name_unit_unique").on(t.reportId, t.materialName, t.unit),
    check("daily_report_materials_qty_check", sql`${t.qty} > 0`),
    index("daily_report_materials_report_idx").on(t.reportId),
  ],
);

// Morning: people placed in a building + planned %. Evening: actual % (+ countermeasure when behind).
export const dailyReportAllocations = pgTable(
  "daily_report_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "restrict" }),
    headcount: integer("headcount").notNull(),
    workDescription: text("work_description").notNull(),
    planPercent: integer("plan_percent").notNull().default(0),
    actualPercent: integer("actual_percent"),
    countermeasure: text("countermeasure"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("daily_report_allocations_headcount_check", sql`${t.headcount} > 0`),
    check("daily_report_allocations_plan_check", sql`${t.planPercent} BETWEEN 0 AND 100`),
    check(
      "daily_report_allocations_actual_check",
      sql`${t.actualPercent} IS NULL OR ${t.actualPercent} BETWEEN 0 AND 100`,
    ),
    index("daily_report_allocations_report_idx").on(t.reportId),
    index("daily_report_allocations_building_idx").on(t.buildingId),
  ],
);

// Day-ahead requests (machinery, permits, road usage) are raised in the EVENING report
// of day T for target_date T+1 (reviewed at the 17:00 coordination meeting). They hang
// off the report that raised them; everything that asks "what happens on day D" keys
// on target_date. unit_tag identifies a physical unit (e.g. "CR-01"); overlapping
// bookings of the same type+unit on the same target date are conflicts.
export const dailyReportMachinery = pgTable(
  "daily_report_machinery",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    targetDate: date("target_date").notNull(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "restrict" }),
    machineType: text("machine_type").notNull(),
    unitTag: text("unit_tag"),
    // Time window is optional: no window = needed all day (conflict checks treat it so).
    startTime: text("start_time"),
    endTime: text("end_time"),
    purpose: text("purpose"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "daily_report_machinery_window_check",
      sql`(${t.startTime} IS NULL AND ${t.endTime} IS NULL) OR (${t.startTime} IS NOT NULL AND ${t.endTime} IS NOT NULL AND ${t.startTime} < ${t.endTime})`,
    ),
    index("daily_report_machinery_report_idx").on(t.reportId),
    index("daily_report_machinery_target_idx").on(t.targetDate),
  ],
);

export const dailyReportPermits = pgTable(
  "daily_report_permits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    targetDate: date("target_date").notNull(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "restrict" }),
    permitType: text("permit_type").notNull(),
    otherLabel: text("other_label"),
    workers: integer("workers").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("daily_report_permits_workers_check", sql`${t.workers} > 0`),
    check(
      "daily_report_permits_type_check",
      sql`${t.permitType} IN ('hot_work', 'height', 'lifting', 'loto', 'confined_space', 'live_electrical', 'other')`,
    ),
    index("daily_report_permits_report_idx").on(t.reportId),
    index("daily_report_permits_target_idx").on(t.targetDate),
  ],
);

// Equipment / tools requested for tomorrow — a quantity, no time window
// (machinery that must be scheduled goes in daily_report_machinery instead).
export const dailyReportEquipmentRequests = pgTable(
  "daily_report_equipment_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    targetDate: date("target_date").notNull(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "restrict" }),
    equipmentType: text("equipment_type").notNull(),
    qty: integer("qty").notNull(),
    purpose: text("purpose"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("daily_report_equipment_requests_qty_check", sql`${t.qty} > 0`),
    index("daily_report_equipment_requests_report_idx").on(t.reportId),
    index("daily_report_equipment_requests_target_idx").on(t.targetDate),
  ],
);

// Road usage / closure for tomorrow (crane outriggers, mixer staging, deliveries).
export const dailyReportRoadUsage = pgTable(
  "daily_report_road_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    targetDate: date("target_date").notNull(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "restrict" }),
    roadLocation: text("road_location").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    purpose: text("purpose").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("daily_report_road_usage_window_check", sql`${t.startTime} < ${t.endTime}`),
    index("daily_report_road_usage_report_idx").on(t.reportId),
    index("daily_report_road_usage_target_idx").on(t.targetDate),
  ],
);

// Evening photos: bytes in MinIO, metadata here. Category separates progress vs safety.
export const dailyReportPhotos = pgTable(
  "daily_report_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => dailyReports.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    objectKey: text("object_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("daily_report_photos_category_check", sql`${t.category} IN ('progress', 'safety')`),
    index("daily_report_photos_report_idx").on(t.reportId),
  ],
);

// Daily Request: contractor asks EPS QAQC to inspect work. Lives beyond the report
// (EPS moves it through the kanban), so it is keyed by contractor + report_date, not
// by report row — re-submitting the morning shift never wipes a confirmed request.
export const inspectionRequests = pgTable(
  "inspection_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => buildings.id, { onDelete: "restrict" }),
    reportDate: date("report_date").notNull(),
    inspectionDate: date("inspection_date").notNull(),
    inspectionTime: text("inspection_time").notNull(),
    inspectionType: text("inspection_type").notNull(),
    workItem: text("work_item").notNull(),
    location: text("location"),
    drawingRef: text("drawing_ref"),
    readiness: text("readiness").notNull().default("ready"),
    status: text("status").notNull().default("draft"),
    result: text("result"),
    epsNote: text("eps_note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    statusChangedBy: uuid("status_changed_by").references(() => users.id, { onDelete: "set null" }),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "inspection_requests_status_check",
      sql`${t.status} IN ('draft', 'requested', 'confirmed', 'inspected', 'closed')`,
    ),
    check("inspection_requests_readiness_check", sql`${t.readiness} IN ('ready', 'preparing', 'not_ready')`),
    check("inspection_requests_result_check", sql`${t.result} IS NULL OR ${t.result} IN ('pass', 'fail')`),
    check("inspection_requests_date_check", sql`${t.inspectionDate} >= ${t.reportDate}`),
    index("inspection_requests_project_date_idx").on(t.projectId, t.inspectionDate),
    index("inspection_requests_contractor_idx").on(t.contractorId, t.reportDate),
  ],
);

export type DailyReport = typeof dailyReports.$inferSelect;
export type InspectionRequest = typeof inspectionRequests.$inferSelect;
export type DailyReportAllocation = typeof dailyReportAllocations.$inferSelect;
export type DailyReportMachinery = typeof dailyReportMachinery.$inferSelect;
export type DailyReportPermit = typeof dailyReportPermits.$inferSelect;
export type DailyReportRoadUsage = typeof dailyReportRoadUsage.$inferSelect;
export type DailyReportPhoto = typeof dailyReportPhotos.$inferSelect;
