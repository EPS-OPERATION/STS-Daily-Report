import { check, date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { buildings } from "./building.schema.js";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";
import { users } from "./user.schema.js";

// EPS safety line walk: one row per finding ("Issue Safety Line Walk" form).
// item_no is a permanent running number per project (internal ID). week_no is the number shown on the
// weekly report: it restarts at 1 every ISO week (Mon–Sun) of inspection_date, is assigned when the finding
// is created and stays put (gaps after a delete are closed by the EPS «Renumber week» action).
// week_start is generated from inspection_date so it can never drift. Photos live in MinIO (keys only here).
export const safetyFindings = pgTable(
  "safety_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    itemNo: integer("item_no").notNull(),
    observation: text("observation").notNull(),
    buildingId: uuid("building_id").references(() => buildings.id, { onDelete: "set null" }),
    locationDetail: text("location_detail"),
    actionToBeTaken: text("action_to_be_taken").notNull(),
    contractorId: uuid("contractor_id").references(() => contractors.id, { onDelete: "set null" }),
    inspectionDate: date("inspection_date").notNull(),
    weekStart: date("week_start").generatedAlwaysAs(sql`inspection_date - (extract(isodow from inspection_date)::int - 1)`),
    weekNo: integer("week_no").notNull(),
    expectedCompleteDate: date("expected_complete_date"),
    status: text("status").notNull().default("open"),
    findingType: text("finding_type").notNull(),
    findingPhotoKey: text("finding_photo_key"),
    closePhotoKey: text("close_photo_key"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("safety_findings_project_item_unique").on(t.projectId, t.itemNo),
    unique("safety_findings_project_week_no_unique").on(t.projectId, t.weekStart, t.weekNo),
    check("safety_findings_week_no_check", sql`${t.weekNo} >= 1`),
    check("safety_findings_status_check", sql`${t.status} IN ('open', 'done')`),
    check("safety_findings_type_check", sql`${t.findingType} IN ('unsafe_act', 'unsafe_condition')`),
    index("safety_findings_project_date_idx").on(t.projectId, t.inspectionDate),
  ],
);

export type SafetyFinding = typeof safetyFindings.$inferSelect;

// EPS manual safety statistics. Contractors only report accidents through their evening report;
// when they do not report, EPS can fill the daily values used by the Safety statistic table and
// trend chart. One row per project per date; entered values are added to contractor report data.
export const safetyStatEntries = pgTable(
  "safety_stat_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    nearMiss: integer("near_miss").notNull().default(0),
    inspections: integer("inspections").notNull().default(0),
    lti: integer("lti").notNull().default(0),
    nonLti: integer("non_lti").notNull().default(0),
    propertyDamage: integer("property_damage").notNull().default(0),
    emergency: integer("emergency").notNull().default(0),
    manHours: numeric("man_hours", { precision: 10, scale: 1, mode: "number" }).notNull().default(0),
    // Hand-written safety clock (paper form's STATISTIC rows), as of entry_date. When set, the stats
    // continue counting from it (accumulate) / treat it as a floor for the project record — an empty
    // value falls back to the automatic computation from accident dates.
    daysWithoutAccident: integer("days_without_accident"),
    highestDaysWithoutAccident: integer("highest_days_without_accident"),
    note: text("note"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("safety_stat_entries_project_date_unique").on(t.projectId, t.entryDate),
    index("safety_stat_entries_project_date_idx").on(t.projectId, t.entryDate),
    check(
      "safety_stat_entries_counts_check",
      sql`${t.nearMiss} >= 0 AND ${t.inspections} >= 0 AND ${t.lti} >= 0 AND ${t.nonLti} >= 0 AND ${t.propertyDamage} >= 0 AND ${t.emergency} >= 0 AND ${t.manHours} >= 0`,
    ),
  ],
);

// Append-only edit history of EPS safety statistics (same rule as daily_report_versions): every
// confirmed save appends a row and a trigger rejects UPDATE. `confirmed_name` is typed by the person
// doing the save (accounts may be shared); user_id + ip + user_agent are the technical evidence.
//   action = create (first save of that date) | edit (any later save)
export const safetyStatVersions = pgTable(
  "safety_stat_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => safetyStatEntries.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    action: text("action").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    contentHash: text("content_hash").notNull(),
    confirmedName: text("confirmed_name"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("safety_stat_versions_entry_version_unique").on(t.entryId, t.version),
    index("safety_stat_versions_entry_idx").on(t.entryId),
    check("safety_stat_versions_action_check", sql`${t.action} IN ('create', 'edit')`),
  ],
);

export type SafetyStatVersion = typeof safetyStatVersions.$inferSelect;

// Year totals of the STATISTIC table ("Year 2026" column), written by EPS as on the paper form.
// One row per project × year × category; when a row exists the stats show this value instead of the
// computed year count (contractor reports + EPS daily entries). Untouched categories keep computing.
export const safetyStatYearOverrides = pgTable(
  "safety_stat_year_overrides",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    code: text("code").notNull(),
    value: integer("value").notNull(),
    confirmedName: text("confirmed_name"),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.year, t.code] }),
    check("safety_stat_year_overrides_code_check", sql`${t.code} IN ('lti', 'non_lti', 'property_damage', 'near_miss', 'emergency')`),
    check("safety_stat_year_overrides_value_check", sql`${t.value} >= 0`),
  ],
);

// The project's safety history from before the app was used (construction began earlier): one row per project,
// written by EPS. Man-hours worked before → added to "Total acc. (Start – date)"; the last Loss Time Injury before →
// "Last Accident LTI" shows the later of this and any LTI reported in the app; the project start date (optional,
// EPS may not know it) is where the safety clock and the "Start –" label begin.
export const safetyBaselines = pgTable("safety_baselines", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  manHoursBefore: numeric("man_hours_before", { precision: 14, scale: 1, mode: "number" }).notNull().default(0),
  lastLtiDate: date("last_lti_date"),
  projectStartDate: date("project_start_date"),
  confirmedName: text("confirmed_name"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("safety_baselines_man_hours_check", sql`${t.manHoursBefore} >= 0`)]);

// Append-only edit history of the baseline above (same rule as safety_stat_versions): every save keeps the whole
// record, the typed name of the person who confirmed it, the account, IP and browser.
export const safetyBaselineVersions = pgTable(
  "safety_baseline_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    contentHash: text("content_hash").notNull(),
    confirmedName: text("confirmed_name"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("safety_baseline_versions_project_version_unique").on(t.projectId, t.version)],
);

// Rain & Delay Log (EPS): when rain actually stopped work on site — the "actual" beside recorded weather.
export const rainLogs = pgTable(
  "rain_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    stoppageHours: numeric("stoppage_hours", { precision: 4, scale: 1, mode: "number" }).notNull(),
    // Optional detail (older form): light | moderate | heavy | storm, measured mm.
    intensity: text("intensity"),
    rainfallMm: numeric("rainfall_mm", { precision: 6, scale: 1, mode: "number" }),
    impactSummary: text("impact_summary").notNull().default(""),
    delayClaimNote: text("delay_claim_note"),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rain_logs_project_date_idx").on(t.projectId, t.logDate),
    check("rain_logs_time_check", sql`${t.startTime} < ${t.endTime}`),
    check("rain_logs_hours_check", sql`${t.stoppageHours} >= 0 AND ${t.stoppageHours} <= 24`),
    check("rain_logs_intensity_check", sql`${t.intensity} IS NULL OR ${t.intensity} IN ('light', 'moderate', 'heavy', 'storm')`),
  ],
);
