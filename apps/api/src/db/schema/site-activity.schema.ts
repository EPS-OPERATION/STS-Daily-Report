import { check, date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contractors } from "./contractor.schema.js";
import { projects } from "./project.schema.js";
import { users } from "./user.schema.js";
import { zones } from "./zone.schema.js";
import { zoneParts } from "./zone-part.schema.js";
import { facilities } from "./facility.schema.js";

// One row = one contractor's work in one zone on one calendar day.
// work_date is a DATE (calendar day, never UTC-shifted). start/end times are
// HH:MM strings (time-only concept). Cascades: deleting project/zone/
// contractor/user removes its activities rather than orphaning them.
export const siteActivities = pgTable(
  "site_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    zoneId: uuid("zone_id").references(() => zones.id, { onDelete: "cascade" }),
    zonePartId: uuid("zone_part_id").references(() => zoneParts.id, { onDelete: "set null" }),
    facilityId: uuid("facility_id").references(() => facilities.id, { onDelete: "restrict" }),
    facilityPartId: uuid("facility_part_id").references(() => zoneParts.id, { onDelete: "set null" }),
    contractorId: uuid("contractor_id")
      .notNull()
      .references(() => contractors.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    manpower: integer("manpower").notNull().default(0),
    progressPercent: integer("progress_percent").notNull().default(0),
    startTime: text("start_time"),
    endTime: text("end_time"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("site_activities_location_check", sql`${t.facilityId} IS NOT NULL OR ${t.zoneId} IS NOT NULL`),
    index("site_activities_facility_date_idx").on(t.facilityId, t.workDate),
    index("site_activities_facility_part_idx").on(t.facilityPartId),
    check("site_activities_manpower_check", sql`${t.manpower} >= 0`),
    check("site_activities_progress_check", sql`${t.progressPercent} >= 0 AND ${t.progressPercent} <= 100`),
    index("site_activities_project_date_idx").on(t.projectId, t.workDate),
    index("site_activities_zone_idx").on(t.zoneId),
    index("site_activities_zone_part_idx").on(t.zonePartId),
    index("site_activities_contractor_idx").on(t.contractorId),
  ],
);

export type SiteActivity = typeof siteActivities.$inferSelect;
export type NewSiteActivity = typeof siteActivities.$inferInsert;
